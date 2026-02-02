# Sprint 1: Backend Infrastructure & Containerized Database Setup

**Sprint Type:** Foundation Sprint
**Sprint Duration:** 3 Sessions
**Sprint Start:** 2026-02-02
**Sprint Status:** IN PROGRESS
**Branch:** sprint-1/integration
**Sprint Goal:** Establish production-ready backend infrastructure with containerized PostgreSQL database, authentication foundation, and core API endpoints to support offline-first scoring

---

## Sprint Planning Summary

### Sprint Goal
Establish a robust, containerized backend infrastructure that supports the offline-first scoring architecture validated in Sprint 0. This sprint will deliver a production-ready Node.js/Express backend with PostgreSQL database running in Docker containers, core database schema, authentication foundation, and essential API endpoints for match synchronization.

### Key Product Owner Requirements
- **CRITICAL:** Database MUST be containerized using Docker
- Backend must deploy to test server (192.168.1.235)
- Must support the sync patterns proven in Sprint 0
- Must establish foundation for subsequent feature sprints

### Sprint Scope
This sprint focuses on backend infrastructure only. Frontend integration will occur in Sprint 2.

---

## Context from Sprint 0

### What We Validated
- IndexedDB + Dexie.js for offline storage ✅
- Service Worker PWA architecture ✅
- Incremental delivery sync pattern ✅
- Performance with 500+ deliveries ✅
- Data persistence across page refresh ✅

### What We Need Now
- Real backend API to replace sync simulation
- PostgreSQL database with proper schema
- Authentication and authorization foundation
- Conflict resolution for multi-scorer scenarios
- Production deployment capability

---

## User Stories & Story Points

### Story 1: Docker Environment Setup (5 points)
**As a** DevOps Engineer
**I want** PostgreSQL and Node.js backend running in Docker containers
**So that** the application can be deployed consistently across environments

**Acceptance Criteria:**
- [ ] Docker Compose file created for multi-container setup
- [ ] PostgreSQL 14+ container configured with:
  - Persistent volume for data storage
  - Environment variables for credentials
  - Health check configuration
  - Port mapping (5432)
- [ ] Node.js backend container configured with:
  - TypeScript support
  - Hot-reload for development
  - Environment variables
  - Port mapping (3001 for API)
- [ ] docker-compose.yml includes:
  - PostgreSQL service
  - Backend API service
  - Network configuration
  - Volume mounts
- [ ] Containers can be started with single command: `docker-compose up`
- [ ] Containers restart automatically on failure
- [ ] README documentation for Docker setup

**Technical Tasks:**
1. Create `docker-compose.yml` in project root
2. Create `backend/Dockerfile` for Node.js API
3. Configure PostgreSQL service with persistent volumes
4. Set up environment variables (.env.example, .env.docker)
5. Test container startup and health checks
6. Document Docker commands and troubleshooting

**Test Checklist:**
- [ ] `docker-compose up` starts all containers successfully
- [ ] PostgreSQL accepts connections on localhost:5432
- [ ] Backend API responds on localhost:3001
- [ ] Data persists after container restart
- [ ] Environment variables load correctly
- [ ] Health checks pass for all services

---

### Story 2: Database Schema Design & Implementation (8 points)
**As a** Backend Developer
**I want** a well-designed PostgreSQL schema based on SRS requirements
**So that** the application can store match, scoring, and personnel data with integrity

**Acceptance Criteria:**
- [ ] Prisma schema file created with all core entities:
  - Province, Club, Division, Team
  - Player
  - Match, Innings, Delivery
  - User (for authentication)
- [ ] Database migrations created and tested
- [ ] Foreign key relationships enforced
- [ ] Indexes created for performance-critical queries:
  - Match lookups by ID
  - Delivery queries by innings
  - Player queries by team
- [ ] Seed data script for development/testing:
  - 2 provinces
  - 4 clubs (2 per province)
  - 2 divisions
  - 8 teams (4 per division)
  - 176 players (22 per team)
  - 2 sample matches
- [ ] Database documentation generated

**Technical Tasks:**
1. Design Prisma schema based on SRS Section 2 (Data Requirements)
2. Create initial migration
3. Add indexes for query optimization
4. Create seed script with realistic cricket data
5. Test migrations (up/down)
6. Generate Prisma Client types
7. Document schema design decisions

**Database Tables Priority:**
1. **Phase 1 (This Sprint):**
   - users
   - provinces
   - clubs
   - divisions
   - teams
   - players
   - matches
   - innings
   - deliveries

2. **Phase 2 (Sprint 3+):**
   - officials
   - appointments
   - fee_structures
   - payments

**Test Checklist:**
- [ ] Migration runs successfully on clean database
- [ ] All foreign key constraints enforced
- [ ] Seed script populates database with realistic data
- [ ] Prisma Client generates TypeScript types
- [ ] Database can be reset and reseeded
- [ ] Schema matches SRS data model (Section 2)

---

### Story 3: Authentication Foundation (5 points)
**As a** System Administrator
**I want** secure user authentication with JWT tokens
**So that** only authorized users can access scoring and admin features

**Acceptance Criteria:**
- [ ] User registration endpoint with email validation
- [ ] User login endpoint returning JWT access token
- [ ] JWT refresh token implementation
- [ ] Password hashing with bcrypt (12+ rounds)
- [ ] JWT middleware for protected routes
- [ ] Role-based access control (RBAC) foundation:
  - Super Admin
  - Provincial Admin
  - Official Scorer
  - Public User (read-only)
- [ ] Token expiration handling (access: 1hr, refresh: 7 days)
- [ ] Logout endpoint (token invalidation)

**Technical Tasks:**
1. Install dependencies: jsonwebtoken, bcrypt, express-validator
2. Create User model with Prisma
3. Implement authentication service (register, login, refresh)
4. Create JWT utility functions (sign, verify, decode)
5. Implement authentication middleware
6. Create RBAC middleware
7. Add authentication routes to Express app
8. Write unit tests for auth service

**API Endpoints:**
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- GET /api/auth/me (protected)

**Test Checklist:**
- [ ] User can register with valid email/password
- [ ] Duplicate email registration is rejected
- [ ] User can login with correct credentials
- [ ] Invalid credentials return 401 error
- [ ] JWT token includes user ID and role
- [ ] Protected endpoints require valid token
- [ ] Expired tokens are rejected
- [ ] Token refresh works correctly
- [ ] Passwords are hashed (not plain text in DB)

---

### Story 4: Core Match Sync API Endpoints (8 points)
**As a** Scorer using offline mode
**I want** API endpoints to sync match data and deliveries
**So that** my offline-recorded scoring data syncs to the central database

**Acceptance Criteria:**
- [ ] Match creation endpoint with team selection
- [ ] Match retrieval endpoint (single and list)
- [ ] Delivery sync endpoint (create/update individual delivery)
- [ ] Batch delivery sync endpoint (sync multiple deliveries)
- [ ] Conflict detection for duplicate deliveries
- [ ] Innings creation and management endpoints
- [ ] Match state update endpoints
- [ ] Sync status tracking in database
- [ ] Error handling for sync failures
- [ ] API documentation with Swagger/OpenAPI

**Technical Tasks:**
1. Create Match controller with CRUD operations
2. Create Innings controller
3. Create Delivery controller with sync logic
4. Implement conflict resolution strategy:
   - Use (matchId, inningsId, overNumber, ballNumber) as natural key
   - Timestamp-based last-write-wins
   - Flag conflicts for review
5. Add validation middleware (express-validator)
6. Create sync service with retry logic
7. Write integration tests
8. Generate API documentation

**API Endpoints:**
- POST /api/matches (create match)
- GET /api/matches (list matches)
- GET /api/matches/:id (get match details)
- PATCH /api/matches/:id (update match state)
- POST /api/matches/:id/innings (create innings)
- GET /api/matches/:id/innings/:inningsId (get innings)
- POST /api/deliveries (sync single delivery)
- POST /api/deliveries/batch (sync multiple deliveries)
- PATCH /api/deliveries/:id (update delivery)
- GET /api/matches/:id/sync-status (get sync status)

**Conflict Resolution Logic:**
```typescript
// Pseudo-code for conflict detection
if (existingDelivery) {
  if (existingDelivery.timestamp < incomingDelivery.timestamp) {
    // Incoming is newer - update
    updateDelivery(incomingDelivery);
  } else if (existingDelivery.data !== incomingDelivery.data) {
    // Same timestamp, different data - flag conflict
    flagConflict(existingDelivery, incomingDelivery);
  }
}
```

**Test Checklist:**
- [ ] Match can be created via POST /api/matches
- [ ] Match list returns all matches
- [ ] Single match retrieval works
- [ ] Innings can be created for a match
- [ ] Single delivery sync creates new delivery
- [ ] Duplicate delivery (same over/ball) is detected
- [ ] Batch sync processes multiple deliveries
- [ ] Conflict detection flags duplicate deliveries
- [ ] Sync status endpoint returns correct state
- [ ] API documentation is complete

---

### Story 5: Deployment to Test Server (3 points)
**As a** Product Owner
**I want** the backend deployed to the test server (192.168.1.235)
**So that** I can validate the sprint deliverables in a real environment

**Acceptance Criteria:**
- [ ] Docker and Docker Compose installed on test server
- [ ] Application deployed and running on 192.168.1.235
- [ ] Database accessible (but secured with credentials)
- [ ] API endpoints accessible on http://192.168.1.235:3001
- [ ] Environment variables configured securely
- [ ] Deployment documentation created
- [ ] Health check endpoint responds correctly
- [ ] Logs accessible for debugging

**Technical Tasks:**
1. Verify Docker installation on test server
2. Create deployment script (deploy.sh)
3. Configure firewall rules for ports 3001, 5432
4. Set up environment variables on server
5. Create docker-compose.prod.yml for production config
6. Deploy application to test server
7. Verify all services are running
8. Document deployment process

**Deployment Steps:**
```bash
# On test server (192.168.1.235)
1. git clone <repository>
2. cd CricketChronical
3. cp .env.example .env
4. Edit .env with production values
5. docker-compose -f docker-compose.prod.yml up -d
6. docker-compose logs -f (verify startup)
7. curl http://localhost:3001/health (test health check)
```

**Test Checklist:**
- [ ] Docker containers start successfully on test server
- [ ] API health check returns 200 OK
- [ ] Database accepts connections
- [ ] Can create a match via API
- [ ] Can sync a delivery via API
- [ ] Logs show no errors
- [ ] Deployment script works without manual intervention

---

## Sprint Totals

**Total Story Points:** 29 points

**Velocity Estimate:**
- This is Sprint 1 (first development sprint)
- Target: 25-30 points (baseline for future sprints)

**Sprint Capacity:**
- 3 sessions × 2 hours/session = 6 hours development time
- Target: ~5 story points per hour (reasonable for foundation work)

---

## Technical Architecture

### Technology Stack

**Backend:**
- Runtime: Node.js 18+
- Framework: Express.js 4.x
- Language: TypeScript 5.x
- ORM: Prisma 5.x
- Authentication: JWT (jsonwebtoken), bcrypt
- Validation: express-validator
- API Documentation: Swagger/OpenAPI

**Database:**
- Database: PostgreSQL 14+
- Container: Docker official postgres:14-alpine image
- Volume: Named volume for persistence

**Infrastructure:**
- Containerization: Docker 24+, Docker Compose 2.x
- Deployment: Test server 192.168.1.235
- Ports:
  - 3001: Backend API
  - 5432: PostgreSQL (internal only)

**Development Tools:**
- Package Manager: npm 9+
- Linting: ESLint
- Formatting: Prettier
- Testing: Jest for unit tests, Supertest for API tests
- Git Hooks: Husky (optional for Sprint 1)

---

## Database Schema (Core Tables)

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) NOT NULL, -- 'super_admin', 'provincial_admin', 'scorer', 'public'
  province_id INTEGER REFERENCES provinces(id),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'suspended'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Provinces Table
```sql
CREATE TABLE provinces (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  region_code VARCHAR(20),
  country VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Matches Table
```sql
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  match_number VARCHAR(50),
  competition_id INTEGER REFERENCES competitions(id),
  home_team_id INTEGER REFERENCES teams(id),
  away_team_id INTEGER REFERENCES teams(id),
  venue_club_id INTEGER REFERENCES clubs(id),
  scheduled_start TIMESTAMP,
  toss_winner_team_id INTEGER REFERENCES teams(id),
  toss_decision VARCHAR(10), -- 'bat', 'field'
  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'live', 'completed', 'abandoned'
  result_summary TEXT,
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Deliveries Table
```sql
CREATE TABLE deliveries (
  id SERIAL PRIMARY KEY,
  local_id UUID UNIQUE, -- UUID from offline client
  innings_id INTEGER REFERENCES innings(id),
  over_number INTEGER NOT NULL,
  ball_number INTEGER NOT NULL,
  sequence_number INTEGER NOT NULL,
  bowler_id INTEGER REFERENCES players(id),
  striker_id INTEGER REFERENCES players(id),
  non_striker_id INTEGER REFERENCES players(id),
  runs_off_bat INTEGER DEFAULT 0,
  extra_type VARCHAR(20), -- 'wide', 'no_ball', 'bye', 'leg_bye', 'penalty'
  extra_runs INTEGER DEFAULT 0,
  total_runs INTEGER DEFAULT 0,
  is_wicket BOOLEAN DEFAULT FALSE,
  wicket_type VARCHAR(30),
  dismissed_player_id INTEGER REFERENCES players(id),
  fielder_id INTEGER REFERENCES players(id),
  is_legal_delivery BOOLEAN DEFAULT TRUE,
  commentary TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  synced BOOLEAN DEFAULT FALSE,
  sync_attempts INTEGER DEFAULT 0,
  created_offline BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Composite unique constraint for conflict detection
  UNIQUE(innings_id, over_number, ball_number)
);

CREATE INDEX idx_deliveries_innings ON deliveries(innings_id);
CREATE INDEX idx_deliveries_sync_status ON deliveries(synced);
CREATE INDEX idx_deliveries_local_id ON deliveries(local_id);
```

---

## API Specification

### Authentication Endpoints

#### POST /api/auth/register
**Request:**
```json
{
  "email": "scorer@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "scorer"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "userId": 1,
    "email": "scorer@example.com",
    "role": "scorer"
  },
  "message": "User registered successfully"
}
```

#### POST /api/auth/login
**Request:**
```json
{
  "email": "scorer@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "email": "scorer@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "scorer"
    }
  }
}
```

### Match Endpoints

#### POST /api/matches
**Request:**
```json
{
  "matchNumber": "T20-2026-001",
  "homeTeamId": 1,
  "awayTeamId": 2,
  "venueClubId": 1,
  "scheduledStart": "2026-02-15T14:00:00Z",
  "format": "T20",
  "oversPerInnings": 20
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "matchNumber": "T20-2026-001",
    "homeTeam": { "id": 1, "name": "Warriors XI" },
    "awayTeam": { "id": 2, "name": "Dragons XI" },
    "status": "scheduled",
    "createdAt": "2026-02-01T10:30:00Z"
  }
}
```

### Delivery Sync Endpoints

#### POST /api/deliveries
**Request:**
```json
{
  "localId": "uuid-from-client",
  "inningsId": 1,
  "overNumber": 5,
  "ballNumber": 3,
  "sequenceNumber": 33,
  "bowlerId": 10,
  "strikerId": 5,
  "nonStrikerId": 6,
  "runsOffBat": 4,
  "extraType": null,
  "extraRuns": 0,
  "totalRuns": 4,
  "isWicket": false,
  "timestamp": "2026-02-15T14:35:00Z",
  "createdOffline": true
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 33,
    "serverId": 33,
    "localId": "uuid-from-client",
    "synced": true,
    "conflict": false,
    "syncedAt": "2026-02-15T14:36:00Z"
  }
}
```

**Conflict Response (409):**
```json
{
  "success": false,
  "error": {
    "code": "DELIVERY_CONFLICT",
    "message": "Delivery already exists for this over and ball",
    "details": {
      "existingDelivery": { "id": 33, "timestamp": "2026-02-15T14:35:00Z" },
      "incomingDelivery": { "timestamp": "2026-02-15T14:35:01Z" },
      "resolution": "manual_review_required"
    }
  }
}
```

---

## Docker Configuration

### docker-compose.yml
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    container_name: cricket-db
    environment:
      POSTGRES_USER: ${DB_USER:-cricket_admin}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-cricket_secure_pass}
      POSTGRES_DB: ${DB_NAME:-cricket_chronicle}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-cricket_admin}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - cricket-network
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: cricket-api
    environment:
      NODE_ENV: ${NODE_ENV:-development}
      DATABASE_URL: postgresql://${DB_USER:-cricket_admin}:${DB_PASSWORD:-cricket_secure_pass}@postgres:5432/${DB_NAME:-cricket_chronicle}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      PORT: 3001
    ports:
      - "3001:3001"
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - cricket-network
    restart: unless-stopped
    command: npm run dev

volumes:
  postgres_data:
    driver: local

networks:
  cricket-network:
    driver: bridge
```

### backend/Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy application files
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Expose API port
EXPOSE 3001

# Default command (overridden by docker-compose)
CMD ["npm", "run", "dev"]
```

---

## Testing Strategy

### Unit Tests
**Framework:** Jest
**Coverage Target:** 80%+

**Test Files:**
- `src/services/auth.service.test.ts`
- `src/services/match.service.test.ts`
- `src/services/delivery.service.test.ts`
- `src/utils/jwt.util.test.ts`

**Example Test:**
```typescript
describe('AuthService', () => {
  it('should hash password with bcrypt', async () => {
    const password = 'TestPassword123';
    const hash = await authService.hashPassword(password);
    expect(hash).not.toBe(password);
    expect(await bcrypt.compare(password, hash)).toBe(true);
  });

  it('should generate valid JWT token', () => {
    const payload = { userId: 1, role: 'scorer' };
    const token = jwtUtil.sign(payload);
    const decoded = jwtUtil.verify(token);
    expect(decoded.userId).toBe(1);
  });
});
```

### Integration Tests
**Framework:** Jest + Supertest
**Test Database:** Separate test database

**Test Files:**
- `tests/integration/auth.test.ts`
- `tests/integration/matches.test.ts`
- `tests/integration/deliveries.test.ts`

**Example Test:**
```typescript
describe('POST /api/auth/login', () => {
  it('should login with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Password123' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeDefined();
  });

  it('should reject invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'WrongPassword' });

    expect(response.status).toBe(401);
  });
});
```

### Manual Testing Checklist
- [ ] Docker containers start successfully
- [ ] Database migrations run without errors
- [ ] Seed data populates correctly
- [ ] User registration works via Postman/curl
- [ ] User login returns JWT token
- [ ] Protected endpoints require authentication
- [ ] Match creation works
- [ ] Delivery sync works
- [ ] Conflict detection triggers on duplicate delivery
- [ ] API documentation is accessible

---

## Definition of Done

A user story is considered DONE when:

1. **Code Complete:**
   - [ ] All code written and committed to feature branch
   - [ ] TypeScript compiles without errors
   - [ ] ESLint passes with no warnings
   - [ ] Code reviewed (self-review for Sprint 1)

2. **Tests Passing:**
   - [ ] Unit tests written and passing (80%+ coverage)
   - [ ] Integration tests written and passing
   - [ ] Manual test checklist completed

3. **Documentation:**
   - [ ] API endpoints documented in code comments
   - [ ] README updated with setup instructions
   - [ ] Environment variables documented

4. **Deployed:**
   - [ ] Code merged to integration branch
   - [ ] Deployed to test server (192.168.1.235)
   - [ ] Smoke tests pass on test server

5. **Acceptance Criteria Met:**
   - [ ] All acceptance criteria validated
   - [ ] Product Owner can test the feature
   - [ ] No critical bugs

---

## Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Docker not installed on test server | High | Medium | Verify Docker installation in Session 1; install if needed |
| Database schema design takes longer than estimated | Medium | Medium | Use Prisma schema from backend/prisma as starting point; defer optional fields |
| Port conflicts on test server (5432, 3001) | Medium | Low | Check port availability before deployment; use alternative ports if needed |
| JWT secret management | High | Low | Use strong secrets; document secret rotation process |
| Database migration failures | Medium | Low | Test migrations locally first; create rollback script |
| Network connectivity issues to test server | Medium | Low | Ensure SSH access; have backup local testing plan |

---

## Session Plan

### Session 1: Planning & Docker Setup (Current Session)
**Duration:** ~2 hours
**Completed:**
- [x] Sprint 1 planning and documentation
- [x] Review Sprint 0 findings
- [x] Define user stories and acceptance criteria
- [x] Create Sprint-01.md documentation

**To Do:**
- [ ] Product Owner approval of Sprint 1 plan
- [ ] Verify Docker on test server
- [ ] Create docker-compose.yml
- [ ] Create backend Dockerfile
- [ ] Test container startup locally

**Deliverables:**
- Sprint 1 plan (this document)
- Docker configuration files
- Sprint Index updated

---

### Session 2: Development
**Duration:** ~2 hours

**Tasks:**
- [ ] Implement Prisma schema (Story 2)
- [ ] Run database migrations
- [ ] Create seed data script
- [ ] Implement authentication service (Story 3)
- [ ] Create authentication endpoints
- [ ] Implement match sync API (Story 4)
- [ ] Create delivery sync endpoints
- [ ] Write unit tests
- [ ] Write integration tests

**Deliverables:**
- Working backend API with authentication
- Database schema implemented
- Core sync endpoints functional
- Tests passing locally

---

### Session 3: Testing, Deployment & Retrospective
**Duration:** ~2 hours

**Tasks:**
- [ ] Run full test suite
- [ ] Deploy to test server (Story 5)
- [ ] Manual testing on test server
- [ ] Fix any deployment issues
- [ ] API documentation review
- [ ] Sprint review with Product Owner
- [ ] Sprint retrospective
- [ ] Update Sprint Index

**Deliverables:**
- Application deployed to 192.168.1.235
- All tests passing on test server
- API accessible and functional
- Sprint retrospective document
- Sprint Index updated to "Completed"

---

## Success Metrics

### Technical Metrics
- [ ] All 5 user stories completed (29 story points)
- [ ] 80%+ unit test coverage
- [ ] All integration tests passing
- [ ] Zero critical bugs in deployment
- [ ] API response time < 500ms (95th percentile)
- [ ] Docker containers start in < 30 seconds

### Business Metrics
- [ ] API endpoints support Sprint 0 sync patterns
- [ ] Can create a match via API
- [ ] Can sync deliveries from offline client
- [ ] Authentication prevents unauthorized access
- [ ] Product Owner accepts all stories

---

## Dependencies

### External Dependencies
- Docker installed on test server (192.168.1.235)
- Network access to test server
- PostgreSQL Docker image availability
- Node.js 18+ Docker image availability

### Internal Dependencies
- Frontend (Sprint 0 PoC) will integrate in Sprint 2
- Database schema will support Officials in Sprint 3+

---

## Open Questions for Product Owner

1. **Port Configuration:**
   - Are ports 3001 (API) and 5432 (PostgreSQL) acceptable?
   - Any firewall restrictions on test server?

2. **Authentication:**
   - Do we need OAuth integration (Google, etc.) in Sprint 1?
   - Or is email/password sufficient for MVP?

3. **Deployment Process:**
   - Should we automate deployment with CI/CD in Sprint 1?
   - Or manual deployment acceptable for now?

4. **Test Data:**
   - Should seed data include real team names?
   - Or use generic "Team A", "Team B" placeholders?

5. **API Access:**
   - Should API be publicly accessible on test server?
   - Or restrict to local network only?

---

## Sprint Backlog

### Story 1: Docker Environment Setup (5 points)
**Status:** Not Started
**Assigned To:** Developer
**Tasks:**
- [ ] Create docker-compose.yml
- [ ] Create backend/Dockerfile
- [ ] Configure PostgreSQL service
- [ ] Test container startup
- [ ] Document Docker setup

---

### Story 2: Database Schema Design (8 points)
**Status:** Not Started
**Assigned To:** Developer
**Tasks:**
- [ ] Design Prisma schema
- [ ] Create initial migration
- [ ] Add indexes
- [ ] Create seed script
- [ ] Test migrations
- [ ] Generate documentation

---

### Story 3: Authentication Foundation (5 points)
**Status:** Not Started
**Assigned To:** Developer
**Tasks:**
- [ ] Implement auth service
- [ ] Create JWT utilities
- [ ] Add auth middleware
- [ ] Create auth endpoints
- [ ] Write auth tests

---

### Story 4: Core Match Sync API (8 points)
**Status:** Not Started
**Assigned To:** Developer
**Tasks:**
- [ ] Create Match controller
- [ ] Create Innings controller
- [ ] Create Delivery controller
- [ ] Implement conflict resolution
- [ ] Add validation
- [ ] Write API tests
- [ ] Generate API docs

---

### Story 5: Deployment to Test Server (3 points)
**Status:** Not Started
**Assigned To:** Developer
**Tasks:**
- [ ] Verify Docker on server
- [ ] Create deployment script
- [ ] Configure environment
- [ ] Deploy application
- [ ] Verify deployment
- [ ] Document process

---

## Notes

- **Sprint 0 Success:** All 6 tests passed, offline-first architecture validated
- **Containerization is Critical:** Product Owner requirement - Docker MUST be used
- **Foundation for Future:** This sprint establishes the foundation for all subsequent feature sprints
- **Integration Deferred:** Frontend integration planned for Sprint 2
- **Officials Management:** Will be implemented in Sprint 3+ (per SRS Section 2.4)

---

## Sprint Artifacts

### Sprint Planning Poker Results
- Story 1: 5 points (Docker setup)
- Story 2: 8 points (Database schema - most complex)
- Story 3: 5 points (Authentication)
- Story 4: 8 points (Match sync API)
- Story 5: 3 points (Deployment)

**Total: 29 points**

### Sprint Burndown Chart
Will be tracked during Session 2 and 3.

---

## Acceptance Testing Scenarios

### Scenario 1: Docker Environment
```bash
# As Product Owner
1. SSH to test server: ssh user@192.168.1.235
2. Navigate to project: cd CricketChronical
3. Start containers: docker-compose up -d
4. Verify: docker ps (should show 2 containers running)
5. Check health: curl http://localhost:3001/health
   Expected: {"status": "ok", "database": "connected"}
```

### Scenario 2: User Registration & Login
```bash
# Register new user
curl -X POST http://192.168.1.235:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testscorer@cricket.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "Scorer",
    "role": "scorer"
  }'

# Login
curl -X POST http://192.168.1.235:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testscorer@cricket.com",
    "password": "SecurePass123!"
  }'

# Expected: JWT token in response
```

### Scenario 3: Match Creation & Delivery Sync
```bash
# Create match (with JWT token from login)
curl -X POST http://192.168.1.235:3001/api/matches \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "matchNumber": "TEST-001",
    "homeTeamId": 1,
    "awayTeamId": 2,
    "venueClubId": 1,
    "scheduledStart": "2026-02-15T14:00:00Z"
  }'

# Sync delivery
curl -X POST http://192.168.1.235:3001/api/deliveries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{
    "localId": "uuid-test-001",
    "inningsId": 1,
    "overNumber": 1,
    "ballNumber": 1,
    "bowlerId": 10,
    "strikerId": 5,
    "runsOffBat": 4
  }'

# Expected: 201 Created with delivery ID
```

---

**Sprint Status:** PLANNING (Awaiting Product Owner Approval)
**Next Step:** Product Owner reviews and approves Sprint 1 plan
**Estimated Start:** Upon approval
**Estimated Completion:** 3 sessions after start

---

*End of Sprint 1 Planning Document*
