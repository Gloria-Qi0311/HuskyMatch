import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(override=True)

client = OpenAI()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL, pool_pre_ping=True, future=True)


def embed(text: str):
    if not text:
        return None
    res = client.embeddings.create(
        model="text-embedding-3-large",
        input=text,
    )
    return res.data[0].embedding


def main():
    sql_fetch = text("""
        SELECT "UserID", "major", "skills", "school_name", "Interests"
        FROM "AISC_student_data"
        ORDER BY "UserID" ASC
    """)

    sql_update = text("""
        UPDATE "AISC_student_data"
        SET 
            major_vector = :mvec,
            skills_vector = :svec,
            school_vector = :scvec,
            interests_vector = :ivec
        WHERE "UserID" = :uid
    """)

    with engine.connect() as conn:
        rows = conn.execute(sql_fetch).mappings().all()

        for row in rows:
            uid = row["UserID"]
            print("Embedding user:", uid)

            mvec = embed(row["major"])
            svec = embed(", ".join(row["skills"]) if isinstance(row["skills"], list) else row["skills"])
            scvec = embed(row["school_name"])
            ivec = embed(row["Interests"])

            conn.execute(sql_update, {
                "uid": uid,
                "mvec": mvec,
                "svec": svec,
                "scvec": scvec,
                "ivec": ivec,
            })

        conn.commit()

    print("DONE: All embeddings updated.")
    

if __name__ == "__main__":
    main()