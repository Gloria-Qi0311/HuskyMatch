# HuskyConnect

HuskyConnect is a full-stack student networking platform for discovering classmates, collaborators, and community connections through profile-based matching.

This refreshed version packages the project for cleaner handoff and easier GitHub publishing, with a React frontend, a FastAPI backend, and Supabase/Postgres as the data layer.

## Highlights

- Student profile creation, sign-in, and editable personal data
- Recommendation engine powered by interest and profile embeddings
- AI assistant endpoint for match suggestions and conversational discovery
- Direct messaging, media sharing, and social feed interactions
- Frontend and backend split cleanly for local development or separate deployment

## Tech Stack

- Frontend: React 19, Vite, React Router, Tailwind tooling
- Backend: FastAPI, SQLAlchemy, Psycopg2, Passlib
- Data and storage: Supabase Postgres + Supabase Storage
- AI: OpenAI embeddings and assistant-driven recommendation flows

## Project Structure

```text
.
├── frontend/
│   └── huskyconnect/        # React + Vite app
├── supabase-fastapi/        # FastAPI backend and helper scripts
├── .env.example             # Root backend environment template
└── README.md
```

## Prerequisites

- Node.js 18+
- npm 9+
- Python 3.12+
- A Supabase project with the required tables and storage buckets
- An OpenAI API key for embedding-backed matching features

## Environment Setup

1. Copy the backend environment template:

```bash
cp .env.example .env
```

2. Fill in these required values in `.env`:

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

3. Copy the frontend environment template:

```bash
cp frontend/huskyconnect/.env.example frontend/huskyconnect/.env
```

4. Update `VITE_API_URL` if your backend is not running on `http://localhost:8000`.

## Run Locally

### Backend

```bash
cd supabase-fastapi
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Useful backend URLs:

- API root: `http://localhost:8000/`
- Docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend/huskyconnect
npm install
npm run dev -- --host
```

Then open the local Vite URL, usually `http://localhost:5173`.

## Core API Areas

- `GET /students`
- `POST /students`
- `PUT /students/{user_id}`
- `GET /recommendations/{user_id}`
- `POST /assistant/query`
- `POST /login`
- `POST /messages/send`
- `POST /posts/create`
- `GET /posts/feed`

## Data Notes

The backend expects a Supabase/Postgres table named `AISC_student_data` and additional tables for posts, likes, saves, comments, and messages used by the social features. Storage buckets are also required for media upload flows.

If you are publishing this as a portfolio project, it is a good idea to include:

- a short architecture screenshot
- seeded demo users
- a deployed frontend/backend link
- screenshots or a short GIF in this README

## Repo Cleanup Included In This Refresh

- Added a stronger root `.gitignore`
- Added a root `.env.example`
- Added backend `requirements.txt`
- Removed editor temp files from source control
- Rewrote the README so it matches the actual project more closely

## License

Released under the [MIT License](LICENSE).
