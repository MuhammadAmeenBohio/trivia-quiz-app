# Trivia Quiz

A trivia quiz web app. Sign in, pick a category and difficulty, answer 10 timed questions, and try to beat your personal high score. Questions come from [Open Trivia DB](https://opentdb.com/).

## Features

- Email/password and Google sign-in (Supabase Auth)
- 10 multiple-choice questions per round, with category and difficulty pickers
- Per-user high score saved in Postgres
- No repeated questions: the backend remembers your last 50 questions
- Skip a question (counts as wrong); one retry after a wrong answer
- Streak effects: 3 correct in a row is a hat-trick, 3 wrong in a row gets you booed
- Sound effects and music generated in the browser (no audio files), with a mute toggle

## Tech stack

| Part | Tech |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui (Base UI), framer-motion |
| Backend | FastAPI (Python 3.12+), managed with `uv` |
| Auth + database | Supabase (Auth + Postgres) |
| Questions | Open Trivia DB |

## How it works

```
Browser (Next.js, :3000)
   │  1. Sign in with Supabase Auth -> receives a JWT
   │  2. Calls the API with  Authorization: Bearer <JWT>
   ▼
FastAPI backend (:8000)
   ├─ verifies the JWT against Supabase's JWKS keys
   ├─ GET  /questions   -> fetches from Open Trivia DB, filters out questions you've seen
   ├─ GET  /scores/me   -> your high score
   └─ POST /submit-score -> computes the score on the server and saves it if it's a new best
   ▼
Supabase Postgres  (table: user_scores)
```

### Quiz flow

1. The home page lets you choose a category and difficulty, then starts the quiz.
2. The frontend requests questions from the backend. The backend asks Open Trivia DB for more than needed (about 1.5x), throws away any question this user has already seen, and returns 10.
3. For each question the frontend tracks whether you were right and how long you took. A wrong first answer gives one retry. Skipping counts as wrong.
4. At the end, the frontend sends only the answer results to `/submit-score`. **The backend calculates the score**, so it can't be faked from the browser.
5. If the score beats your stored high score, it is saved and the results screen shows "New high score!".

### Scoring

- Correct answer in 10 seconds or less: 10 points
- Correct answer after 10 seconds: 5 points
- Wrong or skipped: 0 points
- Maximum per round: 100 points

### No-repeat questions

`backend/app/seen.py` keeps a per-user hash table of the last 50 question hashes (SHA-256 of the normalized question text). Lookups are O(1). When it is full, the oldest entry is forgotten. If the available pool is smaller than what you've already seen, repeats are used only to top up a short quiz.

The history lives in server memory, so it resets on restart and expires after 2 hours of inactivity.

### Error handling

The Open Trivia DB call has a 10 second timeout, checks the HTTP status, and handles rate limiting (429). Failures become clean JSON errors instead of crashing the server.

## Project structure

```
app/                  Next.js pages
  (app)/              pages with the navbar/footer (home, quiz)
  login/              login page
components/           UI components (navbar, option pills, streak overlay, ...)
lib/                  API helper, sound engine, streak logic, Supabase clients
middleware.ts         keeps the Supabase session fresh
backend/
  app/                FastAPI app (auth, trivia, scores, seen-questions, OpenTDB client)
  migrations/         SQL migrations
  run_migrations.py   applies the migrations
  tests/              unit tests
```

## Setup

### Prerequisites

- Node.js 20+
- Python 3.12+ and [uv](https://docs.astral.sh/uv/)
- A [Supabase](https://supabase.com/) project
- A Google OAuth client ID (for Google sign-in)

### 1. Clone and install

```bash
git clone https://github.com/MuhammadAmeenBohio/trivia-quiz-app.git
cd trivia-quiz-app

# frontend
npm install

# backend
cd backend
uv sync
cd ..
```

### 2. Configure environment variables

Create a `.env` file in the project root (the backend reads the same file):

```env
# Supabase -> Project Settings -> API
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # server only, never expose it

# Supabase -> Project Settings -> Database -> Connection string (used by migrations)
SUPABASE_DB_URL=postgresql://postgres:<password>@db.<your-project>.supabase.co:5432/postgres

# Optional: Google sign-in
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<google oauth client id>

# Where the frontend finds the backend
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

Never commit `.env`. The service role key bypasses all database security.

### 3. Set up Supabase

1. In the Supabase dashboard, go to Authentication and enable the Email provider. Enable Google too if you want Google sign-in.
2. Create the database table:

   ```bash
   cd backend
   uv run python run_migrations.py
   ```

   This creates the `user_scores` table.

### 4. Run it

Open two terminals.

**Backend** (http://localhost:8000):

```bash
cd backend
uv run uvicorn app.main:app --reload
```

**Frontend** (http://localhost:3000):

```bash
npm run dev
```

Open http://localhost:3000, sign in, and play.

The backend only allows requests from `http://localhost:3000` (CORS). If you deploy the frontend somewhere else, update `allow_origins` in `backend/app/main.py`.

### Run the tests

```bash
cd backend
uv run python -m unittest discover -s tests -t .
```

## API

All endpoints require `Authorization: Bearer <supabase access token>`.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/questions?amount=10&category=9&difficulty=easy` | Returns `{ questions, repeats }` with questions you haven't seen recently |
| GET | `/scores/me` | Returns `{ highest_score }` |
| POST | `/submit-score` | Body: `{ answers: [{ question_type, is_correct, time_taken_seconds }] }`. Returns `{ score, highest_score, new_high_score }` |

FastAPI docs are available at http://localhost:8000/docs while the backend is running.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the frontend in dev mode |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | Lint the frontend |

## Credits

Questions provided by [Open Trivia DB](https://opentdb.com/) under CC BY-SA 4.0.
