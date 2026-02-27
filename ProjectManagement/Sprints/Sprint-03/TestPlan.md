# Sprint 3 Test Plan — Organization Hierarchy Management

**Sprint:** 3
**Date Created:** 2026-02-26
**Tester:** Claude (Tester Agent) — Session 3
**Branch:** sprint-3/integration

---

## Test Environment

- **Backend URL:** http://localhost:3001 (or http://192.168.1.235:3001)
- **Frontend URL:** http://localhost:3000 (or http://192.168.1.235:3000)
- **Database:** PostgreSQL (Docker container cricket-db)
- **Auth:** JWT — obtain token via POST /api/auth/login before running protected tests

### Test User Credentials
```
Email: admin@cricket.com
Password: password123
```

### Setup Command
```bash
# Start services
cd /home/bkailash/dev/cricket-chronicle
docker-compose up -d

# Seed test data
cd backend
npx ts-node prisma/seed.ts
```

---

## Test Suite: PBI-201 Province Management

### T-201-01: List Provinces (Happy Path)
- **AC Reference:** AC-201-1
- **Status:** [ ] Pass  [ ] Fail
- **Prerequisites:** At least one ACTIVE province exists in DB (from seed)
- **Steps:**
  1. `GET /api/provinces` with valid JWT
- **Expected:** 200 OK, `{ success: true, data: [...] }` with array of provinces

### T-201-02: List Provinces — Filter by Status
- **AC Reference:** AC-201-1
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `GET /api/provinces?status=INACTIVE` with valid JWT
- **Expected:** 200 OK, only INACTIVE provinces returned (or empty array)

### T-201-03: Create Province (Happy Path)
- **AC Reference:** AC-201-2
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `POST /api/provinces` with `{ "name": "Test Province", "regionCode": "TP" }` and valid JWT
- **Expected:** 201 Created, `{ success: true, data: { id: <number>, name: "Test Province", ... } }`

### T-201-04: Create Province — Missing Name
- **AC Reference:** AC-201-2
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `POST /api/provinces` with `{}` and valid JWT
- **Expected:** 400 Bad Request, `{ success: false, error: { code: "VALIDATION_ERROR", ... } }`

### T-201-05: Get Province by ID (Happy Path)
- **AC Reference:** AC-201-3
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `GET /api/provinces/1` with valid JWT (use ID from T-201-03 or seed)
- **Expected:** 200 OK, single province object

### T-201-06: Get Province — Not Found
- **AC Reference:** AC-201-3
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `GET /api/provinces/999999` with valid JWT
- **Expected:** 404 Not Found, `{ success: false, error: { code: "NOT_FOUND", ... } }`

### T-201-07: Update Province
- **AC Reference:** AC-201-4
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `PUT /api/provinces/:id` with `{ "contactEmail": "admin@province.com" }` and valid JWT
- **Expected:** 200 OK, updated province returned

### T-201-08: Soft Delete Province
- **AC Reference:** AC-201-5
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `DELETE /api/provinces/:id` (use the province created in T-201-03) with valid JWT
- **Expected:** 200 OK, province has `status: "INACTIVE"` — record still exists in DB

### T-201-09: Unauthenticated Access Rejected
- **AC Reference:** AC-201-6
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `GET /api/provinces` without Authorization header
- **Expected:** 401 Unauthorized

---

## Test Suite: PBI-202 Club Management

### T-202-01: Create Club (Happy Path)
- **AC Reference:** AC-202-2
- **Status:** [ ] Pass  [ ] Fail
- **Prerequisites:** A province exists (provinceId from seed)
- **Steps:**
  1. `POST /api/clubs` with `{ "name": "Test CC", "provinceId": 1 }` and valid JWT
- **Expected:** 201 Created, club with province details

### T-202-02: Create Club — Missing provinceId
- **AC Reference:** AC-202-2
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `POST /api/clubs` with `{ "name": "No Province Club" }` and valid JWT
- **Expected:** 400 Bad Request, VALIDATION_ERROR

### T-202-03: Create Club — Invalid provinceId
- **AC Reference:** AC-202-3
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `POST /api/clubs` with `{ "name": "Bad Club", "provinceId": 999999 }` and valid JWT
- **Expected:** 404 Not Found, province not found message

### T-202-04: GPS Validation — Valid Coordinates
- **AC Reference:** AC-202-7
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `POST /api/clubs` with valid `gpsLat: -26.2041` and `gpsLong: 28.0473` and valid JWT
- **Expected:** 201 Created

### T-202-05: GPS Validation — Invalid Latitude
- **AC Reference:** AC-202-7
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `POST /api/clubs` with `gpsLat: 95.0` (out of range) and valid JWT
- **Expected:** 400 Bad Request, VALIDATION_ERROR

### T-202-06: List Clubs — Filter by Province
- **AC Reference:** AC-202-1
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `GET /api/clubs?provinceId=1` with valid JWT
- **Expected:** 200 OK, only clubs in province 1 returned

### T-202-07: Get Club — Includes Province
- **AC Reference:** AC-202-4
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `GET /api/clubs/:id` with valid JWT
- **Expected:** 200 OK, club has nested `province: { id, name }` object

### T-202-08: Soft Delete Club
- **AC Reference:** AC-202-6
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `DELETE /api/clubs/:id` with valid JWT
- **Expected:** 200 OK, club status = INACTIVE, record still in DB

---

## Test Suite: PBI-203 Division Management

### T-203-01: Create Division (Happy Path)
- **AC Reference:** AC-203-2
- **Status:** [ ] Pass  [ ] Fail
- **Prerequisites:** A province exists
- **Steps:**
  1. `POST /api/divisions` with `{ "name": "Premier Division", "provinceId": 1, "rankLevel": 1 }` and valid JWT
- **Expected:** 201 Created, division with province details

### T-203-02: Create Division — Missing rankLevel
- **AC Reference:** AC-203-2
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `POST /api/divisions` with `{ "name": "Test", "provinceId": 1 }` and valid JWT
- **Expected:** 400 Bad Request

### T-203-03: Create Division — Invalid provinceId
- **AC Reference:** AC-203-3
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `POST /api/divisions` with `{ "name": "Test", "provinceId": 999999, "rankLevel": 1 }` and valid JWT
- **Expected:** 404 Not Found

### T-203-04: List Divisions — Filter by AgeGroup
- **AC Reference:** AC-203-1
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `GET /api/divisions?ageGroup=U19` with valid JWT
- **Expected:** 200 OK, only U19 divisions

### T-203-05: List Divisions — Filter by Gender
- **AC Reference:** AC-203-1
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `GET /api/divisions?gender=WOMEN` with valid JWT
- **Expected:** 200 OK, only WOMEN divisions

### T-203-06: Get Division — Includes Province
- **AC Reference:** AC-203-4
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `GET /api/divisions/:id` with valid JWT
- **Expected:** 200 OK, division has nested `province: { id, name }` object

### T-203-07: Soft Delete Division
- **AC Reference:** AC-203-6
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `DELETE /api/divisions/:id` with valid JWT
- **Expected:** 200 OK, status = INACTIVE

---

## Test Suite: PBI-204 Team Management

### T-204-01: Create Team (Happy Path)
- **AC Reference:** AC-204-1
- **Status:** [ ] Pass  [ ] Fail
- **Prerequisites:** Club and Division exist
- **Steps:**
  1. `POST /api/teams` with `{ "label": "1st XI", "clubId": 1, "divisionId": 1 }` and valid JWT
- **Expected:** 201 Created, team with club and division details

### T-204-02: Create Team — Duplicate Label+Club
- **AC Reference:** AC-204-2
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `POST /api/teams` with same label+clubId as an existing ACTIVE team and valid JWT
- **Expected:** 409 Conflict, CONFLICT error code

### T-204-03: Update Team
- **AC Reference:** AC-204-3
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `PUT /api/teams/:id` with `{ "pocEmail": "team@club.com" }` and valid JWT
- **Expected:** 200 OK, updated team

### T-204-04: Soft Delete Team
- **AC Reference:** AC-204-4
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `DELETE /api/teams/:id` with valid JWT
- **Expected:** 200 OK, status = INACTIVE

### T-204-05: Assign Captain (Happy Path)
- **AC Reference:** AC-204-6
- **Status:** [ ] Pass  [ ] Fail
- **Prerequisites:** Team with at least 2 active players
- **Steps:**
  1. `PATCH /api/teams/:id/captain` with `{ "captainId": <playerId>, "viceCaptainId": <playerId2> }` and valid JWT
- **Expected:** 200 OK, team updated with captainId and viceCaptainId

### T-204-06: Assign Captain — Player Not on Team
- **AC Reference:** AC-204-7
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `PATCH /api/teams/:id/captain` with captainId of a player on a DIFFERENT team and valid JWT
- **Expected:** 400 Bad Request

### T-204-07: Assign Captain — Remove Vice Captain
- **AC Reference:** AC-204-9
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `PATCH /api/teams/:id/captain` with `{ "captainId": <id>, "viceCaptainId": null }` and valid JWT
- **Expected:** 200 OK, viceCaptainId set to null

### T-204-08: List Teams — Includes Club and Division
- **AC Reference:** AC-204-5
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `GET /api/teams` with valid JWT
- **Expected:** 200 OK, each team has club and division nested objects

---

## Test Suite: PBI-205a Player Management

### T-205-01: Create Player (Happy Path)
- **AC Reference:** AC-205-2
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `POST /api/players` with `{ "firstName": "John", "lastName": "Smith", "teamId": 1 }` and valid JWT
- **Expected:** 201 Created, player with auto-generated registrationId

### T-205-02: Create Player — Auto-Generate RegistrationId
- **AC Reference:** AC-205-3
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `POST /api/players` without registrationId and valid JWT
- **Expected:** 201 Created, response includes registrationId (UUID format)

### T-205-03: Create Player — Missing Required Fields
- **AC Reference:** AC-205-2
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `POST /api/players` with `{}` and valid JWT
- **Expected:** 400 Bad Request, VALIDATION_ERROR

### T-205-04: Create Player — Duplicate RegistrationId
- **AC Reference:** AC-205-4
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `POST /api/players` with registrationId that already exists and valid JWT
- **Expected:** 409 Conflict

### T-205-05: Create Player — Duplicate Jersey Number (Same Team)
- **AC Reference:** AC-205-5
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. Create player with jerseyNumber=10, teamId=1
  2. Create another player with jerseyNumber=10, teamId=1
- **Expected:** Second request returns 409 Conflict

### T-205-06: Create Player — Same Jersey Number (Different Team)
- **AC Reference:** AC-205-5
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. Create player with jerseyNumber=10, teamId=1
  2. Create player with jerseyNumber=10, teamId=2
- **Expected:** Both succeed (200/201) — jersey uniqueness is per-team only

### T-205-07: Create Player — Future DateOfBirth
- **AC Reference:** AC-205-6
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `POST /api/players` with `dateOfBirth: "2030-01-01"` and valid JWT
- **Expected:** 400 Bad Request, VALIDATION_ERROR

### T-205-08: Get Player — Includes Team and Club
- **AC Reference:** AC-205-7
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `GET /api/players/:id` for a player with teamId set and valid JWT
- **Expected:** 200 OK, player has nested `team: { ..., club: { id, name } }` object

### T-205-09: List Players — Filter by TeamId
- **AC Reference:** AC-205-1
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `GET /api/players?teamId=1` with valid JWT
- **Expected:** 200 OK, only players on team 1

### T-205-10: List Players — Name Search
- **AC Reference:** AC-205-1
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `GET /api/players?search=Smith` with valid JWT
- **Expected:** 200 OK, only players with "Smith" in firstName or lastName

### T-205-11: Soft Delete Player
- **AC Reference:** AC-205-9
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. `DELETE /api/players/:id` with valid JWT
- **Expected:** 200 OK, playingStatus = "RETIRED", record still in DB

---

## Test Suite: Frontend UI Tests

### T-UI-01: Organisation Navigation Visible
- **AC Reference:** AC-201-10, AC-202-12, AC-203-10, AC-204-13, AC-205-14
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. Log in to the application
  2. Observe the navigation/sidebar
- **Expected:** "Organisation" section visible with 5 links: Provinces, Clubs, Divisions, Teams, Players

### T-UI-02: Provinces Page — List and Add
- **AC Reference:** AC-201-7, AC-201-8
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. Navigate to Provinces page
  2. Verify provinces list renders
  3. Click "Add Province", fill in name, submit
- **Expected:** Province appears in list after creation

### T-UI-03: Clubs Page — Province Filter
- **AC Reference:** AC-202-10
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. Navigate to Clubs page
  2. Select a province from the filter dropdown
- **Expected:** Club list filters to only show clubs in selected province

### T-UI-04: Divisions Page — Multiple Filters
- **AC Reference:** AC-203-9
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. Navigate to Divisions page
  2. Apply ageGroup = U19 filter
- **Expected:** Only U19 divisions shown

### T-UI-05: Teams Page — Captain Assignment UI
- **AC Reference:** AC-204-12
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. Navigate to Teams page
  2. Select a team with players
  3. Click "Assign Captain" button
  4. Select captain from player list, submit
- **Expected:** Captain name displayed on team row/detail after assignment

### T-UI-06: Players Page — Roster View
- **AC Reference:** AC-205-13
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. Navigate to Players page
  2. Select a team from the team filter
- **Expected:** Only players for that team displayed (roster view)

### T-UI-07: Players Page — Name Search
- **AC Reference:** AC-205-12
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. Navigate to Players page
  2. Type a partial name in the search input
- **Expected:** Player list filters in real-time to matching names

---

## Test Suite: Retrospective Action Items

### T-A1-01: JSDoc Comments Present on All Route Files
- **AC Reference:** Retrospective A1
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. Review `backend/src/routes/provinces.ts`, `clubs.ts`, `divisions.ts`, `teams.ts`, `players.ts`
  2. Verify each route handler has a JSDoc comment block
- **Expected:** All 25+ route handlers have JSDoc comments with parameter/response documentation

### T-A3-01: resetOrganisationData Function in Seed
- **AC Reference:** Retrospective A3
- **Status:** [ ] Pass  [ ] Fail
- **Steps:**
  1. Review `backend/prisma/seed.ts`
  2. Verify `resetOrganisationData()` function exists
  3. Run the function manually in test environment
- **Expected:** Function clears players, teams, divisions, clubs, provinces and re-seeds test data

---

## Test Execution Summary

| Suite | Total | Pass | Fail | Skip |
|-------|-------|------|------|------|
| PBI-201 Province | 9 | | | |
| PBI-202 Club | 8 | | | |
| PBI-203 Division | 7 | | | |
| PBI-204 Team | 8 | | | |
| PBI-205a Player | 11 | | | |
| Frontend UI | 7 | | | |
| Retrospective Items | 2 | | | |
| **Total** | **52** | | | |

---

## Defect Log

| Defect ID | Story | Description | Severity | Status |
|-----------|-------|-------------|----------|--------|
| *(to be filled by Tester)* | | | | |

---

*Test Plan created by: Developer Agent (Claude) | Date: 2026-02-26*
*To be executed by: Tester Agent (Claude) | Session 3*
