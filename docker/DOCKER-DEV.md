# Local Docker Development Stack

This stack runs the full Champ Compass locally — no external services required. It includes PostgreSQL with Supabase's auth schema, GoTrue (auth), PostgREST (database REST API), an nginx gateway, the FastAPI backend, and a static frontend server.

## Prerequisites

- Docker Engine 24+ and Docker Compose v2 (`docker compose` — note: no hyphen)
- Verify: `docker compose version`

## Start the stack

```bash
make up
```

First start pulls images and builds the backend container. Subsequent starts are fast. The `db` service may take 10-20 seconds to become healthy before GoTrue and PostgREST start.

## Service URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Backend API docs (Swagger) | http://localhost:8000/docs |
| Supabase gateway (auth + REST) | http://localhost:9000 |
| PostgreSQL | localhost:5432 |

## First-time use

Email confirmation is disabled (`GOTRUE_MAILER_AUTOCONFIRM=true`). You can sign up and log in immediately without checking your email. Use any email address — it does not need to be real.

1. Open http://localhost:3000
2. Click "Sign Up Free" and create an account
3. Log in — your email appears in the nav
4. Run an assessment — it saves to the local database
5. Your history panel will populate with past assessments
6. Save and compare baselines via the Action Center

## Useful commands

```bash
# Start all services in the background
make up

# Stream logs from all services
make logs

# Stop all services (keeps data)
make down

# Wipe everything and start fresh (destroys the db_data volume)
make reset

# Open a psql shell inside the DB container
make shell-db

# Open a bash shell inside the backend container
make shell-backend

# Run the backend test suite (runs locally, not inside Docker)
make test

# Rebuild only the backend image
make build
```

## Connecting to the database directly

```bash
make shell-db
# Inside psql:
\dt                          -- list tables
select * from assessments;   -- view saved assessments
select * from baselines;     -- view saved baselines
select email from auth.users; -- view registered users
```

## Resetting data

```bash
make reset
```

This runs `docker compose down -v` (destroys the `db_data` volume) then starts fresh. All users, assessments, and baselines are wiped. Migrations re-run automatically on next start.

## Security notice

`.env.docker` contains demo JWT keys published in Supabase's own documentation for `supabase start`. They are safe for local development only.

**Never use `.env.docker` values in a production or staging environment.**

The file is listed in `.gitignore` and will not be committed to the repository.
