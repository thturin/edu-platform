# Lab Creator

The Lab Creator project provides two pieces: a React UI for building lab blocks and a Node/Express API that stores labs, tracks student sessions, and performs AI-assisted grading via OpenAI and DeepSeek. This repo can run standalone or be orchestrated via the parent `edu-platform` Docker Compose stack.

***The client/ (frontend) has not been updated for some time and is not used by the portal repository. 


## Repository layout

```
lab-creator/
├── client/          # React lab builder and previewer
├── server/          # Express API + Prisma models + grading controllers
└── start.sh         # Helper script used by Docker Compose
```

## Feature highlights

- Block-based lab authoring with autosave and preview workflows.
- Session tracking: captures each student's responses and final grades per lab.
- AI grading pipeline that calls DeepSeek first and falls back to OpenAI when needed.
- Secure asset uploads (images, reference files) served via `/images`.
- REST API consumed by the portal to fetch labs, save sessions, and trigger grading.

## Tech stack

- **Client:** React 18 (CRA), React Router, React Quill, TailwindCSS, Axios.
- **API:** Node 18+, Express 5, Prisma ORM, Multer for uploads, OpenAI SDK.
- **Data:** PostgreSQL for labs/sessions; Docker Compose or Railway for hosting.

## Prerequisites

- Node.js 18+ and npm 9+.
- PostgreSQL instance reachable from the API.
- OpenAI and DeepSeek API keys for grading models.
- (Optional) Portal API URL so previews can navigate back to the main app.

## Environment variables

Create `lab-creator/.env` (or configure the same values on your platform). Never commit secrets.

### API (`server/.env`)

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma/Postgres connection string with the lab DB schema. |
| `SERVER_PORT` | Port the API listens on (defaults to 4000). |
| `CLIENT_URL` | Allowed origin for the React lab builder (needed for CORS). |
| `OPENAI_API_KEY` | Token used when falling back to OpenAI for grading. |
| `DEEPSEEK_API_KEY` | Primary key for DeepSeek grading. |
| `NODE_ENV` | Optional `development`/`production` flag for logging and cookies. |

### Client (`client/.env`)

| Name | Purpose |
| --- | --- |
| `REACT_APP_SERVER_HOST` | Fully-qualified API base URL (e.g., `http://localhost:4000/api`). |
| `REACT_APP_CLIENT_PORTAL_HOST` | Portal client URL for cross-links (optional but recommended). |

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

```bash
# Terminal 1 – API
cd server
cp .env.example .env   # if provided
npx prisma migrate dev
npm run dev

# Terminal 2 – React builder
cd client
cp .env.example .env
npm start
```

- Ensure `DATABASE_URL` points to a running Postgres instance.
- Set both AI keys to enable grading; without them only storage endpoints will work.
- When running inside the parent Docker Compose stack, these services are exposed on ports 14000 (API) and 13001 (client).

## Database & migrations

- Update `server/prisma/schema.prisma` whenever you adjust Session/Lab models.
- `npx prisma migrate dev` – create/apply dev migrations.
- `npx prisma migrate deploy` – run migrations in production (Railway, etc.).

## API surface (high-level)

| Route | Verb | Description |
| --- | --- | --- |
| `/api/lab/*` | CRUD endpoints for labs linked to portal assignments. |
| `/api/session/*` | Upsert and fetch student sessions tied to labs. |
| `/api/grade/*` | Grade submissions using DeepSeek/OpenAI and persist scores. |
| `/api/uploads/*` | Asset upload endpoints used by the builder (images, etc.). |
| `/health` | Simple readiness check. |

See the route files under `server/routes/` for exact contracts and payload shapes.

## Deployment

- **API** – Deploy to Railway/Render. Provide all environment variables, run `npx prisma migrate deploy`, and ensure outbound internet access is allowed for AI providers.
- **Client** – Deploy to Netlify (or similar) with `npm run build`. Remember to place `_redirects` containing `/* /index.html 200` before building so SPA routes resolve.
- **CORS** – Keep `CLIENT_URL` and `REACT_APP_SERVER_HOST` in sync. The API already allows the Docker hostnames used in Compose; add your production domains as needed.

## Troubleshooting

- **Unauthorized AI calls** – Verify both `OPENAI_API_KEY` and `DEEPSEEK_API_KEY` are set in the API environment.
- **CORS errors** – Confirm `CLIENT_URL` matches the origin of the lab builder UI and that the client sends `withCredentials` when necessary.
- **Uploads fail** – The `uploads/` directory must exist and be writable by the API process. Files are served back via `/images/<filename>`.

With this README, contributors should be able to run and deploy the Lab Creator independently while still integrating smoothly with the main portal.