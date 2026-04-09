import os
import json
import re
import mimetypes
import uuid
from datetime import date, datetime
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple

from fastapi import FastAPI, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from supabase import create_client
from psycopg2.extensions import adapt


# Load environment variables (expects DATABASE_URL in .env located at project root)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
env_loaded = load_dotenv(dotenv_path=PROJECT_ROOT / ".env", override=True)
if not env_loaded:
    # Fallback to current directory if root .env not found
    load_dotenv(override=True)

DATABASE_URL = os.getenv("DATABASE_URL")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_BUCKET = os.getenv("SUPABASE_BUCKET", "messages")
SUPABASE_POSTS_BUCKET = os.getenv("SUPABASE_POSTS_BUCKET", "posts")

print(f"[startup] DATABASE_URL set: {bool(DATABASE_URL)}")
print(f"[startup] SUPABASE_URL: {SUPABASE_URL}")
print(f"[startup] SUPABASE_ANON_KEY present: {bool(SUPABASE_ANON_KEY)}")
print(f"[startup] SUPABASE_SERVICE_ROLE_KEY present: {bool(SUPABASE_SERVICE_ROLE_KEY)}")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is missing")

# Create engine + session factory
engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)
# Create engine with specific args to fix "duplicate SASL" and Pooler errors
# engine = create_engine(
#     DATABASE_URL,
#     pool_pre_ping=True,
#     future=True,
#     connect_args={
#         "prepare_threshold": None,  # Critical for Supabase Transaction Pooler
#         "sslmode": "require",       # Force SSL
#         "gssencmode": "disable"     # Critical fix for "duplicate SASL" on Mac
#     }
# )
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

supabase_client = None
if SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY):
    supabase_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY)

pwd_context = CryptContext(
    schemes=["bcrypt"],
    bcrypt__ident="2b",
    deprecated="auto"
)

MAX_MEDIA_BYTES = 25 * 1024 * 1024
IMAGE_MIME_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
}
GIF_MIME_TYPES = {"image/gif"}
FILE_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "text/plain",
}
ALLOWED_MEDIA_MIME_TYPES = IMAGE_MIME_TYPES | GIF_MIME_TYPES | FILE_MIME_TYPES
MEDIA_UPLOAD_ENABLED = False
POSTS_MEDIA_ENABLED = False

EMBED_MODEL = "text-embedding-3-large"
VECTOR_DIM = 3072

def embed_student_profile(row: dict) -> dict:
    """
    Helper to generate all 4 vectors for a student profile.
    """
    major_vec = embed_text(row.get("major", ""))
    
    # Handle skills being a list or a string
    skills_val = row.get("skills")
    if isinstance(skills_val, list):
        skills_str = ", ".join([str(s) for s in skills_val if s])
    else:
        skills_str = str(skills_val or "")
        
    skills_vec = embed_text(skills_str)
    school_vec = embed_text(row.get("school_name", ""))
    interests_vec = embed_text(row.get("Interests", ""))

    return {
        "major_vector": major_vec,
        "skills_vector": skills_vec,
        "school_vector": school_vec,
        "interests_vector": interests_vec,
    }

def _ensure_student_vectors(user_id: int, major, skills, school_name, interests, target_row):
    """
    Ensures major_vector, skills_vector, school_vector, interests_vector exist for the CURRENT user.
    If any is NULL → embed on the fly and update DB.
    """
    vectors = {
        "major_vector": target_row.get("major_vector"),
        "skills_vector": target_row.get("skills_vector"),
        "school_vector": target_row.get("school_vector"),
        "interests_vector": target_row.get("interests_vector"),
    }

    missing = [
        k for k, v in vectors.items()
        if v is None
    ]

    if not missing:
        return vectors

    # --- Generate fresh vectors ---
    fresh = embed_student_profile({
        "major": major,
        "skills": skills,
        "school_name": school_name,
        "Interests": interests,
    })

    # --- Update DB ---
    update_sql = text("""
        UPDATE "AISC_student_data"
        SET
            major_vector     = :major_vector,
            skills_vector    = :skills_vector,
            school_vector    = :school_vector,
            interests_vector = :interests_vector
        WHERE "UserID" = :user_id
    """)

    with engine.begin() as conn:
        conn.execute(update_sql, {
            "user_id": user_id,
            **fresh
        })

    return fresh

def _fetch_hybrid_matches(user_id: int, major_vec, skills_vec, school_vec, interests_vec, limit=10, offset=0):
    # ADDED offset parameter ^^^
    
    sql = text("""
        SELECT
            s."UserID" AS user_id,
            s."Name" AS name,
            s."major",
            s."year",
            s."skills",
            s."Interests" AS interests,
            s."City" AS city,
            s."Country" AS country,
            s."school_name",

            (
                COALESCE(s.major_vector     <-> (:major_vec)::vector,     1) * 0.25 +
                COALESCE(s.skills_vector    <-> (:skills_vec)::vector,    1) * 0.25 +
                COALESCE(s.school_vector    <-> (:school_vec)::vector,    1) * 0.20 +
                COALESCE(s.interests_vector <-> (:interests_vec)::vector, 1) * 0.30
            ) AS distance

        FROM "AISC_student_data" s
        WHERE s."UserID" <> :user_id
          AND s.major_vector IS NOT NULL
        ORDER BY distance ASC
        LIMIT :limit OFFSET :offset
    """)

    with engine.connect() as conn:
        rows = conn.execute(
            sql,
            {
                "user_id": user_id, 
                "limit": limit,
                "offset": offset, # Passed to SQL
                "major_vec": major_vec,
                "skills_vec": skills_vec,
                "school_vec": school_vec,
                "interests_vec": interests_vec
            }
        ).mappings().all()

    return list(rows)

def _fetch_interest_matches(user_id: int, target, limit: int = 10):
    """
    Simple fallback for /recommendations API.
    Uses ONLY interests_vector (not hybrid).
    """
    sql = text("""
        SELECT
            s."UserID" AS user_id,
            s."Name" AS name,
            s."major",
            s."year",
            s."skills",
            s."Interests" AS interests,
            s."City" AS city,
            s."Country" AS country,
            s."school_name",
            COALESCE(s.interests_vector <-> :query_vec, 5) AS distance
        FROM "AISC_student_data" s
        WHERE s."UserID" <> :user_id
        ORDER BY distance ASC
        LIMIT :limit
    """)

    query_vec = embed_text(target.get("interests") or "")

    with engine.connect() as conn:
        rows = conn.execute(sql, {
            "user_id": user_id,
            "query_vec": query_vec,
            "limit": limit,
        }).mappings().all()

    return list(rows)

def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def validate_password(pw: str):
    if len(pw) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")
    if len(pw) > 72:
        raise HTTPException(status_code=400, detail="Password cannot exceed 72 characters.")
    if " " in pw:
        raise HTTPException(status_code=400, detail="Password cannot contain spaces.")
    if not any(c.isdigit() for c in pw):
        raise HTTPException(status_code=400, detail="Password must include at least one number.")

client = OpenAI(api_key=OPENAI_API_KEY)

app = FastAPI()

# Allow the Vite dev server (and prod deployments) to call the API
default_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
if not default_origins or default_origins == ["*"]:
    default_origins = ["http://localhost:5173", "http://localhost:5174"]
else:
    if "http://localhost:5173" not in default_origins:
        default_origins.append("http://localhost:5173")
    if "http://localhost:5174" not in default_origins:
        default_origins.append("http://localhost:5174")

app.add_middleware(
    CORSMiddleware,
    allow_origins=default_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_db_check():
    global MEDIA_UPLOAD_ENABLED

    with engine.connect() as conn:
        conn.execute(text("select 1"))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS "AISC_messages" (
                "id" BIGSERIAL PRIMARY KEY,
                "sender_id" INTEGER NOT NULL REFERENCES "AISC_student_data"("UserID"),
                "receiver_id" INTEGER NOT NULL REFERENCES "AISC_student_data"("UserID"),
                "message_type" TEXT NOT NULL DEFAULT 'text',
                "body" TEXT,
                "media_url" TEXT,
                "media_name" TEXT,
                "media_size" INTEGER,
                "media_mime" TEXT,
                "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """))

    global MEDIA_UPLOAD_ENABLED, POSTS_MEDIA_ENABLED
    MEDIA_UPLOAD_ENABLED = False
    POSTS_MEDIA_ENABLED = False
    if supabase_client:
        try:
            bucket_list = supabase_client.storage.list_buckets()

            bucket_names = []
            for b in bucket_list:
                if isinstance(b, dict) and "name" in b:
                    bucket_names.append(b["name"])
                    continue
                if hasattr(b, "name"):
                    bucket_names.append(getattr(b, "name"))
                    continue

            print("[startup] Buckets detected:", bucket_names)

            if SUPABASE_BUCKET in bucket_names:
                MEDIA_UPLOAD_ENABLED = True
                print(f"[startup] Bucket '{SUPABASE_BUCKET}' found for messages.")
            else:
                print(f"[startup] Bucket '{SUPABASE_BUCKET}' does NOT exist. Create it in Supabase Dashboard.")

            if SUPABASE_POSTS_BUCKET in bucket_names:
                POSTS_MEDIA_ENABLED = True
                print(f"[startup] Bucket '{SUPABASE_POSTS_BUCKET}' found for posts.")
            else:
                print(f"[startup] Bucket '{SUPABASE_POSTS_BUCKET}' does NOT exist. Create it in Supabase Dashboard.")

        except Exception as exc:
            print(f"[startup] Could not verify bucket: {exc}")
    else:
        print("[startup] Supabase client not configured; media uploads disabled.")


@app.get("/")
def root():
    return {"message": "FastAPI + Supabase is up"}

@app.get("/config")
def get_config():
    return {
        "media_upload_enabled": bool(supabase_client) and MEDIA_UPLOAD_ENABLED,
        "posts_media_enabled": bool(supabase_client) and POSTS_MEDIA_ENABLED,
    }

@app.get("/embed_test")
def embed_test_endpoint(text: str):
    vector = embed_text(text)
    return {"length": len(vector), "preview": vector[:8]}

# API CALL
@app.get("/students")
def list_students(limit: int = 10):
    sql = text(
        'select "UserID"   as user_id,'
        '       "Name"     as name,'
        '       "Gender"   as gender,'
        '       "DOB"      as dob,'
        '       "Interests" as interests '
        'from "AISC_student_data" '
        'limit :limit'
    )
    with engine.connect() as conn:
        rows = conn.execute(sql, {"limit": limit}).mappings().all()
    return rows

@app.get("/students/search")
def search_students(query: str, limit: int = 25):
    cleaned = (query or "").strip()
    if not cleaned:
        return []
    limit = max(1, min(limit, 50))
    pattern = f"%{cleaned}%"
    sql = text(f"""
        SELECT {STUDENT_SELECT_FIELDS}
        FROM "AISC_student_data"
        WHERE
            "Name" ILIKE :pattern
            OR COALESCE("major", '') ILIKE :pattern
            OR COALESCE("Interests", '') ILIKE :pattern
            OR COALESCE(array_to_string("skills", ','), '') ILIKE :pattern
        LIMIT :limit
    """)
    with engine.connect() as conn:
        rows = conn.execute(sql, {"pattern": pattern, "limit": limit}).mappings().all()
    return rows

class StudentCreate(BaseModel):
    name: str
    gender: str
    dob: date
    interests: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    major: Optional[str] = None
    year: Optional[str] = None
    skills: Optional[List[str]] = None
    school_name: Optional[str] = None
    password: str

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[date] = None
    interests: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    major: Optional[str] = None
    year: Optional[str] = None
    skills: Optional[List[str]] = None
    school_name: Optional[str] = None
    password: Optional[str] = None

class LoginRequest(BaseModel):
    name: str
    password: str

class SuggestedStudent(BaseModel):
    user_id: int
    name: str
    major: Optional[str] = None
    year: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    reason: str
    match_score: Optional[float] = None
    school_name: Optional[str] = None
    skills: Optional[List[str]] = None
    interests: Optional[str] = None

class ChatQuery(BaseModel):
    user_id: int
    message: str
    include_recommendations: bool = False

class ChatReply(BaseModel):
    reply: str
    students: List[SuggestedStudent] = []

class MessageCreate(BaseModel):
    sender_id: int
    receiver_id: int
    body: str

class MediaMessage(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    message_type: str
    body: Optional[str] = None
    media_url: Optional[str] = None
    media_name: Optional[str] = None
    media_size: Optional[int] = None
    media_mime: Optional[str] = None
    created_at: datetime

class MessageThreadResponse(BaseModel):
    messages: List[MediaMessage]

class PostBase(BaseModel):
    body: Optional[str] = None

class PostResponse(PostBase):
    id: int
    author_id: int
    author_name: str
    author_school: Optional[str] = None
    media_url: Optional[str] = None
    media_name: Optional[str] = None
    media_size: Optional[int] = None
    media_mime: Optional[str] = None
    created_at: datetime
    like_count: int
    comment_count: int
    save_count: int
    liked_by_me: bool
    saved_by_me: bool

STUDENT_SELECT_FIELDS = '''
       "UserID" as user_id,
       "Name"   as name,
       "Gender" as gender,
       "DOB"    as dob,
       "Interests" as interests,
       "City"   as city,
       "Country" as country,
       "major"  as major,
       "year"   as year,
       "skills" as skills,
       "school_name" as school_name,
       "interests_vector" as interests_vector
'''

def _require_openai_key():
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")

def embed_text(text: Optional[str]) -> List[float]:
    _require_openai_key()
    clean = (text or "").strip()
    try:
        response = client.embeddings.create(
            model="text-embedding-3-large",
            input=clean,
        )
        return response.data[0].embedding
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Embedding failed: {exc}") from exc

def _coerce_skills(value) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(v) for v in value if v is not None]
    return [str(value)]

def _distance_to_match_score(distance: Optional[float]) -> float:
    if distance is None:
        return 0.0

    # distances in pgvector for 3072-dim embeddings usually fall between 0.7 and 1.8
    # we map:   0.7 -> 95%    1.2 -> 50%     1.8 -> 5%
    min_d = 0.7
    max_d = 1.8

    clipped = max(min(distance, max_d), min_d)
    score = 1 - ((clipped - min_d) / (max_d - min_d))
    return round(score * 100, 2)

def _normalize_interests(raw: Optional[str]) -> List[str]:
    if not raw:
        return []
    parts = re.split(r"[,\n;/]", raw)
    return [p.strip().lower() for p in parts if p.strip()]

def _friendly_label(values: List[str]) -> str:
    return ", ".join(v.title() for v in values)

def _normalize_text(value: Optional[str]) -> str:
    return (value or "").strip().lower()

def _normalize_skills(values) -> List[str]:
    return [_normalize_text(v) for v in _coerce_skills(values) if _normalize_text(v)]

def _fetch_all_peers(user_id: int) -> List[Dict[str, Any]]:
    peers_sql = text(f"""
        SELECT {STUDENT_SELECT_FIELDS}
        FROM "AISC_student_data"
        WHERE "UserID" <> :user_id
    """)
    with engine.connect() as conn:
        return conn.execute(peers_sql, {"user_id": user_id}).mappings().all()

def _student_summary(record: Dict[str, Any]) -> str:
    skills = ", ".join(_coerce_skills(record.get("skills")))
    details = [
        f"Name: {record.get('name')}",
        f"Major: {record.get('major') or 'Unknown'}",
        f"Year: {record.get('year') or 'Unknown'}",
        f"School: {record.get('school_name') or 'Unknown'}",
        f"City: {record.get('city') or 'Unknown'}",
        f"Country: {record.get('country') or 'Unknown'}",
        f"Interests: {record.get('interests') or 'None'}",
        f"Skills: {skills or 'None'}",
    ]
    return "; ".join(details)

def _fetch_student_matches(user_id: int, vectors: dict, limit: int = 10):
    sql = text("""
        SELECT
            s."UserID" AS user_id,
            s."Name" AS name,
            s."major" AS major,
            s."year" AS year,
            s."skills" AS skills,
            s."Interests" AS interests,
            s."City" AS city,
            s."Country" AS country,
            s."school_name" AS school_name,

            -- combine similarity from all vectors (lower = closer)
            (
                COALESCE(s.major_vector <-> :major_vec, 1) * 0.25 +
                COALESCE(s.skills_vector <-> :skills_vec, 1) * 0.25 +
                COALESCE(s.school_vector <-> :school_vec, 1) * 0.20 +
                COALESCE(s.interests_vector <-> :interests_vec, 1) * 0.30
            ) AS distance

        FROM "AISC_student_data" s
        WHERE s."UserID" <> :user_id
        ORDER BY distance ASC
        LIMIT :limit
    """)

    with engine.connect() as conn:
        rows = conn.execute(sql, {
            "user_id": user_id,
            "major_vec": vectors["major_vector"],
            "skills_vec": vectors["skills_vector"],
            "school_vec": vectors["school_vector"],
            "interests_vec": vectors["interests_vector"],
            "limit": limit,
        }).mappings().all()

    return list(rows)

def _fallback_text_matches(user_id: int, target, limit=20):
    pattern_major = f"%{(target.get('major') or '').split()[0]}%"
    pattern_interest = f"%{(target.get('interests') or '').split(',')[0]}%"
    pattern_skill = f"%{( (target.get('skills') or [''])[0] )}%"

    sql = text("""
        SELECT
            "UserID" AS user_id,
            "Name" AS name,
            "major",
            "year",
            "skills",
            "Interests",
            "City",
            "Country",
            "school_name"
        FROM "AISC_student_data"
        WHERE "UserID" <> :user_id
          AND (
                LOWER("major") ILIKE :pattern_major
             OR LOWER("Interests") ILIKE :pattern_interest
             OR array_to_string("skills", ',') ILIKE :pattern_skill
          )
        ORDER BY RANDOM()
        LIMIT :limit
    """)

    with engine.connect() as conn:
        rows = conn.execute(sql, {
            "user_id": user_id,
            "pattern_major": pattern_major,
            "pattern_interest": pattern_interest,
            "pattern_skill": pattern_skill,
            "limit": limit
        }).mappings().all()

    return list(rows)

def _message_requests_recommendations(message: str) -> bool:
    text = (message or "").lower()
    if not text:
        return False
    keywords = [
        "recommend",
        "someone",
        "who should i",
        "connect me",
        "looking for",
        "collaborator",
        "mentor",
        "peer",
        "suggest",
    ]
    return any(keyword in text for keyword in keywords)

def _build_chat_prompt(user_question: str, target: Dict[str, Any], candidates: List[Dict[str, Any]]) -> str:
    target_summary = _student_summary(target)
    candidate_lines = []
    for idx, cand in enumerate(candidates, start=1):
        score = cand.get("match_score")
        score_text = f" (match score≈{score}%)" if score is not None else ""
        reason = cand.get("match") or "Potential collaborator."
        candidate_lines.append(f"{idx}. {_student_summary(cand)}{score_text}\nReason: {reason}")
    candidate_section = "\n".join(candidate_lines) if candidate_lines else "No candidate data available."

    instructions = (
        "You are HuskyConnect, the assistant for UW students. Produce two parts:\n"
        "1) A concise natural-language reply (max six sentences) answering the user's question. Use prose only.\n"
        "2) Output the literal marker ---STUDENTS--- on its own line, followed by a valid JSON object with this shape:\n"
        '{ "students": [ { "candidate_index": <number>, "reason": "<why this student>" }, ... ] }\n'
        "Only reference candidates from the numbered list above. If the list is empty or the user did not request matches, "
        "return an empty array: {\"students\": []}. When matches are requested, include between three and six entries when possible, "
        "using short reasons tied to majors, years, schools, locations, interests, or skills."
    )

    prompt = (
        f"Target student profile:\n{target_summary}\n\n"
        f"Candidate students:\n{candidate_section}\n\n"
        f"User question:\n{user_question}\n\n"
        f"Output instructions:\n{instructions}"
    )
    return prompt

def build_match_message(target, peer) -> str:
    peer_name = peer.get("name") or "this student"
    subject = f"You and {peer_name}"
    clauses = []

    def _same_text(a, b):
        return _normalize_text(a) and _normalize_text(a) == _normalize_text(b)

    if _same_text(target.get("school_name"), peer.get("school_name")):
        clauses.append(f"both study at {peer.get('school_name')}")
    if _same_text(target.get("city"), peer.get("city")):
        clauses.append(f"are based in {peer.get('city')}")
    elif _same_text(target.get("country"), peer.get("country")):
        clauses.append(f"are both in {peer.get('country')}")
    if _same_text(target.get("major"), peer.get("major")):
        clauses.append(f"focus on {peer.get('major')}")
    if _same_text(target.get("year"), peer.get("year")):
        clauses.append(f"are {peer.get('year')}s")

    target_interests = set(_normalize_interests(target.get("interests")))
    peer_interests = set(_normalize_interests(peer.get("interests")))
    shared_interests = sorted(target_interests & peer_interests)
    if shared_interests:
        clauses.append(f"share interests in {_friendly_label(shared_interests)}")

    target_skills = set(_normalize_skills(target.get("skills")))
    peer_skills = set(_normalize_skills(peer.get("skills")))
    shared_skills = sorted(target_skills & peer_skills)
    if shared_skills:
        clauses.append(f"share skills in {_friendly_label(shared_skills)}")

    if not clauses:
        return f"{subject} could make a strong connection through HuskyConnect."

    if len(clauses) == 1:
        return f"{subject} {clauses[0]}."

    return f"{subject} " + ", ".join(clauses[:-1]) + f", and {clauses[-1]}."

def _row_to_message(row) -> Dict[str, Any]:
    """Normalize DB rows into JSON-serializable message objects."""
    data = dict(row)
    return {
        "id": data.get("id"),
        "sender_id": data.get("sender_id"),
        "receiver_id": data.get("receiver_id"),
        "message_type": data.get("message_type") or "text",
        "body": data.get("body"),
        "media_url": data.get("media_url"),
        "media_name": data.get("media_name"),
        "media_size": data.get("media_size"),
        "media_mime": data.get("media_mime"),
        "created_at": data["created_at"].isoformat() if data.get("created_at") else None,
    }

def _fetch_student_basic(user_id: int) -> Dict[str, Any]:
    sql = text("""
        SELECT "UserID" AS user_id, "Name" AS name, "school_name" AS school_name
        FROM "AISC_student_data"
        WHERE "UserID" = :user_id
    """)
    with engine.connect() as conn:
        student = conn.execute(sql, {"user_id": user_id}).mappings().first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

def _ensure_post_exists(post_id: int):
    sql = text('SELECT "id" FROM "AISC_posts" WHERE "id" = :post_id')
    with engine.connect() as conn:
        exists = conn.execute(sql, {"post_id": post_id}).scalar()
    if not exists:
        raise HTTPException(status_code=404, detail="Post not found")

def _serialize_post(row) -> PostResponse:
    data = dict(row)
    return PostResponse(
        id=data["id"],
        author_id=data["author_id"],
        author_name=data["author_name"],
        author_school=data.get("author_school"),
        body=data.get("body"),
        media_url=data.get("media_url"),
        media_name=data.get("media_name"),
        media_size=data.get("media_size"),
        media_mime=data.get("media_mime"),
        created_at=data["created_at"],
        like_count=int(data.get("like_count", 0)),
        comment_count=int(data.get("comment_count", 0)),
        save_count=int(data.get("save_count", 0)),
        liked_by_me=bool(data.get("liked_by_me")),
        saved_by_me=bool(data.get("saved_by_me")),
    )

def _validate_message_participants(sender_id: int, receiver_id: int):
    if sender_id == receiver_id:
        raise HTTPException(status_code=400, detail="Cannot send messages to yourself")

    sql = text("""
        SELECT "UserID" AS user_id
        FROM "AISC_student_data"
        WHERE "UserID" IN (:sender_id, :receiver_id)
    """)
    with engine.connect() as conn:
        rows = conn.execute(sql, {"sender_id": sender_id, "receiver_id": receiver_id}).mappings().all()
    found = {row["user_id"] for row in rows}
    if sender_id not in found or receiver_id not in found:
        raise HTTPException(status_code=404, detail="Sender or receiver not found")

def _fetch_message_matches(user_id: int, message_text: str, limit=15):
    # 1. Embed the message
    try:
        query_vec = embed_text(message_text)
    except:
        query_vec = [0.0] * 3072 

    # 2. Run Search
    # CHANGE: We replaced STRPOS(msg, school_name) with a simpler ILIKE check
    # This allows "Georgia" to match "Georgia Institute of Technology"
    sql = text("""
        SELECT
            s."UserID" AS user_id,
            s."Name" AS name,
            s."major",
            s."year",
            s."skills",
            s."Interests" AS interests,
            s."City" AS city,
            s."Country" AS country,
            s."school_name",
            
            (
                LEAST(
                    COALESCE(s.school_vector <-> (:q_vec)::vector, 2),
                    COALESCE(s.major_vector <-> (:q_vec)::vector, 2),
                    COALESCE(s.interests_vector <-> (:q_vec)::vector, 2)
                )
            ) as semantic_dist,

            -- IMPROVED TEXT MATCH: 
            -- Checks if the message contains the first word of the school (e.g. "Georgia")
            (
               (split_part(s.school_name, ' ', 1) != '' AND s.school_name ILIKE '%' || split_part(s.school_name, ' ', 1) || '%')
               AND (:msg ILIKE '%' || split_part(s.school_name, ' ', 1) || '%')
            ) as text_match

        FROM "AISC_student_data" s
        WHERE s."UserID" <> :user_id
        AND (
            s.major_vector IS NOT NULL 
        )
        ORDER BY 
            text_match DESC, 
            semantic_dist ASC 
        LIMIT :limit
    """)

    with engine.connect() as conn:
        rows = conn.execute(
            sql,
            {
                "user_id": user_id,
                "q_vec": query_vec,
                "msg": message_text, # No lower() needed here as ILIKE handles it
                "limit": limit
            }
        ).mappings().all()

    return list(rows)


def chat_query(payload: ChatQuery):
    if not payload.message or not payload.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    _require_openai_key()

    # --- Get Current User ---
    target_sql = text(f"""SELECT {STUDENT_SELECT_FIELDS} FROM "AISC_student_data" WHERE "UserID" = :user_id""")
    with engine.connect() as conn:
        target = conn.execute(target_sql, {"user_id": payload.user_id}).mappings().first()
    if not target:
        raise HTTPException(status_code=404, detail="Student not found")

    # --- 1. Get "Profile Matches" (People similar to YOU) ---
    # This uses your existing logic to find peers
    candidates_map = {} # Use a dict to deduplicate users by ID

    vectors = _ensure_student_vectors(
        payload.user_id, target.get("major"), target.get("skills"), 
        target.get("school_name"), target.get("interests"), target
    )

    profile_matches = _fetch_hybrid_matches(
        user_id=payload.user_id,
        major_vec=vectors["major_vector"],
        skills_vec=vectors["skills_vector"],
        school_vec=vectors["school_vector"],
        interests_vec=vectors["interests_vector"],
        limit=15, # Top 15 similar people
    )
    
    for p in profile_matches:
        candidates_map[p["user_id"]] = {**p, "match_reason": "Similar profile"}

    # --- 2. Get "Message Matches" (People matching what you ASKED for) ---
    # This finds "Georgia Tech" even if they aren't similar to you
    message_matches = _fetch_message_matches(payload.user_id, payload.message, limit=15)
    
    for p in message_matches:
        # We overwrite if exists to prioritize the fact they matched the query
        candidates_map[p["user_id"]] = {**p, "match_reason": "Matched your search query"}

    # --- 3. Format for AI ---
    candidates_list = list(candidates_map.values())
    candidates_for_prompt = []

    for row in candidates_list:
        score = _distance_to_match_score(row.get("distance")) # Might be None for message matches
        explanation = build_match_message(target, row)
        
        candidates_for_prompt.append({
            "user_id": row["user_id"],
            "name": row["name"],
            "major": row.get("major"),
            "year": row.get("year"),
            "school_name": row.get("school_name"),
            "city": row.get("city"),
            "country": row.get("country"),
            "skills": _coerce_skills(row.get("skills")),
            "interests": row.get("interests"),
            "match_score": score,
            "match": explanation,
            "explanation": explanation,
            "source": row.get("match_reason")
        })

    prompt = _build_chat_prompt(payload.message.strip(), target, candidates_for_prompt)

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.3,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are HuskyConnect, an assistant helping UW-area students find peers. "
                        "You have a mixed list of candidates: some are similar to the user, others matched their specific search terms. "
                        "Prioritize candidates who match the user's specific request (e.g. School Name or Interest) over general profile similarity. "
                        "ALWAYS answer first in natural language, then output JSON after ---STUDENTS---."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Chat assistant failed: {exc}")

    raw = (response.choices[0].message.content or "").strip()
    marker = "---STUDENTS---"
    if marker in raw:
        visible_part, json_part = raw.split(marker, 1)
    else:
        visible_part, json_part = raw, ""

    reply_text = visible_part.strip()

    # --- Parse JSON ---
    suggested_students: List[SuggestedStudent] = []
    if json_part.strip():
        try:
            payload_json = json.loads(json_part.strip())
            for item in payload_json.get("students", []):
                idx = int(item.get("candidate_index", 0))
                if 1 <= idx <= len(candidates_for_prompt):
                    cand = candidates_for_prompt[idx - 1]
                    reason_text = str(item.get("reason") or "").strip() or cand.get("match")
                    suggested_students.append(
                        SuggestedStudent(
                            user_id=cand["user_id"],
                            name=cand["name"],
                            major=cand.get("major"),
                            year=cand.get("year"),
                            city=cand.get("city"),
                            country=cand.get("country"),
                            reason=reason_text,
                            match_score=cand.get("match_score"),
                            school_name=cand.get("school_name"),
                            skills=_coerce_skills(cand.get("skills")),
                            interests=cand.get("interests"),
                        )
                    )
                if len(suggested_students) >= 6:
                    break
        except Exception:
            suggested_students = []

    return ChatReply(reply=reply_text, students=suggested_students)

@app.post("/assistant/query", response_model=ChatReply)
def assistant_query(payload: ChatQuery):
    return chat_query(payload)

@app.get("/recommendations/{user_id}")
def get_recommendations(user_id: int, limit: int = 5, offset: int = 0):
    # ADDED offset parameter ^^^
    
    if limit < 1 or limit > 50:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 50")

    target_sql = text(f"""
        SELECT {STUDENT_SELECT_FIELDS}
        FROM "AISC_student_data"
        WHERE "UserID" = :user_id
    """)

    with engine.connect() as conn:
        target = conn.execute(target_sql, {"user_id": user_id}).mappings().first()
        if not target:
            raise HTTPException(status_code=404, detail="Student not found")

    vectors = _ensure_student_vectors(
        user_id,
        target.get("major"),
        target.get("skills"),
        target.get("school_name"),
        target.get("interests"),
        target
    )

    matches = _fetch_hybrid_matches(
        user_id=user_id,
        major_vec=vectors["major_vector"],
        skills_vec=vectors["skills_vector"],
        school_vec=vectors["school_vector"],
        interests_vec=vectors["interests_vector"],
        limit=limit,
        offset=offset # Pass the offset here
    )
    
    # ... (rest of the function remains the same) ...
    
    # COPY THIS PART TO ENSURE THE RETURN IS CORRECT:
    results = []
    for row in matches:
        score = _distance_to_match_score(row.get("distance"))
        reason = build_match_message(target, row)
        results.append(
            {
                "user_id": row["user_id"],
                "name": row["name"],
                "major": row.get("major"),
                "year": row.get("year"),
                "school_name": row.get("school_name"),
                "city": row.get("city"),
                "country": row.get("country"),
                "skills": _coerce_skills(row.get("skills")),
                "interests": row.get("interests"),
                "match_score": score,
                "match": reason,
                "reason": reason,
            }
        )

    return {"user_id": user_id, "results": results}
    
@app.post("/login")
def login(payload: LoginRequest):
    """
    Simple login endpoint that authenticates by name + password.

    - Looks up the student by Name in AISC_student_data.
    - Uses validate_password() to enforce basic rules and to avoid bcrypt 72-byte errors.
    - Uses verify_password() against the stored password_hash.
    - On success, returns user_id and name.
    - On failure, returns 401 Unauthorized with a safe error message.
    """
    validate_password(payload.password)

    sql = text("""
        SELECT "UserID" AS user_id,
               "Name"   AS name,
               "password_hash"
        FROM "AISC_student_data"
        WHERE "Name" = :name
        LIMIT 1
    """)

    with engine.connect() as conn:
        row = conn.execute(sql, {"name": payload.name}).mappings().first()

    if not row:
        raise HTTPException(status_code=401, detail="Invalid name or password")

    stored_hash = row.get("password_hash")
    if not stored_hash:
        raise HTTPException(status_code=401, detail="Invalid name or password")

    if not verify_password(payload.password, stored_hash):
        raise HTTPException(status_code=401, detail="Invalid name or password")

    return {
        "user_id": row["user_id"],
        "name": row["name"],
    }

@app.post("/messages/send")
def send_message(payload: MessageCreate):
    body = (payload.body or "").strip()
    if not body:
        raise HTTPException(status_code=400, detail="Message body cannot be empty")

    _validate_message_participants(payload.sender_id, payload.receiver_id)

    insert_sql = text("""
        INSERT INTO "AISC_messages"
            ("sender_id", "receiver_id", "message_type", "body",
             "media_url", "media_name", "media_size", "media_mime")
        VALUES (:sender_id, :receiver_id, 'text', :body, NULL, NULL, NULL, NULL)
        RETURNING "id", "sender_id", "receiver_id", "body", "created_at",
                  "message_type", "media_url", "media_name", "media_size", "media_mime"
    """)
    with engine.begin() as conn:
        created = conn.execute(
            insert_sql,
            {"sender_id": payload.sender_id, "receiver_id": payload.receiver_id, "body": body},
        ).mappings().first()
    return _row_to_message(created)

@app.post("/messages/send-media")
async def send_media(
    sender_id: int = Form(...),
    receiver_id: int = Form(...),
    file: UploadFile = File(...),
):
    _validate_message_participants(sender_id, receiver_id)

    if not file:
        raise HTTPException(status_code=400, detail="File upload is required")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    if len(file_bytes) > MAX_MEDIA_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds 25MB limit")

    mime_type = file.content_type or mimetypes.guess_type(file.filename or "")[0]
    if not mime_type or mime_type not in ALLOWED_MEDIA_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    if mime_type in IMAGE_MIME_TYPES:
        message_type = "image"
    elif mime_type in GIF_MIME_TYPES:
        message_type = "gif"
    else:
        message_type = "file"

    if not supabase_client or not MEDIA_UPLOAD_ENABLED:
        raise HTTPException(status_code=500, detail="Supabase storage is not configured")

    bucket = supabase_client.storage.from_(SUPABASE_BUCKET)
    _, ext = os.path.splitext(file.filename or "")
    if not ext:
        ext = mimetypes.guess_extension(mime_type) or ""
    filename = f"{uuid.uuid4().hex}{ext}"
    folder = f"{sender_id}_{receiver_id}"
    storage_path = f"{folder}/{filename}"

    # try:
    #     bucket.upload(storage_path, file_bytes, {"content-type": mime_type, "upsert": True})
    #     public_url = bucket.get_public_url(storage_path)
    # except Exception as exc:
    #     raise HTTPException(status_code=500, detail=f"Failed to upload file: {exc}")
    try:
        bucket.upload(
            storage_path,
            file_bytes,
            file_options={"content-type": mime_type, "upsert": "true"},
        )
        public_url = bucket.get_public_url(storage_path)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {exc}")

    insert_sql = text("""
        INSERT INTO "AISC_messages"
            ("sender_id", "receiver_id", "message_type", "body",
             "media_url", "media_name", "media_size", "media_mime")
        VALUES
            (:sender_id, :receiver_id, :message_type, NULL,
             :media_url, :media_name, :media_size, :media_mime)
        RETURNING "id", "sender_id", "receiver_id", "body", "created_at",
                  "message_type", "media_url", "media_name", "media_size", "media_mime"
    """)
    with engine.begin() as conn:
        created = conn.execute(
            insert_sql,
            {
                "sender_id": sender_id,
                "receiver_id": receiver_id,
                "message_type": message_type,
                "media_url": public_url,
                "media_name": file.filename,
                "media_size": len(file_bytes),
                "media_mime": mime_type,
            },
        ).mappings().first()

    return _row_to_message(created)

# ----- POSTS API ------------------------------------------------------------

@app.post("/posts/create", response_model=PostResponse)
async def create_post(
    author_id: int = Form(...),
    body: str = Form(""),
    file: Optional[UploadFile] = File(None),
):
    author = _fetch_student_basic(author_id)
    body = body.strip()
    if not body and not file:
        raise HTTPException(status_code=400, detail="Post requires text or an image/file")

    media_url = None
    media_name = None
    media_size = None
    media_mime = None

    if file:
        if not supabase_client or not POSTS_MEDIA_ENABLED:
            raise HTTPException(status_code=500, detail="Post media uploads are disabled")
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        if len(file_bytes) > MAX_MEDIA_BYTES:
            raise HTTPException(status_code=400, detail="File exceeds 25MB limit")
        mime_type = file.content_type or mimetypes.guess_type(file.filename or "")[0]
        if not mime_type or mime_type not in ALLOWED_MEDIA_MIME_TYPES:
            raise HTTPException(status_code=400, detail="Unsupported file type")

        bucket = supabase_client.storage.from_(SUPABASE_POSTS_BUCKET)
        _, ext = os.path.splitext(file.filename or "")
        if not ext:
            ext = mimetypes.guess_extension(mime_type) or ""
        filename = f"{uuid.uuid4().hex}{ext}"
        storage_path = f"posts/{author_id}/{filename}"

        try:
            bucket.upload(
                storage_path,
                file_bytes,
                file_options={"content-type": mime_type, "upsert": "true"},
            )
            media_url = bucket.get_public_url(storage_path)
            media_name = file.filename
            media_size = len(file_bytes)
            media_mime = mime_type
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Failed to upload post media: {exc}")

    insert_sql = text("""
        INSERT INTO "AISC_posts"
            ("author_id", "body", "media_url", "media_name", "media_size", "media_mime")
        VALUES
            (:author_id, :body, :media_url, :media_name, :media_size, :media_mime)
        RETURNING "id", "author_id", "body", "media_url", "media_name", "media_size",
                  "media_mime", "created_at"
    """)
    with engine.begin() as conn:
        post_row = conn.execute(
            insert_sql,
            {
                "author_id": author_id,
                "body": body or None,
                "media_url": media_url,
                "media_name": media_name,
                "media_size": media_size,
                "media_mime": media_mime,
            },
        ).mappings().first()

    return PostResponse(
        id=post_row["id"],
        author_id=author_id,
        author_name=author["name"],
        author_school=author.get("school_name"),
        body=post_row.get("body"),
        media_url=post_row.get("media_url"),
        media_name=post_row.get("media_name"),
        media_size=post_row.get("media_size"),
        media_mime=post_row.get("media_mime"),
        created_at=post_row["created_at"],
        like_count=0,
        comment_count=0,
        save_count=0,
        liked_by_me=False,
        saved_by_me=False,
    )

@app.get("/posts/feed")
def get_posts_feed(viewer_id: int, limit: int = 20, offset: int = 0):
    limit = max(1, min(limit, 50))
    offset = max(offset, 0)
    feed_sql = text(f"""
        SELECT
            p."id",
            p."author_id",
            a."Name" AS author_name,
            a."school_name" AS author_school,
            p."body",
            p."media_url",
            p."media_name",
            p."media_size",
            p."media_mime",
            p."created_at",
            COALESCE(l.like_count, 0) AS like_count,
            COALESCE(c.comment_count, 0) AS comment_count,
            COALESCE(s.save_count, 0) AS save_count,
            EXISTS(
                SELECT 1 FROM "AISC_post_likes" pl
                WHERE pl."post_id" = p."id" AND pl."user_id" = :viewer_id
            ) AS liked_by_me,
            EXISTS(
                SELECT 1 FROM "AISC_post_saves" ps
                WHERE ps."post_id" = p."id" AND ps."user_id" = :viewer_id
            ) AS saved_by_me
        FROM "AISC_posts" p
        JOIN "AISC_student_data" a ON a."UserID" = p."author_id"
        LEFT JOIN (
            SELECT "post_id", COUNT(*) AS like_count
            FROM "AISC_post_likes"
            GROUP BY "post_id"
        ) l ON l."post_id" = p."id"
        LEFT JOIN (
            SELECT "post_id", COUNT(*) AS comment_count
            FROM "AISC_post_comments"
            GROUP BY "post_id"
        ) c ON c."post_id" = p."id"
        LEFT JOIN (
            SELECT "post_id", COUNT(*) AS save_count
            FROM "AISC_post_saves"
            GROUP BY "post_id"
        ) s ON s."post_id" = p."id"
        ORDER BY p."created_at" DESC
        LIMIT :limit OFFSET :offset
    """)
    with engine.connect() as conn:
        rows = conn.execute(
            feed_sql,
            {"viewer_id": viewer_id, "limit": limit, "offset": offset},
        ).mappings().all()
    posts = [_serialize_post(row) for row in rows]
    return {"posts": posts, "limit": limit, "offset": offset}

@app.post("/posts/{post_id}/like")
def toggle_post_like(post_id: int, payload: Dict[str, int]):
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    _ensure_post_exists(post_id)
    _fetch_student_basic(user_id)

    with engine.begin() as conn:
        existing = conn.execute(
            text("""
                SELECT "id" FROM "AISC_post_likes"
                WHERE "post_id" = :post_id AND "user_id" = :user_id
            """),
            {"post_id": post_id, "user_id": user_id},
        ).scalar()
        if existing:
            conn.execute(
                text('DELETE FROM "AISC_post_likes" WHERE "id" = :id'),
                {"id": existing},
            )
            liked = False
        else:
            conn.execute(
                text("""
                    INSERT INTO "AISC_post_likes" ("post_id", "user_id")
                    VALUES (:post_id, :user_id)
                """),
                {"post_id": post_id, "user_id": user_id},
            )
            liked = True
        like_count = conn.execute(
            text('SELECT COUNT(*) FROM "AISC_post_likes" WHERE "post_id" = :post_id'),
            {"post_id": post_id},
        ).scalar()
    return {"liked": liked, "like_count": like_count}

@app.post("/posts/{post_id}/save")
def toggle_post_save(post_id: int, payload: Dict[str, int]):
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    _ensure_post_exists(post_id)
    _fetch_student_basic(user_id)

    with engine.begin() as conn:
        existing = conn.execute(
            text("""
                SELECT "id" FROM "AISC_post_saves"
                WHERE "post_id" = :post_id AND "user_id" = :user_id
            """),
            {"post_id": post_id, "user_id": user_id},
        ).scalar()
        if existing:
            conn.execute(
                text('DELETE FROM "AISC_post_saves" WHERE "id" = :id'),
                {"id": existing},
            )
            saved = False
        else:
            conn.execute(
                text("""
                    INSERT INTO "AISC_post_saves" ("post_id", "user_id")
                    VALUES (:post_id, :user_id)
                """),
                {"post_id": post_id, "user_id": user_id},
            )
            saved = True
        save_count = conn.execute(
            text('SELECT COUNT(*) FROM "AISC_post_saves" WHERE "post_id" = :post_id'),
            {"post_id": post_id},
        ).scalar()
    return {"saved": saved, "save_count": save_count}

@app.get("/posts/{post_id}/comments")
def list_post_comments(post_id: int, viewer_id: Optional[int] = None):
    _ensure_post_exists(post_id)
    sql = text("""
        SELECT
            c."id",
            c."post_id",
            c."user_id",
            s."Name" AS user_name,
            s."school_name" AS user_school,
            c."body",
            c."created_at"
        FROM "AISC_post_comments" c
        JOIN "AISC_student_data" s ON s."UserID" = c."user_id"
        WHERE c."post_id" = :post_id
        ORDER BY c."created_at" ASC
    """)
    with engine.connect() as conn:
        rows = conn.execute(sql, {"post_id": post_id}).mappings().all()
    comments = [
        {
            "id": row["id"],
            "post_id": row["post_id"],
            "user_id": row["user_id"],
            "user_name": row["user_name"],
            "user_school": row.get("user_school"),
            "body": row.get("body"),
            "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
        }
        for row in rows
    ]
    return {"comments": comments}

@app.post("/posts/{post_id}/comments")
def create_post_comment(post_id: int, payload: Dict[str, Any]):
    user_id = payload.get("user_id")
    body = (payload.get("body") or "").strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    if not body:
        raise HTTPException(status_code=400, detail="Comment body is required")
    _ensure_post_exists(post_id)
    student = _fetch_student_basic(user_id)

    insert_sql = text("""
        INSERT INTO "AISC_post_comments" ("post_id", "user_id", "body")
        VALUES (:post_id, :user_id, :body)
        RETURNING "id", "post_id", "user_id", "body", "created_at"
    """)
    with engine.begin() as conn:
        comment = conn.execute(
            insert_sql,
            {"post_id": post_id, "user_id": user_id, "body": body},
        ).mappings().first()
    return {
        "id": comment["id"],
        "post_id": comment["post_id"],
        "user_id": comment["user_id"],
        "user_name": student["name"],
        "user_school": student.get("school_name"),
        "body": comment["body"],
        "created_at": comment["created_at"].isoformat() if comment.get("created_at") else None,
    }

@app.get("/posts/saved")
def get_saved_posts(user_id: int):
    _fetch_student_basic(user_id)
    sql = text(f"""
        SELECT
            p."id",
            p."author_id",
            a."Name" AS author_name,
            a."school_name" AS author_school,
            p."body",
            p."media_url",
            p."media_name",
            p."media_size",
            p."media_mime",
            p."created_at",
            COALESCE(l.like_count, 0) AS like_count,
            COALESCE(c.comment_count, 0) AS comment_count,
            COALESCE(s.save_count, 0) AS save_count,
            EXISTS(
                SELECT 1 FROM "AISC_post_likes" pl
                WHERE pl."post_id" = p."id" AND pl."user_id" = :viewer_id
            ) AS liked_by_me,
            EXISTS(
                SELECT 1 FROM "AISC_post_saves" ps
                WHERE ps."post_id" = p."id" AND ps."user_id" = :viewer_id
            ) AS saved_by_me
        FROM "AISC_post_saves" sp
        JOIN "AISC_posts" p ON p."id" = sp."post_id"
        JOIN "AISC_student_data" a ON a."UserID" = p."author_id"
        LEFT JOIN (
            SELECT "post_id", COUNT(*) AS like_count
            FROM "AISC_post_likes"
            GROUP BY "post_id"
        ) l ON l."post_id" = p."id"
        LEFT JOIN (
            SELECT "post_id", COUNT(*) AS comment_count
            FROM "AISC_post_comments"
            GROUP BY "post_id"
        ) c ON c."post_id" = p."id"
        LEFT JOIN (
            SELECT "post_id", COUNT(*) AS save_count
            FROM "AISC_post_saves"
            GROUP BY "post_id"
        ) s ON s."post_id" = p."id"
        WHERE sp."user_id" = :viewer_id
        ORDER BY p."created_at" DESC
    """)
    with engine.connect() as conn:
        rows = conn.execute(sql, {"viewer_id": user_id}).mappings().all()
    return {"posts": [_serialize_post(row) for row in rows]}

@app.delete("/posts/{post_id}")
def delete_post(post_id: int, user_id: int):
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    select_sql = text('SELECT "author_id", "media_url" FROM "AISC_posts" WHERE "id" = :post_id')
    with engine.connect() as conn:
        post = conn.execute(select_sql, {"post_id": post_id}).mappings().first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post["author_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not allowed to delete this post")

    media_url = post.get("media_url")
    with engine.begin() as conn:
        conn.execute(text('DELETE FROM "AISC_posts" WHERE "id" = :post_id'), {"post_id": post_id})

    if media_url and supabase_client:
        marker = f"/object/public/{SUPABASE_POSTS_BUCKET}/"
        if marker in media_url:
            storage_path = media_url.split(marker, 1)[1]
            try:
                supabase_client.storage.from_(SUPABASE_POSTS_BUCKET).remove([storage_path])
            except Exception as exc:
                print(f"[delete_post] Failed to remove media: {exc}")

    return {"deleted": True}

@app.get("/messages/thread", response_model=MessageThreadResponse)
def get_message_thread(user_id: int, other_id: int):
    if user_id is None or other_id is None:
        raise HTTPException(status_code=400, detail="Missing user_id or other_id")

    sql = text("""
        SELECT
            "id",
            "sender_id",
            "receiver_id",
            COALESCE("message_type", 'text') AS message_type,
            "body",
            "media_url",
            "media_name",
            "media_size",
            "media_mime",
            "created_at"
        FROM "AISC_messages"
        WHERE ("sender_id" = :user_id AND "receiver_id" = :other_id)
           OR ("sender_id" = :other_id AND "receiver_id" = :user_id)
        ORDER BY "created_at" ASC
    """)
    with engine.connect() as conn:
        rows = conn.execute(sql, {"user_id": user_id, "other_id": other_id}).mappings().all()
    return {"messages": [_row_to_message(row) for row in rows]}

@app.get("/messages/threads/{user_id}")
def list_message_threads(user_id: int):
    sql = text("""
        WITH ordered AS (
            SELECT
                CASE WHEN "sender_id" = :user_id THEN "receiver_id" ELSE "sender_id" END AS other_id,
                "message_type",
                "body",
                "created_at"
            FROM "AISC_messages"
            WHERE "sender_id" = :user_id OR "receiver_id" = :user_id
        ),
        latest AS (
            SELECT DISTINCT ON (other_id)
                other_id,
                message_type,
                body,
                created_at
            FROM ordered
            ORDER BY other_id, created_at DESC
        )
        SELECT
            latest.other_id,
            s."Name" AS other_name,
            latest.message_type,
            latest.body,
            latest.created_at
        FROM latest
        JOIN "AISC_student_data" s ON s."UserID" = latest.other_id
        ORDER BY latest.created_at DESC
    """)
    with engine.connect() as conn:
        rows = conn.execute(sql, {"user_id": user_id}).mappings().all()

    def _preview(row):
        mtype = (row.get("message_type") or "text").lower()
        if mtype == "text":
            return row.get("body") or ""
        if mtype == "image":
            return "[image]"
        if mtype == "gif":
            return "[gif]"
        return "[file]"

    return [
        {
            "other_user_id": row["other_id"],
            "other_name": row["other_name"],
            "last_message_body": _preview(row),
            "last_message_time": row["created_at"].isoformat() if row.get("created_at") else None,
        }
        for row in rows
    ]

@app.post("/students")
def create_student(student: StudentCreate):
    # 1. Prepare the dictionary
    payload = student.dict()
    plain_password = payload.pop("password")
    validate_password(plain_password)
    
    # 2. Generate ALL 4 vectors using helper function
    # We create a temporary dict to match what embed_student_profile expects
    profile_data = {
        "major": payload.get("major"),
        "skills": payload.get("skills"),
        "school_name": payload.get("school_name"),
        "Interests": payload.get("interests")
    }
    
    vectors = embed_student_profile(profile_data)
    
    # 3. Merge vectors into the payload
    payload.update(vectors)
    
    # 4. Hash password
    truncated_password = plain_password[:72]
    payload["password_hash"] = hash_password(truncated_password)

    # 5. SQL INSERT
    sql = text("""
        INSERT INTO "AISC_student_data"
            ("Name", "Gender", "DOB", "Interests", "City", "Country",
             "major", "year", "skills", "school_name",
             "interests_vector", "major_vector", "skills_vector", "school_vector", 
             "password_hash")
        VALUES
            (:name, :gender, :dob, :interests, :city, :country,
             :major, :year, CAST(:skills AS text[]), :school_name,
             :interests_vector, :major_vector, :skills_vector, :school_vector,
             :password_hash)
        RETURNING "UserID"
    """)

    try:
        with engine.begin() as conn:
            new_id = conn.execute(sql, payload).scalar_one()
        return {"message": "Student created successfully", "user_id": new_id}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/students/{user_id}")
def get_student(user_id: int):
    sql = text("""
        SELECT "UserID" as user_id, "Name" as name, "Gender" as gender,
               "DOB" as dob, "Interests" as interests, "City" as city, "Country" as country,
               "major" as major, "year" as year, "skills" as skills, "school_name" as school_name,
               "interests_vector" as interests_vector
        FROM "AISC_student_data"
        WHERE "UserID" = :user_id
    """)
    with engine.connect() as conn:
        row = conn.execute(sql, {"user_id": user_id}).mappings().first()

    if not row:
        raise HTTPException(status_code=404, detail="Student not found")

    return row

@app.put("/students/{user_id}")
def update_student(user_id: int, student: StudentUpdate):
    # Check if student exists
    existing_sql = text("""
        SELECT "Interests" AS interests, "interests_vector"
        FROM "AISC_student_data"
        WHERE "UserID" = :user_id
    """)

    with engine.connect() as conn:
        existing = conn.execute(existing_sql, {"user_id": user_id}).mappings().first()

    if not existing:
        raise HTTPException(status_code=404, detail="Student not found")

    incoming_fields = getattr(student, "__fields_set__", set())
    
    params = {
        "name": student.name,
        "gender": student.gender,
        "dob": student.dob,
        "interests": student.interests,
        "city": student.city,
        "country": student.country,
        "major": student.major,
        "year": student.year,
        "school_name": student.school_name,
        "skills": student.skills,
        "user_id": user_id,
    }

    if student.password is not None:
        validate_password(student.password)
        params["password_hash"] = hash_password(student.password[:72])
    else:
        params["password_hash"] = None

    # --- GENERATE VECTORS IF TEXT CHANGED ---
    if "interests" in incoming_fields:
        params["interests_vector"] = embed_text((student.interests or "").strip())
    else:
        params["interests_vector"] = None 

    if "major" in incoming_fields:
        params["major_vector"] = embed_text((student.major or "").strip())
    else:
        params["major_vector"] = None 

    if "school_name" in incoming_fields:
        params["school_vector"] = embed_text((student.school_name or "").strip())
    else:
        params["school_vector"] = None

    if "skills" in incoming_fields:
        skills_str = ", ".join(student.skills) if student.skills else ""
        params["skills_vector"] = embed_text(skills_str)
    else:
        params["skills_vector"] = None

    # --- UPDATED SQL: ADDED ::vector CASTS ---
    sql = text("""
        UPDATE "AISC_student_data"
        SET 
            "Name"            = COALESCE(:name, "Name"),
            "Gender"          = COALESCE(:gender, "Gender"),
            "DOB"             = COALESCE(:dob, "DOB"),
            "Interests"       = COALESCE(:interests, "Interests"),
            "City"            = COALESCE(:city, "City"),
            "Country"         = COALESCE(:country, "Country"),
            "major"           = COALESCE(:major, "major"),
            "year"            = COALESCE(:year, "year"),
            "skills"          = COALESCE(:skills, "skills"),
            "school_name"     = COALESCE(:school_name, "school_name"),
            
            "interests_vector"= COALESCE((:interests_vector)::vector, "interests_vector"),
            "major_vector"    = COALESCE((:major_vector)::vector, "major_vector"),
            "skills_vector"   = COALESCE((:skills_vector)::vector, "skills_vector"),
            "school_vector"   = COALESCE((:school_vector)::vector, "school_vector"),
            
            "password_hash"   = COALESCE(:password_hash, "password_hash")
        WHERE "UserID" = :user_id
    """)

    with engine.begin() as conn:
        result = conn.execute(sql, params)
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Student not found")

    return {"message": "Student updated successfully"}

@app.delete("/students/{user_id}")
def delete_student(user_id: int):
    sql = text('DELETE FROM "AISC_student_data" WHERE "UserID" = :user_id')
    with engine.begin() as conn:
        result = conn.execute(sql, {"user_id": user_id})

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Student not found")

    return {"message": "Student deleted successfully"}

@app.get("/fix-vectors")
def fix_missing_vectors():
    """
    TEMPORARY: Fix missing vectors for existing students.
    Call this endpoint once to repair the database.
    """
    # Find students who have a major but no major_vector (implying broken data)
    sql = text('SELECT * FROM "AISC_student_data" WHERE "major_vector" IS NULL')
    
    with engine.connect() as conn:
        rows = conn.execute(sql).mappings().all()
        
    count = 0
    for row in rows:
        # Generate vectors for this student
        vectors = embed_student_profile(dict(row))
        
        update_sql = text("""
            UPDATE "AISC_student_data"
            SET major_vector = :major_vector,
                skills_vector = :skills_vector,
                school_vector = :school_vector,
                interests_vector = :interests_vector
            WHERE "UserID" = :user_id
        """)
        
        with engine.begin() as conn:
            conn.execute(update_sql, {"user_id": row["UserID"], **vectors})
        count += 1
        print(f"Fixed user {row['UserID']}")
        
    return {"message": f"Fixed {count} students. You can now use the recommender."}

@app.get("/fix-vectors-turbo")
def fix_missing_vectors_turbo():
    """
    TURBO VERSION V2: Batches requests and sanitizes inputs.
    Fixes the "$.input is invalid" error by replacing empty strings with "unknown".
    """
    BATCH_SIZE = 100  # Increased batch size for speed
    
    # 1. Get all students who need fixing
    sql = text('SELECT * FROM "AISC_student_data" WHERE "major_vector" IS NULL')
    with engine.connect() as conn:
        rows = conn.execute(sql).mappings().all()
    
    students = [dict(row) for row in rows]
    total_needed = len(students)
    print(f"🚀 Starting TURBO V2 fix for {total_needed} students...")
    
    fixed_count = 0

    # Helper to ensure we never send empty strings to OpenAI
    def sanitize(text_val):
        text_val = str(text_val or "").strip()
        if not text_val:
            return "unknown" # OpenAI requires non-empty strings
        return text_val

    # Handle skills list specifically
    def sanitize_skills(skills_val):
        if isinstance(skills_val, list):
            # Filter out empty strings from the list
            valid_skills = [str(s).strip() for s in skills_val if s and str(s).strip()]
            if valid_skills:
                return ", ".join(valid_skills)
        elif isinstance(skills_val, str) and skills_val.strip():
            return skills_val
        return "none" # Fallback for no skills

    # 2. Process in chunks
    for i in range(0, total_needed, BATCH_SIZE):
        batch = students[i : i + BATCH_SIZE]
        
        # Prepare sanitized lists
        majors = [sanitize(s.get("major")) for s in batch]
        schools = [sanitize(s.get("school_name")) for s in batch]
        interests = [sanitize(s.get("Interests")) for s in batch]
        skills_list = [sanitize_skills(s.get("skills")) for s in batch]
        
        try:
            _require_openai_key()
            
            # 3. Batch API calls
            vecs_major = [d.embedding for d in client.embeddings.create(input=majors, model=EMBED_MODEL).data]
            vecs_school = [d.embedding for d in client.embeddings.create(input=schools, model=EMBED_MODEL).data]
            vecs_interests = [d.embedding for d in client.embeddings.create(input=interests, model=EMBED_MODEL).data]
            vecs_skills = [d.embedding for d in client.embeddings.create(input=skills_list, model=EMBED_MODEL).data]
            
            # 4. Update Database
            with engine.begin() as conn:
                update_sql = text("""
                    UPDATE "AISC_student_data"
                    SET major_vector = :maj_vec,
                        skills_vector = :skl_vec,
                        school_vector = :sch_vec,
                        interests_vector = :int_vec
                    WHERE "UserID" = :uid
                """)
                
                for j, student in enumerate(batch):
                    conn.execute(update_sql, {
                        "maj_vec": vecs_major[j],
                        "skl_vec": vecs_skills[j],
                        "sch_vec": vecs_school[j],
                        "int_vec": vecs_interests[j],
                        "uid": student["UserID"]
                    })
            
            fixed_count += len(batch)
            print(f"✅ Fixed batch {i} to {i + len(batch)} (Total: {fixed_count}/{total_needed})")
            
        except Exception as e:
            print(f"❌ Error on batch starting at index {i}: {e}")
            # If a massive batch fails, you might want to see the specific error
            # print(majors) # Uncomment to debug if specific text is still failing
            continue

    return {"message": f"Turbo fix complete. Processed {fixed_count} students."}

@app.get("/fix-specific-school")
def fix_specific_school(school_query: str = "Georgia"):
    """
    SNIPER FIX: Finds students from a specific school (like 'Georgia')
    and forces their vectors to generate immediately.
    """
    # 1. Find students matching the school name text (case insensitive)
    search_term = f"%{school_query}%"
    sql = text("""
        SELECT * FROM "AISC_student_data" 
        WHERE "school_name" ILIKE :pattern
        AND "major_vector" IS NULL
    """)
    
    with engine.connect() as conn:
        rows = conn.execute(sql, {"pattern": search_term}).mappings().all()
    
    students = [dict(row) for row in rows]
    count = len(students)
    print(f"🎯 Found {count} broken profiles for '{school_query}'. Fixing now...")
    
    if count == 0:
        return {"message": f"No broken profiles found for '{school_query}'. They might already be fixed!"}

    # 2. Fix them using the existing helper logic
    fixed = 0
    _require_openai_key()
    
    # We process them one by one because there shouldn't be too many (safer)
    with engine.begin() as conn:
        for s in students:
            # Create vectors
            vectors = embed_student_profile(s)
            
            update_sql = text("""
                UPDATE "AISC_student_data"
                SET major_vector = :major_vector,
                    skills_vector = :skills_vector,
                    school_vector = :school_vector,
                    interests_vector = :interests_vector
                WHERE "UserID" = :uid
            """)
            
            conn.execute(update_sql, {
                "uid": s["UserID"],
                **vectors
            })
            fixed += 1
            print(f"✅ Fixed {s['Name']} from {s.get('school_name')}")

    return {"message": f"Successfully fixed {fixed} students from {school_query}"}