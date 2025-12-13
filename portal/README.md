# Portal

The portal is the main student and instructor experience. It combines a React client (students/admins) with an Express/Prisma API that manages assignments, sections, GitHub submissions, and BullMQ workers that handle background grading jobs. This folder is meant to be used as a standalone repository and can be driven either directly or via the Docker orchestrator in the parent `edu-platform` repo.

## Repository layout

```
portal/
├── client/          # React app served via CRA (students + admins)
├── server/          # Express API, Prisma schema, BullMQ workers
└── start.sh         # Helper script when running under Docker Compose
```

## Feature highlights

- Assignment CRUD, GitHub submission flow, and roster/section management.
- Rich lab previews that call into the external Lab Creator service.
- Background BullMQ workers for long-running tasks (assignment deletion, regrading, cleanup).
- Redis-backed Express sessions so Netlify (client) ↔ Railway (API) cross-origin auth stays stable.
- Prisma/Postgres data model with migrations and seeds to capture assignments, users, and submissions.

## Tech stack

- **Client:** React 18 (CRA), React Router, React Quill, Tailwind/PostCSS, Axios.
- **API:** Node 18+, Express 5, Prisma ORM, BullMQ, Redis, Passport GitHub (optional), Multer, csv-parse.
- **Data/Infra:** PostgreSQL, Redis, Docker Compose for local orchestration, Railway + Netlify for production.

## Prerequisites

- Node.js 18+ and npm 9+ (unless everything runs inside Docker).
- PostgreSQL database and Redis instance (Docker containers, Railway, or any managed provider).
- Access to the Lab Creator API base URL so portal assignments referencing labs can be previewed/graded.
- Optional GitHub OAuth app if you use GitHub login/ownership checks.

## Environment variables

Create `portal/.env` (or configure the same keys in your host) and keep secrets out of version control.

### API (`server/.env`)

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma/Postgres connection string (`postgresql://user:pass@host:port/db?schema=public`). |
| `PORT` | Port the API should listen on (defaults to 5000). |
| `CLIENT_URL` | Allowed origin for CORS + sessions (`http://localhost:3000` or Netlify URL). |
| `SERVER_URL` | Public URL of this API, used in redirects and health checks. |
| `SESSION_SECRET` | Express-session secret. |
| `NODE_ENV` | `development` or `production` to control cookie security. |
| `REDIS_URL` | Optional single URL that encodes Redis credentials (format `redis://:password@host:port/db`). |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | Use these instead of `REDIS_URL` when connecting manually. |
| `LAB_CREATOR_API_URL` | Base URL for the Lab Creator API (for lab CRUD and grading orchestration). |
| `RUN_ASSIGNMENT_WORKER` | Set to `false` if you want to skip spinning up BullMQ workers locally. |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL` | Populate if enabling GitHub OAuth (optional). |

### Client (`client/.env`)

| Name | Purpose |
| --- | --- |
| `REACT_APP_API_HOST` | Fully-qualified API URL exposed to the browser (e.g., `https://portal-api.example.com/api`). |
| `REACT_APP_API_LAB_HOST` | Public Lab Creator API URL so lab previews can call grading endpoints. |

> CRA only exposes variables prefixed with `REACT_APP_`. Keep secrets on the server side.

## Installation

```bash
# API
cd server
npm install
npx prisma generate

# Client
cd ../client
npm install
```

## Local development

### Run everything manually

```bash
# Terminal 1 – API (will also boot workers unless disabled)
cd server
cp .env.example .env   # if provided
npx prisma migrate dev
npm run dev

# Terminal 2 – React client
cd client
cp .env.example .env   # set REACT_APP_* values
npm start
```

Ensure Postgres + Redis are reachable (either via Docker or your own services) and that `LAB_CREATOR_API_URL` points to a running Lab Creator API so lab-related calls work.

### Using the top-level Docker Compose

If you are inside the parent `edu-platform` orchestrator, copy the required environment variables into the root `.env` and run `docker compose up portal-api portal-client`. Source directories are mounted into the containers so hot reloading works.

## Database & migrations

- Edit Prisma models under `server/prisma/schema.prisma`.
- `npx prisma migrate dev` – create a new migration and update the dev database.
- `npx prisma migrate deploy` – apply migrations in production (Railway build step).
- `npm run seed` – optional data seeding script for local demos.

## Background workers

`server/workers/assignmentDeletionWorker.js` and `server/workers/submissionRegradeWorker.js` are loaded automatically unless `RUN_ASSIGNMENT_WORKER=false`. They consume BullMQ queues backed by Redis and will re-score GitHub submissions or cascade deletes into the Lab Creator service.

## Deployment

- **API** – Deploy to Railway/Render/etc. Provide all environment variables and run `npm run build && npm run deploy` (or `npx prisma migrate deploy`). Make sure Redis credentials are reachable and that the container trusts the `CLIENT_URL` domain.
- **Client** – Deploy to Netlify or any static host with `npm run build`. Netlify should set `REACT_APP_API_HOST`, `REACT_APP_API_LAB_HOST`, and include `_redirects` with `/* /index.html 200` before the build to support SPA routing.
- **Sessions/CORS** – Production cookies require `sameSite=none` and `secure=true`, which is handled automatically when `NODE_ENV=production`. Also set `axios.defaults.withCredentials = true` in the client (already configured) so login persists across origins.

## Testing & linting

- `npm run test` inside `client/` executes the CRA test runner (`react-testing-library`).
- The server currently has no automated tests; consider adding Jest or integration tests before shipping major changes.
- ESLint runs as part of `npm run build` for the client. Netlify/CI will fail the build if any warnings remain, so clear them locally first.

## Troubleshooting

- **CORS or session errors** – Double-check `CLIENT_URL`, cookie settings, and that the client sends credentials. When debugging on Railway, hit `/health-debug` to confirm env values.
- **Lab previews fail** – Ensure `LAB_CREATOR_API_URL` is reachable and the Lab Creator service trusts the portal origin.
- **BullMQ crashes** – Verify Redis credentials; setting `RUN_ASSIGNMENT_WORKER=false` can help isolate API issues.
- **`pg_restore` corruption** – Use `pg_dump -F c` and `pg_restore` without piping through a TTY (see parent repo docs for copy commands).

This README should give new contributors enough context to run the portal independently or under the main Docker stack.