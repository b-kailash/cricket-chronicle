# Sprint 1 - User Stories

**Sprint Type:** Foundation Sprint
**Sprint Duration:** 3 Sessions
**Sprint Start:** 2026-02-02
**Sprint End:** In Progress
**Sprint Status:** IN PROGRESS
**Branch:** sprint-1/integration

---

## Story Summary

| Story ID | Title | Points | Status |
|----------|-------|--------|--------|
| S1-001 | Docker Environment Setup | 5 | COMPLETED |
| S1-002 | Database Schema Design & Implementation | 8 | COMPLETED |
| S1-003 | Authentication Foundation | 5 | COMPLETED |
| S1-004 | Core Match Sync API Endpoints | 8 | COMPLETED |
| S1-005 | Deployment to Test Server | 3 | COMPLETED |

**Total Story Points:** 29
**Completed Points:** 29
**Velocity:** 29 points (pending sprint closure)

---

## Story Details

### S1-001: Docker Environment Setup

**Story Type:** Infrastructure
**Story Points:** 5
**Priority:** Critical
**Status:** COMPLETED

#### Story Statement
**As a** DevOps Engineer
**I want** PostgreSQL and Node.js backend running in Docker containers
**So that** the application can be deployed consistently across environments

#### Acceptance Criteria

- [x] Docker Compose file created for multi-container setup
- [x] PostgreSQL 14+ container configured with:
  - [x] Persistent volume for data storage
  - [x] Environment variables for credentials
  - [x] Health check configuration
  - [x] Port mapping (5433 - changed from 5432 due to conflict)
- [x] Node.js backend container configured with:
  - [x] TypeScript support
  - [x] Hot-reload for development (tsx watch)
  - [x] Environment variables
  - [x] Port mapping (3001 for API)
- [x] docker-compose.yml includes all required services
- [x] Containers start with single command: `docker-compose up`
- [x] Containers restart automatically on failure

#### Technical Implementation

**Files Created:**
- `docker-compose.yml` - Multi-container orchestration
- `backend/Dockerfile` - Node.js API container with OpenSSL for Prisma

**Key Configuration:**
```yaml
services:
  postgres:
    image: postgres:14-alpine
    ports: ["5433:5432"]  # Changed to avoid conflict with existing DB
  backend:
    build: ./backend
    ports: ["3001:3001"]
    depends_on: postgres
```

**Issues Resolved:**
- Port 5432 conflict with existing mybudget-db container - Changed to 5433
- npm ci failure (no package-lock.json) - Changed to npm install
- Prisma libssl.so.1.1 missing - Added OpenSSL packages to Alpine

---

### S1-002: Database Schema Design & Implementation

**Story Type:** Backend Development
**Story Points:** 8
**Priority:** Critical
**Status:** COMPLETED

#### Story Statement
**As a** Backend Developer
**I want** a well-designed PostgreSQL schema based on SRS requirements
**So that** the application can store match, scoring, and personnel data with integrity

#### Acceptance Criteria

- [x] Prisma schema file created with all core entities
- [x] Database migrations created and tested
- [x] Foreign key relationships enforced
- [x] Indexes created for performance-critical queries

#### Technical Implementation

**File Created:** `backend/prisma/schema.prisma`

**Tables Implemented (20 total):**
1. User - Authentication and roles
2. Province - Geographic regions
3. Club - Cricket clubs
4. Division - Competition divisions
5. Team - Cricket teams
6. Player - Team members
7. Match - Match records
8. Innings - Innings per match
9. Delivery - Ball-by-ball data
10. BattingStats - Batting performance
11. BowlingStats - Bowling performance
12. FieldingStats - Fielding performance
13. Partnership - Batting partnerships
14. FallOfWicket - Wicket details
15. MatchOfficial - Umpires/scorers
16. Competition - Tournaments
17. Venue - Match venues
18. RefreshToken - JWT refresh tokens
19. AuditLog - System audit trail
20. SyncQueue - Offline sync queue

**Enums Defined:**
- UserRole, UserStatus
- MatchFormat, MatchStatus
- InningsStatus, SyncStatus
- ExtraType, WicketType
- DismissalType, PlayerRole

**Migration Applied:** `20260202113741_init`

---

### S1-003: Authentication Foundation

**Story Type:** Backend Development
**Story Points:** 5
**Priority:** High
**Status:** COMPLETED

#### Story Statement
**As a** System Administrator
**I want** secure user authentication with JWT tokens
**So that** only authorized users can access scoring and admin features

#### Acceptance Criteria

- [x] User registration endpoint with email validation
- [x] User login endpoint returning JWT access token
- [x] JWT refresh token implementation
- [x] Password hashing with bcrypt (12 rounds)
- [x] JWT middleware for protected routes
- [x] Role-based access control (RBAC) foundation
- [x] Token expiration handling (access: 1hr, refresh: 7 days)
- [x] Logout endpoint (token invalidation)

#### Technical Implementation

**Files Created:**
- `backend/src/services/authService.ts` - Authentication logic
- `backend/src/utils/jwt.ts` - JWT sign/verify utilities
- `backend/src/utils/password.ts` - Password hashing
- `backend/src/middleware/auth.ts` - Authentication middleware
- `backend/src/routes/auth.ts` - Auth API routes

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | User registration |
| POST | /api/auth/login | User login |
| POST | /api/auth/refresh | Token refresh |
| POST | /api/auth/logout | Token invalidation |
| GET | /api/auth/me | Get current user |

**Verified Working:**
- User registration: scorer@cricket.com successfully created
- Login: Returns valid JWT access and refresh tokens
- Token structure: Contains userId, role, expiration claims

---

### S1-004: Core Match Sync API Endpoints

**Story Type:** Backend Development
**Story Points:** 8
**Priority:** High
**Status:** COMPLETED

#### Story Statement
**As a** Scorer using offline mode
**I want** API endpoints to sync match data and deliveries
**So that** my offline-recorded scoring data syncs to the central database

#### Acceptance Criteria

- [x] Match creation endpoint with team selection
- [x] Match retrieval endpoint (single and list)
- [x] Delivery sync endpoint (create/update individual delivery)
- [x] Batch delivery sync endpoint (sync multiple deliveries)
- [x] Conflict detection for duplicate deliveries
- [x] Innings creation and management endpoints
- [x] Match state update endpoints
- [x] Sync status tracking in database
- [x] Error handling for sync failures

#### Technical Implementation

**Files Created:**
- `backend/src/services/matchService.ts` - Match CRUD operations
- `backend/src/services/deliveryService.ts` - Delivery sync logic
- `backend/src/routes/matches.ts` - Match API routes
- `backend/src/routes/deliveries.ts` - Delivery API routes

**Match API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/matches | Create new match |
| GET | /api/matches | List all matches |
| GET | /api/matches/:id | Get match details |
| PATCH | /api/matches/:id | Update match state |
| POST | /api/matches/:id/innings | Create innings |

**Delivery API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/deliveries | Sync single delivery |
| POST | /api/deliveries/batch | Sync multiple deliveries |
| GET | /api/deliveries/:id | Get delivery by ID |
| PATCH | /api/deliveries/:id | Update delivery |
| GET | /api/deliveries/innings/:id | Get innings deliveries |
| GET | /api/deliveries/match/:id | Get match deliveries |

**Conflict Resolution:**
- Uses (inningsId, overNumber, ballNumber) as natural key
- Returns 409 Conflict when duplicate detected
- Includes existing vs incoming data in response

---

### S1-005: Deployment to Test Server

**Story Type:** DevOps
**Story Points:** 3
**Priority:** High
**Status:** COMPLETED

#### Story Statement
**As a** Product Owner
**I want** the backend deployed to the test server (192.168.1.235)
**So that** I can validate the sprint deliverables in a real environment

#### Acceptance Criteria

- [x] Application deployed and running on 192.168.1.235
- [x] Database accessible (secured with credentials)
- [x] API endpoints accessible on http://192.168.1.235:3001
- [x] Environment variables configured securely
- [x] Health check endpoint responds correctly
- [x] Logs accessible for debugging

#### Technical Implementation

**Deployment Steps Executed:**
1. SSH to test server (192.168.1.235)
2. Cloned sprint-1/integration branch
3. Created .env file with production values
4. Started containers with docker-compose up -d
5. Ran Prisma migrations
6. Verified health endpoint

**Verification Results:**
```bash
# Health Check
curl http://192.168.1.235:3001/api/health
# Response: {"status":"healthy","database":"connected"}

# User Registration - Working
# User Login - Working (returns JWT tokens)
```

**Docker Containers Running:**
- cricket-db (PostgreSQL 14-alpine)
- cricket-api (Node.js 18-alpine with backend)

---

## Story Completion Timeline

| Date | Story | Action |
|------|-------|--------|
| 2026-02-02 | S1-001 | COMPLETED - Docker environment configured |
| 2026-02-02 | S1-002 | COMPLETED - Prisma schema with 20 tables |
| 2026-02-02 | S1-003 | COMPLETED - JWT authentication working |
| 2026-02-02 | S1-004 | COMPLETED - Match and Delivery APIs |
| 2026-02-02 | S1-005 | COMPLETED - Deployed to test server |

---

## Git Commits

| Commit | Message | Files |
|--------|---------|-------|
| 2aebde2 | feat(sprint-1): implement backend infrastructure with containerized PostgreSQL | 17 files |
| 50badcf | fix(docker): use npm install instead of npm ci | 1 file |
| 0876296 | fix(docker): use port 5433 to avoid conflict with existing postgres | 2 files |
| 8f07f9e | fix(docker): add openssl for Prisma compatibility on Alpine | 1 file |

---

## Dependencies

### External Dependencies
- Docker and Docker Compose on test server (verified)
- Network access to test server (verified)

### Internal Dependencies
- Sprint 0 validated offline architecture (completed)
- Frontend integration planned for Sprint 2

---

## Technical Decisions Made

1. **Port 5433 for PostgreSQL** - Avoid conflict with existing mybudget-db
2. **npm install vs npm ci** - No package-lock.json in repo
3. **OpenSSL for Prisma** - Required for Prisma engine on Alpine Linux
4. **JWT 1-hour expiry** - Balance between security and UX
5. **bcrypt 12 rounds** - Industry standard for password hashing

---

## Notes

- All 5 stories completed in single session
- Backend API fully operational on test server
- Frontend integration deferred to Sprint 2
- Seed data creation can be done in next session

---

**Document Version:** 1.0
**Last Updated:** 2026-02-02
**Author:** Development Team
