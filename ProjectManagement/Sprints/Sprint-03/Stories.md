# Sprint 3 User Stories — Organization Hierarchy Management

**Sprint:** 3
**Date:** 2026-02-26
**Branch:** sprint-3/integration

---

## PBI-201: Province Management — CRUD API + Frontend

**Story Points:** 5
**Priority:** Must Have
**Status:** In Progress

### User Story
As a Provincial Admin, I want to create and manage provinces in the system, so that clubs and divisions can be organised under the correct provincial structure.

### Acceptance Criteria

- [ ] AC-201-1: GET /api/provinces returns a list of all provinces, filterable by status (ACTIVE/INACTIVE)
- [ ] AC-201-2: POST /api/provinces creates a province; name is required; returns 400 if name is missing
- [ ] AC-201-3: GET /api/provinces/:id returns a single province; returns 404 if not found
- [ ] AC-201-4: PUT /api/provinces/:id updates a province; returns 404 if not found
- [ ] AC-201-5: DELETE /api/provinces/:id soft-deletes (sets status=INACTIVE); returns 404 if not found
- [ ] AC-201-6: All endpoints require JWT authentication (401 if no valid token)
- [ ] AC-201-7: ProvincesPage.tsx renders a list of provinces with name, regionCode, country, status
- [ ] AC-201-8: ProvincesPage.tsx has an "Add Province" button that opens a modal form
- [ ] AC-201-9: Edit and Delete actions are available per row
- [ ] AC-201-10: Navigation sidebar includes "Provinces" link under "Organisation" group

### Technical Notes
- Province model fields: name, regionCode, country, contactName, contactEmail, contactPhone, status
- No unique constraint on name (province name could exist in different contexts)

---

## PBI-202: Club Management — CRUD API + Frontend (with venue)

**Story Points:** 8
**Priority:** Must Have
**Status:** In Progress

### User Story
As a Club Admin, I want to register and manage my cricket club including venue details, so that teams can be assigned to a club and matches can reference the home ground.

### Acceptance Criteria

- [ ] AC-202-1: GET /api/clubs returns all clubs; filterable by provinceId and status
- [ ] AC-202-2: POST /api/clubs creates a club; name and provinceId are required; returns 400 if missing
- [ ] AC-202-3: POST /api/clubs returns 404 if provinceId does not exist
- [ ] AC-202-4: GET /api/clubs/:id returns a single club including province details
- [ ] AC-202-5: PUT /api/clubs/:id updates a club; validates provinceId exists if changing
- [ ] AC-202-6: DELETE /api/clubs/:id soft-deletes (sets status=INACTIVE)
- [ ] AC-202-7: GPS coordinates (gpsLat, gpsLong) are validated: lat in [-90, 90], long in [-180, 180] if provided
- [ ] AC-202-8: All endpoints require JWT authentication
- [ ] AC-202-9: ClubsPage.tsx renders a list of clubs with name, province name, home ground, status
- [ ] AC-202-10: Province filter dropdown on ClubsPage to filter by province
- [ ] AC-202-11: Add/Edit modal includes all venue fields (homeGround, gpsLat, gpsLong, groundCapacity, facilities)
- [ ] AC-202-12: Navigation sidebar includes "Clubs" link under "Organisation" group

### Technical Notes
- Club model fields: name, provinceId, homeGround, gpsLat, gpsLong, groundCapacity, facilities, pocName, pocEmail, pocPhone, logoUrl, status
- Province must exist before a club can be created under it

---

## PBI-203: Division Management — CRUD API + Frontend

**Story Points:** 5
**Priority:** Must Have
**Status:** In Progress

### User Story
As a Provincial Admin, I want to define divisions within my province, so that teams can be assigned to the correct competition tier, age group, and gender category.

### Acceptance Criteria

- [ ] AC-203-1: GET /api/divisions returns all divisions; filterable by provinceId, ageGroup, gender
- [ ] AC-203-2: POST /api/divisions creates a division; name, provinceId, and rankLevel are required
- [ ] AC-203-3: POST /api/divisions returns 404 if provinceId does not exist
- [ ] AC-203-4: GET /api/divisions/:id returns a single division including province details
- [ ] AC-203-5: PUT /api/divisions/:id updates a division
- [ ] AC-203-6: DELETE /api/divisions/:id soft-deletes (sets status=INACTIVE)
- [ ] AC-203-7: All endpoints require JWT authentication
- [ ] AC-203-8: DivisionsPage.tsx renders divisions with name, province, ageGroup, gender, rankLevel, status
- [ ] AC-203-9: Filter controls for province, age group, gender on DivisionsPage
- [ ] AC-203-10: Navigation sidebar includes "Divisions" link under "Organisation" group

### Technical Notes
- Division model fields: name, provinceId, rankLevel (Int), ageGroup (SENIOR/U19/U17/U15/U13), gender (MEN/WOMEN/MIXED), status
- rankLevel = 1 is the top/premier division in that province; higher numbers are lower tiers

---

## PBI-204: Team Management — Enhance Existing + Captain Assignment

**Story Points:** 8
**Priority:** Must Have
**Status:** In Progress

### User Story
As a Club Admin, I want to create and manage teams under my club, and assign a captain and vice-captain from the squad, so that match setup can reference the correct team leadership.

### Acceptance Criteria

- [ ] AC-204-1: POST /api/teams creates a team; label and clubId and divisionId are required
- [ ] AC-204-2: POST /api/teams returns 409 if label+clubId combination already exists as ACTIVE
- [ ] AC-204-3: PUT /api/teams/:id updates a team; validates uniqueness of label+clubId if changing
- [ ] AC-204-4: DELETE /api/teams/:id soft-deletes (sets status=INACTIVE)
- [ ] AC-204-5: GET /api/teams and GET /api/teams/:id include club and division details in response
- [ ] AC-204-6: PATCH /api/teams/:id/captain accepts { captainId, viceCaptainId }
- [ ] AC-204-7: PATCH /api/teams/:id/captain returns 400 if captainId does not belong to the team
- [ ] AC-204-8: PATCH /api/teams/:id/captain returns 400 if viceCaptainId does not belong to the team
- [ ] AC-204-9: PATCH /api/teams/:id/captain allows viceCaptainId to be null (removes vice-captain)
- [ ] AC-204-10: All new/modified endpoints require JWT authentication
- [ ] AC-204-11: TeamsPage.tsx enhanced to show captain name and vice-captain name if assigned
- [ ] AC-204-12: TeamsPage.tsx has captain assignment UI (button that opens player selector modal)
- [ ] AC-204-13: Navigation sidebar includes "Teams" link under "Organisation" group

### Technical Notes
- Team model fields: label, clubId, divisionId, pocName, pocEmail, pocPhone, captainId, viceCaptainId, maxSquadSize, status
- "label" is the team designation (e.g., "1st XI", "2nd XI", "U19 A")
- Full team name derived as "{club.name} {label}" — not stored in DB

---

## PBI-205a: Player Management — CRUD + Roster View

**Story Points:** 8
**Priority:** Must Have
**Status:** In Progress
**Deferred from this story:** PBI-205b (Player transfers + history) — Sprint 4

### User Story
As a Club Admin, I want to register players and manage the team roster, so that I can track player details, assign jersey numbers, and view the squad for any team.

### Acceptance Criteria

- [ ] AC-205-1: GET /api/players returns all players; filterable by teamId, playingStatus, primaryRole; supports name search
- [ ] AC-205-2: POST /api/players creates a player; firstName and lastName are required
- [ ] AC-205-3: POST /api/players auto-generates registrationId (UUID format) if not provided
- [ ] AC-205-4: POST /api/players returns 409 if registrationId is explicitly provided and already exists
- [ ] AC-205-5: POST /api/players returns 409 if jerseyNumber is already used by another ACTIVE player on the same team
- [ ] AC-205-6: POST /api/players returns 400 if dateOfBirth is in the future
- [ ] AC-205-7: GET /api/players/:id returns a single player including team and team.club details
- [ ] AC-205-8: PUT /api/players/:id updates a player; re-validates jersey number uniqueness if changing
- [ ] AC-205-9: DELETE /api/players/:id soft-deletes (sets playingStatus=RETIRED)
- [ ] AC-205-10: All endpoints require JWT authentication
- [ ] AC-205-11: PlayersPage.tsx renders players with name, jerseyNumber, primaryRole, battingStyle, bowlingStyle, team, status
- [ ] AC-205-12: PlayersPage.tsx has filters for team, role, playing status, and name search input
- [ ] AC-205-13: PlayersPage.tsx supports a roster sub-view (list filtered by selected team)
- [ ] AC-205-14: Navigation sidebar includes "Players" link under "Organisation" group

### Technical Notes
- Player model fields: firstName, lastName, dateOfBirth, photoUrl, email, phone, jerseyNumber, battingStyle, bowlingStyle, primaryRole, teamId, registrationId, playingStatus
- registrationId is globally unique across all players
- Jersey number uniqueness is per-team only (same jersey number can exist on different teams)
- Soft delete sets playingStatus = RETIRED (not a Status enum — use PlayingStatus enum)
- Transfers (moving players between teams) are deferred to Sprint 4 (PBI-205b)

---

## Cross-Cutting Concerns

### Navigation (All Stories)
- An "Organisation" section is added to the application sidebar/navigation
- Links: Provinces, Clubs, Divisions, Teams, Players
- Navigation follows the existing pattern in App.tsx (view state management)

### Error Handling (All Stories)
- All validation errors return 400 with code `VALIDATION_ERROR` and a details array
- Not found errors return 404 with code `NOT_FOUND`
- Conflict errors (uniqueness) return 409 with code `CONFLICT`
- All errors go through `ApiError` from `backend/src/middleware/errorHandler.ts`

### JSDoc Comments (Retrospective A1)
- All 5 route files include JSDoc/Swagger-style comments on every endpoint
- Parameter types, response formats, and error conditions documented inline

---

*Stories document created by: Developer Agent (Claude) | Date: 2026-02-26*
