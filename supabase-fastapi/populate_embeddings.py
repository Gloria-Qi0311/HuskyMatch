#!/usr/bin/env python3
"""
Populate embedding columns for AISC_student_data.

Usage:
    python populate_embeddings.py
"""

import json
import os
import re
import sys
from pathlib import Path
from typing import List, Optional, Any, Dict
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import psycopg2
from psycopg2 import sql
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
ENV_LOADED = load_dotenv(PROJECT_ROOT / ".env")
if not ENV_LOADED:
    load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")
VECTOR_DIM = 3072
BIO_COLUMN_PRESENT: Optional[bool] = None
VECTOR_COLUMNS = ["interests_vector"]

if not OPENAI_API_KEY:
    print("OPENAI_API_KEY is not configured", file=sys.stderr)
    sys.exit(1)

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing", file=sys.stderr)
    sys.exit(1)

if not DATABASE_URL:
    print("DATABASE_URL is not configured", file=sys.stderr)
    sys.exit(1)


def _normalize_text(value: Optional[Any]) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return ", ".join(str(v).strip() for v in value if v is not None)
    return str(value).strip()


def _build_embeddings(record: Dict[str, Any]) -> Dict[str, List[float]]:
    interests_text = _normalize_text(record.get("Interests") or record.get("interests"))
    return {"interests_vector": embed_text(interests_text or "General interests")}


def embed_text(text: str) -> List[float]:
    clean = text.strip() or "Unknown"
    body = json.dumps(
        {
            "model": "text-embedding-3-large",
            "input": clean,
        }
    ).encode("utf-8")
    request = Request(
        "https://api.openai.com/v1/embeddings",
        data=body,
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=60) as response:
            response_body = response.read()
    except HTTPError as exc:
        error_body = exc.read().decode("utf-8") if exc.fp else ""
        raise RuntimeError(f"OpenAI API error: {exc.code} {error_body}") from exc
    except URLError as exc:
        raise RuntimeError(f"OpenAI API unreachable: {exc.reason}") from exc

    payload = json.loads(response_body.decode("utf-8"))
    data = payload.get("data") or []
    if not data:
        raise RuntimeError(f"No embedding returned for input: {clean[:30]}...")
    return data[0]["embedding"]


def _check_bio_column(conn) -> bool:
    global BIO_COLUMN_PRESENT
    if BIO_COLUMN_PRESENT is not None:
        return BIO_COLUMN_PRESENT
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'AISC_student_data'
              AND column_name = 'bio'
            LIMIT 1
            """
        )
        BIO_COLUMN_PRESENT = cur.fetchone() is not None
    return BIO_COLUMN_PRESENT


def fetch_students(conn, limit: int = 200):
    has_bio = _check_bio_column(conn)
    bio_select = '"bio"' if has_bio else "NULL AS bio"
    query = f"""
        SELECT
            "UserID" AS user_id,
            "Name" AS name,
            "Interests" AS interests,
            "major",
            "skills",
            "school_name",
            "year",
            {bio_select}
        FROM "AISC_student_data"
        ORDER BY "UserID"
        LIMIT %s
    """
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, (limit,))
        return cur.fetchall()


def _vector_literal(vec: List[float]) -> str:
    formatted = ", ".join(f"{value:.10f}" for value in vec)
    return f"[{formatted}]"


def update_student(conn, user_id: int, embeddings: dict):
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE "AISC_student_data"
            SET
                "interests_vector" = %s::vector
            WHERE "UserID" = %s
            """,
            (
                _vector_literal(embeddings["interests_vector"]),
                user_id,
            ),
        )
    conn.commit()


def _current_vector_dim(conn, column: str) -> Optional[int]:
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT format_type(a.atttypid, a.atttypmod)
            FROM pg_attribute a
            WHERE a.attrelid = '"AISC_student_data"'::regclass
              AND a.attname = %s
              AND a.attnum > 0
              AND NOT a.attisdropped
            """,
            (column,),
        )
        row = cur.fetchone()
        if not row or not row[0]:
            return None
        match = re.search(r"vector\((\d+)\)", row[0])
        if not match:
            return None
        return int(match.group(1))


def ensure_vector_columns(conn, dimension: int):
    for column in VECTOR_COLUMNS:
        current_dim = _current_vector_dim(conn, column)
        if current_dim == dimension:
            continue
        with conn.cursor() as cur:
            cur.execute(
                sql.SQL(
                    'ALTER TABLE "AISC_student_data" ALTER COLUMN {} TYPE vector(%s);'
                ).format(sql.Identifier(column)),
                (dimension,),
            )
        conn.commit()
        print(f"[setup] Adjusted {column} to vector({dimension}).")


def main():
    conn = psycopg2.connect(DATABASE_URL)
    print(f"[setup] Connected to Supabase project at {SUPABASE_URL}")
    try:
        ensure_vector_columns(conn, VECTOR_DIM)
        students = fetch_students(conn, limit=200)
        total = len(students)
        if total == 0:
            print("No students found to update.")
            return

        print(f"Processing {total} students...")
        for idx, student in enumerate(students, start=1):
            user_id = student.get("UserID")
            record = dict(student)
            try:
                embeddings = _build_embeddings(record)
                update_student(conn, user_id, embeddings)
                print(f"[{idx}/{total}] Updated user_id={user_id} with embeddings.", flush=True)
            except Exception as exc:
                print(
                    f"[{idx}/{total}] Failed for user_id={user_id}: {exc}",
                    file=sys.stderr,
                    flush=True,
                )
    finally:
        conn.close()
        print("Connection closed.")


if __name__ == "__main__":
    main()
