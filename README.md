## Uni Asset App (Snipe-IT-inspired)

MVP web app for **university lab desktop units**:

- **Units** with specs (terminal #, IP, serial, dept, location)
- **Transactional check-out / check-in** with an **append-only audit log**
- **QR code unit pages** (scan -> unit detail)
- **Work orders + append-only work log entries** (repair/pullout/deploy/notes)

Tech: **Next.js (App Router) + TypeScript + Tailwind + Prisma + PostgreSQL**. Optional **Firebase Auth**.

## Prereqs

- Install **Node.js LTS** (includes `node` + `npm`)
- Install Docker Desktop (optional, for local Postgres)

## Setup (local)

From `d:\htdocs\snipe-it-2\uni-asset-app`:

1) Copy env file

```bash
copy .env.example .env
```

2) Start Postgres (optional but recommended)

```bash
docker compose up -d
```

3) Install deps

```bash
npm install
```

4) Migrate + seed

```bash
npm run prisma:generate
npm run prisma:migrate
npm run seed
```

5) Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Auth modes

- **Dev bypass (fastest)**: set `DEV_BYPASS_AUTH=true` in `.env`. The server auto-creates a dev user as `UNIVERSITY_ADMIN`.
- **Firebase Auth**: set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` for server-side token verification. API requests should include:
  - `Authorization: Bearer <firebase_id_token>`

## Key endpoints (MVP)

- `GET /api/units` list + filters
- `GET /api/units/:id` unit detail (includes audit + work timelines)
- `POST /api/units/:id/checkout` transactional checkout + audit event
- `POST /api/units/:id/checkin` transactional checkin + audit event
- `POST /api/units/:id/work-orders` create work order + work-log note
- `POST /api/units/:id/work-logs` add work log entry (append-only)

## Notes / next upgrades

- Add real Firebase client login UI and store the ID token for API calls
- Add admin CRUD pages for departments/locations/status labels/models
- Add bulk QR export per lab room/location
- Add real pagination + filters UI (location/department/assigned-to)
- Add integration tests that run against a disposable DB

