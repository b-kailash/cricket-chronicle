# Sprint 3 Plan — Organization Hierarchy Management

**Sprint Number:** 3
**Sprint Goal:** Implement Organization Hierarchy Management — Province, Club, Division, Team, and Player CRUD — establishing the foundational data structure required for match creation.
**Status:** In Progress
**Dates:** 2026-02-26 to TBD (3 sessions)
**Branch:** sprint-3/integration

---

## Sprint Team

- **Product Owner:** User (approved scope)
- **Developer:** Claude (Developer Agent)
- **Tester:** Claude (Tester Agent) — Session 3

---

## Sprint Goal

Deliver full CRUD management for the five core organizational entities (Province, Club, Division, Team, Player) with backend REST APIs and frontend management pages. This establishes the foundational data structure required for match creation in Sprint 4.

---

## Stories Selected

| Story ID | Description | Story Points | Status |
|----------|-------------|--------------|--------|
| PBI-201 | Province Management — CRUD API + Frontend | 5 | In Progress |
| PBI-202 | Club Management — CRUD API + Frontend (with venue) | 8 | In Progress |
| PBI-203 | Division Management — CRUD API + Frontend | 5 | In Progress |
| PBI-204 | Team Management — enhance existing + captain assignment endpoint | 8 | In Progress |
| PBI-205a | Player Management — CRUD + roster view (transfers deferred to Sprint 4) | 8 | In Progress |

**Total Story Points:** 34
**Deferred:** PBI-205b (Player transfers + history) — Sprint 4

---

## Architecture Decisions (Pre-approved)

1. **Database schema is complete** — Province, Club, Division, Team, Player models exist in `backend/prisma/schema.prisma`. No new migrations needed.
2. **Captain assignment** — Separate PATCH endpoint (`PATCH /teams/:id/captain`) after players are on the roster, not at team creation time.
3. **Soft delete pattern** — All deletes set `status = INACTIVE` (or `playingStatus = RETIRED` for players). No hard deletes.
4. **Auto-generate player registrationId** — UUID or `REG-` prefixed sequential ID if not supplied.
5. **Jersey number uniqueness** — Scoped per team (not global).
6. **Navigation group "Organisation"** — Added to the sidebar: Provinces → Clubs → Divisions → Teams → Players.

---

## What Already Exists (Not Recreated)

- `backend/src/routes/teams.ts` — partial team routes, extended
- `backend/src/routes/competitions.ts` — untouched
- `backend/prisma/schema.prisma` — fully defined, not altered
- `backend/src/middleware/auth.ts` — JWT middleware applied to all new routes
- `backend/src/middleware/errorHandler.ts` — used for consistent error responses
- `backend/src/config/database.ts` — Prisma client, imported
- Frontend auth, toast, offline queue, API client — all working from Sprint 2

---

## API Endpoints Delivered

### Provinces (PBI-201)
- `GET  /api/provinces` — list all (filter: status)
- `POST /api/provinces` — create (name required)
- `GET  /api/provinces/:id` — get one
- `PUT  /api/provinces/:id` — update
- `DELETE /api/provinces/:id` — soft delete (status=INACTIVE)

### Clubs (PBI-202)
- `GET  /api/clubs` — list all (filter: provinceId, status)
- `POST /api/clubs` — create (name, provinceId required)
- `GET  /api/clubs/:id` — get one (include province)
- `PUT  /api/clubs/:id` — update
- `DELETE /api/clubs/:id` — soft delete
- Validates: provinceId exists; GPS coords in valid range if provided

### Divisions (PBI-203)
- `GET  /api/divisions` — list all (filter: provinceId, ageGroup, gender)
- `POST /api/divisions` — create (name, provinceId, rankLevel required)
- `GET  /api/divisions/:id` — get one (include province)
- `PUT  /api/divisions/:id` — update
- `DELETE /api/divisions/:id` — soft delete

### Teams (PBI-204)
- Existing GET routes enhanced (include club, division in responses)
- `POST /api/teams` — create team
- `PUT  /api/teams/:id` — update team
- `DELETE /api/teams/:id` — soft delete
- `PATCH /api/teams/:id/captain` — assign captain and vice-captain
- Validates: label+clubId combination is unique; captain/vice-captain must belong to team

### Players (PBI-205a)
- `GET  /api/players` — list all (filter: teamId, playingStatus, primaryRole, search by name)
- `POST /api/players` — create (firstName, lastName required; teamId optional; auto-generate registrationId)
- `GET  /api/players/:id` — get one (include team, team.club)
- `PUT  /api/players/:id` — update
- `DELETE /api/players/:id` — soft delete (playingStatus=RETIRED)
- Validates: jerseyNumber unique within teamId; dateOfBirth in past; registrationId unique

---

## Frontend Pages Delivered

- `ProvincesPage.tsx` — list + add/edit modal + soft delete
- `ClubsPage.tsx` — list + province filter dropdown + add/edit modal
- `DivisionsPage.tsx` — list + province/ageGroup/gender filters + add/edit modal
- `TeamsPage.tsx` — enhanced list + captain assignment UI + add/edit modal
- `PlayersPage.tsx` — list + team filter + role filter + name search + roster sub-view

### Services
- `provinceService.ts`
- `clubService.ts`
- `divisionService.ts`
- `playerService.ts`
- `teamService.ts` (extended)

---

## Definition of Done

For each story to be marked Done:
- [ ] Backend route file created with all CRUD endpoints
- [ ] Route registered in index.ts
- [ ] All endpoints protected by JWT middleware
- [ ] Input validation with appropriate error codes (400, 404, 409)
- [ ] JSDoc/Swagger comments on all route handlers (Retrospective A1)
- [ ] Frontend service file created
- [ ] Frontend page component created (list + form + delete)
- [ ] Navigation link added under "Organisation" group
- [ ] Manually verified against running backend
- [ ] Test plan entries written in TestPlan.md

---

## Retrospective Action Items (Carry-in from Sprint 2)

| ID | Action | Owner | Status |
|----|--------|-------|--------|
| A1 | Add JSDoc/Swagger comments to all new route files | Developer | In Progress |
| A3 | Add `resetOrganisationData()` to `backend/prisma/seed.ts` | Developer | In Progress |

---

## Session Structure

- **Session 1** (2026-02-26): Sprint Planning + Full Development (this session)
- **Session 2**: Continuation / overflow development (if needed)
- **Session 3**: Testing + Retrospective

---

## Risks & Dependencies

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| 34 SP is ambitious for one session | Medium | Focus on backend API first; frontend pages follow established patterns |
| Captain assignment requires players to exist first | Low | Handled as separate PATCH endpoint, not at creation time |
| Jersey uniqueness constraint | Low | Enforced in API validation layer, not DB constraint |
| Docker/DB connectivity for testing | Low | Use existing Docker setup from Sprint 1 |

---

*Sprint Plan created by: Developer Agent (Claude) | Date: 2026-02-26*
