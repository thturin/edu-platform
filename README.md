# Edu Platform Docker Orchestrator

This repository only contains the Docker Compose stack, helper scripts, and documentation that glue together the two production applications:

- **Portal** – the student/admin experience plus the main API and workers.
- **Lab Creator** – the lab authoring UI and grading API that powers automated evaluations.

Both apps now live in their own repositories. Clone them next to the Compose file (see the instructions below) and this repo will wire Postgres, Redis, background workers, and hot-reloading local clients into a single development environment.

## Required repositories

| Directory (inside this repo) | Upstream repo | Purpose |
| --- | --- | --- |
| `portal/` | Portal application repo (clone here) | CRA client, Express API, Prisma schema, BullMQ workers |
github.com/thturin/lab-creator
| `lab-creator/` | Lab creator repo (clone here) | React lab builder, grading API with OpenAI/DeepSeek |
github.com/thturin/portal
> Replace the placeholder repo names above with your actual Git origin (GitHub, GitLab, etc.). The Compose file assumes the portal code sits in `portal/` and the lab creator code sits in `lab-creator/` relative to the root of this repo.

## Getting started

1. Clone this repository.
2. Clone the portal repo into `portal/`:
   ```bash
   git clone <portal-repo-url> portal
   ```
3. Clone the lab creator repo into `lab-creator/`:
   ```bash
   git clone <lab-creator-repo-url> lab-creator
   ```
4. Copy `.env.example` → `.env` (or create `.env`) in this repo and fill in the variables listed below. These values are forwarded into Docker containers and act as sane defaults for local work.
5. Start the stack:
   ```bash
   docker compose up --build
   ```
6. Open the services once the containers are healthy:
   - Portal client → http://localhost:13000
   - Portal API → http://localhost:15000
   - Lab creator client → http://localhost:13001
   - Lab creator API → http://localhost:14000
   - Portal Postgres → localhost:15432
   - Lab creator Postgres → localhost:15433
   - Redis (password protected) → localhost:16379

Source folders are mounted into each container, so code edits immediately trigger hot reloads.

## Repository layout

```
.
├── docker-compose.yml      # Spins up Redis, Postgres instances, both APIs, both clients
├── portal/                 # Clone of the portal repo (not tracked here)
└── lab-creator/            # Clone of the lab creator repo (not tracked here)
```

Any other automation (Railway deploy configs, Netlify settings, etc.) lives in the respective upstream repos.

## Environment variables

Place these keys in the root `.env`. Docker Compose interpolates them for each service. The same names should be mirrored inside Railway, Netlify, or any other host you use in production.

### Shared infrastructure

| Variable | Description |
| --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD` | Credentials for both Postgres containers. |
| `POSTGRES_PORTAL_DB`, `POSTGRES_LABCREATOR_DB` | Database names created for each stack. |
| `PORTAL_DATABASE_URL`, `LABCREATOR_DATABASE_URL` | Full Prisma URLs used by the APIs (Docker Compose can keep these pointing at the internal service hostnames). |
| `REDIS_PASSWORD` | Password applied to the Redis container and referenced by the portal API session store. |
| `LAB_CREATOR_API_URL` | Base URL that the portal API uses when calling the lab creator API (e.g., `http://lab-creator-api:4000/api`). |

### Portal API (`portal/server`)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string for portal data (usually `PORTAL_DATABASE_URL`). |
| `CLIENT_URL` | Allowed origin for browser sessions (Netlify URL or `http://localhost:13000`). |
| `SERVER_URL` | Public URL of the API (used for callbacks and redirects). |
| `SESSION_SECRET` | Express session secret. |
| `PORT` | Port that the API listens on inside the container (default 5000). |
| `RUN_ASSIGNMENT_WORKER` | Toggle BullMQ workers on/off locally. |
| `REDIS_URL` / `REDIS_PASSWORD` | Connection info for Redis-backed sessions and queues. |

### Portal client (`portal/client`)

| Variable | Purpose |
| --- | --- |
| `REACT_APP_API_HOST` | Fully qualified portal API URL (e.g., `https://portal-api.example.com/api`). |
| `REACT_APP_API_LAB_HOST` | Public URL for the lab creator API endpoints. |

### Lab creator API (`lab-creator/server`)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string for lab sessions and metadata. |
| `OPENAI_API_KEY` | Used for AI grading fallback. |
| `DEEPSEEK_API_KEY` | Preferred grading provider. |
| `CLIENT_URL` | Allowed origin for the lab creator client. |
| `NODE_ENV` / `SERVER_PORT` | Standard Node config knobs. |

### Lab creator client (`lab-creator/client`)

| Variable | Purpose |
| --- | --- |
| `REACT_APP_SERVER_HOST` | Base URL of the lab creator API (`http://localhost:14000/api` locally). |
| `REACT_APP_CLIENT_PORTAL_HOST` | Link back to the portal client (used inside lab previews). |

## Run the docker-compose file 

In the edu-platform folder, run 
```bash
#build images and containers
docker-compose up --build 
```

## Running services without Docker

If you prefer to run everything manually:

```bash
# Portal API
cd portal/server && npm install && npx prisma migrate dev && npm run dev

# Portal client
cd portal/client && npm install && npm start

# Lab creator API
cd lab-creator/server && npm install && npx prisma migrate dev && npm run dev

# Lab creator client
cd lab-creator/client && npm install && npm start
```

Ensure Postgres and Redis are reachable (Docker containers, Railway instances, or local installs) and that every service sees the same environment variables listed above.

## Deployment pointers

- **Railway** – Host the APIs, Postgres instances, and Redis. Copy the `.env` values into each Railway service, run `npx prisma migrate deploy`, and restart so the secrets take effect. Remember to set `CLIENT_URL` to your Netlify domains and `SERVER_URL` to the public Railway URL.
- **Netlify (portal client)** – Set `REACT_APP_API_HOST` and `REACT_APP_API_LAB_HOST`, keep `_redirects` with `/* /index.html 200`, and ensure the build completes with no ESLint warnings (CRA treats warnings as failures in CI).
- **Static host for lab creator client** – Deploy the `lab-creator/client` build output anywhere, mirroring the same `_redirects` rule and pointing `REACT_APP_SERVER_HOST` to the public lab creator API.

## Database tips

- Apply migrations whenever Prisma schemas change: `npx prisma migrate dev` locally, `npx prisma migrate deploy` in Railway.
- Use `pg_dump -F c` and `pg_restore` (or `psql` for plain SQL) to move data between Docker volumes and Railway. Avoid piping binary dumps through a tty (`docker exec -t ... > dump` corrupts the file).

## Troubleshooting quick hits

- **CORS or session issues** – `CLIENT_URL` must match the deploying host and Axios should send credentials (`withCredentials = true`). Production cookies require `sameSite=none` and `secure=true`, already handled in the portal API.
- **SPA 404s on Netlify** – Ensure `_redirects` includes `/* /index.html 200` before running `npm run build`.
- **AI grading failures** – Confirm both `OPENAI_API_KEY` and `DEEPSEEK_API_KEY` exist on the lab creator API host and that outbound traffic is permitted.
- **Background workers not running** – Check `RUN_ASSIGNMENT_WORKER` and the Redis password. Workers share the same environment as the portal API container.


