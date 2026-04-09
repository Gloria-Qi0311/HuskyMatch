# HuskyConnect Frontend

React + Vite + Tailwind landing page that calls the FastAPI backend for real recommendation data.

## Setup

```bash
cd frontend/huskyconnect
cp .env.example .env          # adjust VITE_API_URL if backend runs elsewhere
npm install
npm run dev -- --host         # start local dev server
```

The recommendation preview automatically calls `GET /recommendations/{user_id}` on page load.  
`VITE_API_URL` defaults to `http://localhost:8000`, which matches the FastAPI dev server.

## Production build

```bash
npm run build
npm run preview
```

The build artifacts are emitted to `dist/` and can be hosted on any static host (Render, Vercel, S3, etc.).
