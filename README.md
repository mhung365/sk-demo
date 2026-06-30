# sk-demo — Location Booking API

NestJS REST API for managing a hierarchical location tree and room bookings. Built for the sk-demo assignment: reviewers can clone, configure, migrate, seed, and exercise the API without guessing setup steps.

## Stack

| Component | Version |
| --- | --- |
| Node.js | ≥ 22.0.0 |
| NestJS | 11.x |
| TypeORM | 0.3.30 |
| PostgreSQL | 16 (Docker) |
| Luxon | 3.x (timezone / open-hours) |

**Prerequisites:** Node.js 22+, npm, Docker, and Docker Compose.

## Repository delivery

Publish this project on a **personal GitHub repository** and share the URL with your reviewer. After cloning:

```bash
git clone <your-github-repo-url>
cd sk-demo
```

To set the remote on an existing local copy:

```bash
git remote add origin <your-github-repo-url>
git push -u origin main
```

## Quick start (recommended — Postgres in Docker, API on host)

Migrations and seed data are **not** run automatically by Docker Compose. Run them once after Postgres is up.

```bash
cp .env.example .env
docker compose up -d postgres          # wait until Postgres is healthy on :5432
npm install
npm run migration:run
npm run seed
npm run start:dev                      # API at http://localhost:3000
```

Verify the API is running:

```bash
curl -s http://localhost:3000/health
# {"status":"ok","database":"up"}
```

## Optional: full Docker Compose (Postgres + API container)

```bash
cp .env.example .env
docker compose up -d                     # or: docker compose up
```

The `api` service runs `npm run start:dev` with the repo bind-mounted. **You still must run migrations and seed manually** before first use (from the host, with `.env` pointing at `localhost:5432`):

```bash
npm install
npm run migration:run
npm run seed
```

Then call `http://localhost:3000` as usual.

## Environment variables

Copy `.env.example` to `.env`. NestJS `ConfigModule` loads `.env` from the project root.

| Variable | Required | Default / example | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | `postgresql://postgres:postgres@localhost:5432/sk_demo` | PostgreSQL connection (TypeORM) |
| `APP_TIMEZONE` | No | `Asia/Singapore` | Open-hours evaluation (Luxon); falls back in `BookingsService` |
| `PORT` | No | `3000` | HTTP listen port; falls back in `main.ts` |
| `NODE_ENV` | No | `development` | Standard Node/Nest convention |

When using the `api` Docker service, Compose overrides `DATABASE_URL` to reach the `postgres` hostname inside the network. For host-run API + Docker Postgres, keep the `localhost` URL from `.env.example`.

## npm scripts

| Script | Description |
| --- | --- |
| `npm run migration:run` | Apply TypeORM migrations |
| `npm run migration:revert` | Revert last migration |
| `npm run migration:show` | Show migration status |
| `npm run seed` | Load assignment sample location tree (idempotent; skips if `A` exists) |
| `npm run start:dev` | Start API with watch mode (local dev) |
| `npm test` | Unit tests (`src/**/*.spec.ts`) |
| `npm run test:e2e` | E2E tests (requires Postgres + migrations; uses `.env` `DATABASE_URL`) |

## API reference

Base URL: `http://localhost:3000`

### Health

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness + database connectivity |

### Locations

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/locations` | Create location (optional `parentId`, bookable fields) |
| `GET` | `/locations` | Flat list; optional `?parentId=<uuid>` |
| `GET` | `/locations/tree` | Nested JSON tree |
| `GET` | `/locations/:id` | By UUID |
| `GET` | `/locations/by-number/:locationNumber` | By business key (e.g. `A-01-01`) |
| `PATCH` | `/locations/:id` | Update name, department, capacity, open hours |
| `DELETE` | `/locations/:id` | Delete (204); 409 if children or bookings exist |

`PATCH /locations/:id` does **not** retroactively invalidate existing bookings; only new bookings use the updated configuration.

`openHours` accepts structured JSON (`type`, `days`, `startTime`, `endTime`) or a boundary label object (`{ "label": "Mon–Fri 9AM–6PM" }`).

### Bookings

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/bookings` | Create booking (full validation pipeline) |
| `GET` | `/bookings/:id` | Single booking by UUID |
| `GET` | `/bookings` | List; optional `?locationId=&from=&to=` (ISO datetimes) |

Booking validation order: resolve location + bookability → department match → capacity → open hours → overlap check (transaction + row lock).

Authentication is out of scope for this API.

## Demo flow (seeded data)

After `npm run seed`, notable locations include:

| `locationNumber` | Name | Notes |
| --- | --- | --- |
| `A` | Building A | Structural; not bookable |
| `A-01-01` | Meeting Room 1 | `EFM`, capacity 10, Mon–Fri 09:00–18:00 |
| `B-05-11` | Utility Room | `ASS`, capacity 30, always open |

### 1. Read location tree

```bash
curl -s http://localhost:3000/locations/tree | jq .
```

### 2. Resolve a bookable room by number

```bash
curl -s http://localhost:3000/locations/by-number/A-01-01 | jq .
```

### 3. Create a valid booking

Use a **weekday** within open hours (example: Tuesday 2026-06-30, 10:00–11:00 SGT):

```bash
ROOM_ID=$(curl -s http://localhost:3000/locations/by-number/A-01-01 | jq -r .id)

curl -s -X POST http://localhost:3000/bookings \
  -H 'Content-Type: application/json' \
  -d "{
    \"locationId\": \"$ROOM_ID\",
    \"department\": \"EFM\",
    \"attendeeCount\": 5,
    \"startAt\": \"2026-06-30T10:00:00+08:00\",
    \"endAt\": \"2026-06-30T11:00:00+08:00\",
    \"bookedBy\": \"reviewer-demo\"
  }" | jq .
```

### 4. Get booking by id

```bash
BOOKING_ID=<uuid-from-create-response>
curl -s "http://localhost:3000/bookings/$BOOKING_ID" | jq .
```

### 5. List bookings (with filter)

```bash
curl -s "http://localhost:3000/bookings?locationId=$ROOM_ID" | jq .
```

### 6. Create a location

```bash
curl -s -X POST http://localhost:3000/locations \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Demo Floor",
    "locationNumber": "DEMO-01"
  }' | jq .
```

### 7. Update a location (open-hours label)

```bash
LOCATION_ID=<uuid-from-step-6>
curl -s -X PATCH "http://localhost:3000/locations/$LOCATION_ID" \
  -H 'Content-Type: application/json' \
  -d '{
    "department": "EFM",
    "capacity": 8,
    "openHours": { "label": "Mon–Fri 9AM–6PM" }
  }' | jq .
```

### 8. Delete a location (when safe)

Only succeeds when the location has **no children and no bookings** (e.g. the `DEMO-01` node above):

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X DELETE "http://localhost:3000/locations/$LOCATION_ID"
# 204
```

## Domain error codes

Errors return JSON: `{ "statusCode", "error", "message", "code?", "details?" }`.

| Code | HTTP | When |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | DTO validation failure |
| `LOCATION_NOT_FOUND` | 404 | Unknown location id or number |
| `BOOKING_NOT_FOUND` | 404 | Unknown booking id |
| `BOOKING_OVERLAP` | 409 | Half-open interval overlap |
| `LOCATION_HAS_CHILDREN` | 409 | Delete blocked — has child locations |
| `LOCATION_HAS_BOOKINGS` | 409 | Delete blocked — has bookings |
| `LOCATION_NOT_BOOKABLE` | 422 | Booking on structural or incomplete room |
| `DEPARTMENT_MISMATCH` | 422 | Request department ≠ room department |
| `CAPACITY_EXCEEDED` | 422 | `attendeeCount` > room capacity |
| `OUTSIDE_OPEN_HOURS` | 422 | Outside allowed days/times |

## Testing

```bash
npm test           # unit tests
npm run test:e2e   # integration tests against Postgres
```

E2E tests expect a running database with migrations applied (same `DATABASE_URL` as `.env`).

## Further reading

- [`docs/system-design.md`](docs/system-design.md) — components, validation pipeline, design decisions
- [`docs/database-design.md`](docs/database-design.md) — schema, relationships, migrations

## Project layout

```
src/
  bookings/       # Booking create + query
  locations/      # Location CRUD + tree
  health/         # Health check
  database/       # Migrations, seed, TypeORM data source
  common/         # Shared filters, enums, utilities
test/             # E2E specs
```
