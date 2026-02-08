# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cricket Chronicle is an offline-first Progressive Web Application for cricket match management with ball-by-ball scoring. It uses a hierarchical organization model: Province > Club > Division > Team > Player. The project follows SCRUM methodology with the user as Product Owner.

**Current state:** Sprint 3 (Organization Hierarchy Management) planning complete, awaiting development. Phase 1 (Foundation) is done. 38% of MVP complete.

**Anti-amnesia:** Always read `ProjectManagement/project-state.md` at session start for current sprint status, active branch, and task backlog.

## Build & Run Commands

### Full Stack (Docker)
```bash
# Start PostgreSQL + backend (from project root)
docker compose up -d

# Rebuild after backend code changes
docker compose up -d --build backend
```

### Backend Only
```bash
cd backend
npm install
npm run dev              # Start with hot-reload (tsx watch)
npm run build            # TypeScript compile to dist/
npm run start            # Run compiled output
npm test                 # Jest tests
npm run test:coverage    # Jest with coverage report
npm run lint             # ESLint
npm run lint:fix         # ESLint with autofix
```

### Database (Prisma)
```bash
cd backend
npx prisma generate      # Regenerate client after schema changes
npx prisma migrate dev   # Create and apply migration
npx prisma db push       # Push schema without migration (used on test server)
npx prisma studio        # Visual DB browser (http://localhost:5555)
npm run db:seed           # Seed database (tsx prisma/seed.ts)
```

### Frontend
```bash
cd frontend
npm install
npm run dev              # Vite dev server (port 5173 by default)
npm run build            # TypeScript check + Vite production build
npm run preview          # Serve production build locally
npm test                 # Jest tests (jsdom environment)
npm run test:coverage    # Jest with coverage (60% threshold)
npm run test:e2e         # Cypress E2E
npm run test:e2e:headed  # Cypress interactive mode
npm run type-check       # tsc --noEmit
npm run lint             # ESLint
```

## Architecture

### Monorepo Structure
- `backend/` - Express.js REST API with Prisma ORM (TypeScript, Node.js 18+)
- `frontend/` - React 18 PWA with Vite (TypeScript, offline-first with IndexedDB)
- `ProjectManagement/` - SCRUM artifacts, sprint plans, retrospectives
- `Docs/` - SRS, API reference, match logging logic

### Backend API Routes
All routes are prefixed with `/api/`. Routes are defined directly in `backend/src/routes/` (no separate controllers — business logic is in `backend/src/services/`).

| Route | Purpose |
|-------|---------|
| `/api/health` | Health check with DB status |
| `/api/auth` | Register, login, refresh, logout |
| `/api/matches` | Match CRUD with sync tracking |
| `/api/deliveries` | Ball-by-ball scoring |
| `/api/teams` | Team management |
| `/api/competitions` | Competition management |

### API Response Format
```json
{ "success": true, "data": {}, "message": "optional" }
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }
```
Error codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`

### Authentication
- JWT access tokens (1h) + refresh tokens (7d) with rotation
- Middleware chain: `authenticate()` > `authorize(...roles)` or `optionalAuth()`
- Roles: `SUPER_ADMIN`, `PROVINCIAL_ADMIN`, `CLUB_ADMIN`, `SCORER`, `UMPIRE`, `PUBLIC`
- Frontend: axios interceptors auto-refresh tokens on 401; failed refresh triggers logout

### Offline-First Architecture
- **IndexedDB** via Dexie.js stores matches and deliveries locally
- Each record has `localId` (UUID), `syncStatus` (PENDING/SYNCING/SYNCED/FAILED/CONFLICT)
- `syncService` detects online/offline and batch-syncs queued records
- Server uses version numbers for conflict detection

### Frontend State
- **Redux Toolkit** for global state
- **AuthContext** / **ToastContext** for cross-cutting concerns
- **Path aliases** configured: `@/*`, `@components/*`, `@services/*`, etc.
- No router — views are toggled via state in `App.tsx` (`list`, `setup`, `scoring`, `test`)

### Database
PostgreSQL 14+ via Prisma. Schema at `backend/prisma/schema.prisma`. Tables use `@@map` for snake_case naming. Key domain enums: `MatchFormat`, `WicketType`, `ExtraType`, `BattingStyle`, `BowlingStyle`. All sync-aware models include `syncStatus`, `lastSyncedAt`, `createdOffline` fields.

## Development Patterns

### Adding a New API Endpoint
1. Add Zod validation schemas in the route file (`backend/src/routes/`)
2. Create service functions in `backend/src/services/`
3. Use `ApiError` class from `backend/src/middleware/errorHandler.ts` for errors
4. Apply `authenticate` and `authorize` middleware as needed
5. Prisma client singleton at `backend/src/config/database.ts`

### Sprint Branching
- `main` — production-ready
- `sprint-N/feature-name` — sprint development branches (e.g., `sprint-3/organization-hierarchy`)
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

## Environment Configuration
Copy `.env.example` to `.env` at the project root. Key variables:
- `DATABASE_URL` — Prisma connection string
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — Auth tokens (min 32 chars)
- `CORS_ORIGIN` — Frontend URL (default `http://localhost:5173`)
- `API_PORT` — Backend port (default `3001`)
- `DB_PORT` — PostgreSQL port (default `5433` mapped to container's `5432`)

Frontend env: `frontend/.env.development` with `VITE_API_URL` pointing to the backend.

## Test Server
- Backend API: `http://192.168.1.235:3001`
- Frontend: `http://192.168.1.235:3000` (Vite dev server)
- PostgreSQL: `192.168.1.235:5432`
- Deployment uses GitHub clone + Docker Compose on the test server
