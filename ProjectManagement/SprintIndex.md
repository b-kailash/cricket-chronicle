# Cricket Chronicle - Sprint Index

**Last Updated:** 2026-02-06

This document tracks all sprints in the Cricket Chronicle project, providing quick access to sprint plans, stories, test plans, and retrospectives.

---

## Sprint Status Key
- **Not Started:** Sprint planned but not yet begun
- **In Progress:** Currently active sprint
- **Completed:** Sprint finished and reviewed
- **Cancelled:** Sprint cancelled or deferred

---

## Sprint List

| Sprint # | Sprint Goal | Status | Dates | Story Points | Sprint Directory |
|----------|-------------|--------|-------|--------------|------------------|
| Sprint 0 | Technical Spike - Offline Sync PoC | Completed | 2026-02-01 | 13 | [Sprint-00/](Sprints/Sprint-00/) |
| Sprint 1 | Backend Infrastructure & Containerized Database | Completed | 2026-02-02 | 29 | [Sprint-01/](Sprints/Sprint-01/) |
| Sprint 2 | Frontend-Backend Integration & Real Sync | Completed | 2026-02-02 to 2026-02-06 | 30 | [Sprint-02/](Sprints/Sprint-02/) |
| Sprint 3 | Player & Officials Registration | Not Started | TBD | TBD | - |
| Sprint 4 | Match Creation & Setup | Not Started | TBD | TBD | - |
| Sprint 5 | Ball-by-Ball Scoring Engine (Basic) | Not Started | TBD | TBD | - |
| Sprint 6 | Wicket Recording & Innings Management | Not Started | TBD | TBD | - |
| Sprint 7 | Official Availability & Appointments | Not Started | TBD | TBD | - |
| Sprint 8 | Public Scorecard View & Basic Statistics | Not Started | TBD | TBD | - |

---

## Sprint Directory Structure

Each Sprint directory contains:
- **SprintPlan.md** - Sprint goals, stories, and planning details
- **Stories.md** - Detailed user stories with acceptance criteria
- **TestPlan.md** - Test cases and execution results
- **Retrospective.md** - What went well, improvements, action items

### Sprint 0 Documents
| Document | Description | Link |
|----------|-------------|------|
| Sprint Plan | Technical spike planning and architecture | [SprintPlan.md](Sprints/Sprint-00/SprintPlan.md) |
| Stories | User stories and acceptance criteria | [Stories.md](Sprints/Sprint-00/Stories.md) |
| Test Plan | Test execution plan and results | [TestPlan.md](Sprints/Sprint-00/TestPlan.md) |
| Status | Development status tracking | [Status.md](Sprints/Sprint-00/Status.md) |
| Retrospective | Sprint retrospective document | [Retrospective.md](Sprints/Sprint-00/Retrospective.md) |

### Sprint 1 Documents
| Document | Description | Link |
|----------|-------------|------|
| Sprint Plan | Backend infrastructure planning | [SprintPlan.md](Sprints/Sprint-01/SprintPlan.md) |
| Stories | User stories and acceptance criteria | [Stories.md](Sprints/Sprint-01/Stories.md) |
| Test Plan | Test execution plan and results | [TestPlan.md](Sprints/Sprint-01/TestPlan.md) |
| Retrospective | Sprint retrospective document | [Retrospective.md](Sprints/Sprint-01/Retrospective.md) |

### Sprint 2 Documents
| Document | Description | Link |
|----------|-------------|------|
| Sprint Plan | Frontend-backend integration planning | [SprintPlan.md](Sprints/Sprint-02/SprintPlan.md) |
| Stories | User stories and acceptance criteria | [Stories.md](Sprints/Sprint-02/Stories.md) |
| Test Plan | Test execution plan and results | [TestPlan.md](Sprints/Sprint-02/TestPlan.md) |
| Retrospective | Sprint retrospective document | [Retrospective.md](Sprints/Sprint-02/Retrospective.md) |

---

## Sprint Metrics

### Overall Progress
- **Total Sprints Planned:** 8 (MVP)
- **Sprints Completed:** 3 (Sprint 0, Sprint 1, Sprint 2)
- **Current Sprint:** Sprint 3 (Not Started)
- **Overall Completion:** 38% (3/8 sprints)

### Velocity Tracking
| Sprint | Planned SP | Completed SP | Velocity | Notes |
|--------|-----------|--------------|----------|-------|
| Sprint 0 | 13 | 13 | 100% | Technical Spike - All tests passed |
| Sprint 1 | 29 | 29 | 100% | All 5 stories completed, 19/19 tests passed |
| Sprint 2 | 26 | 30 | 115% | All 7 stories completed, 15/15 tests passed, 1 defect resolved |

**Average Velocity:** 24 points per sprint

---

## MVP Progress Tracker

### Phase 1: Foundation (Sprints 0-2)
- [x] Sprint 0: Technical spike - offline architecture validation
- [x] Sprint 1: Backend infrastructure, containerized database
- [x] Sprint 2: Frontend integration, real sync implementation

**Phase 1 Status:** 100% (3/3 sprints completed)

### Phase 2: Core Features (Sprints 3-5)
- [ ] Sprint 3: Player management, officials registration
- [ ] Sprint 4: Match creation, match setup
- [ ] Sprint 5: Ball-by-ball scoring engine (basic)

**Phase 2 Status:** Not Started (0/3 sprints completed)

### Phase 3: Advanced Features (Sprints 6-8)
- [ ] Sprint 6: Wicket recording, innings management
- [ ] Sprint 7: Official availability and appointments
- [ ] Sprint 8: Public scorecard view, basic statistics

**Phase 3 Status:** Not Started (0/3 sprints completed)

**MVP Overall Status:** 38% (3/8 sprints completed)

---

## Sprint 0 Summary

**Status:** COMPLETED (2026-02-01)
**Story Points:** 13
**Test Results:** 6/6 tests PASSED (100%)

**Key Deliverables:**
- IndexedDB + Dexie.js offline storage validated
- Service Worker PWA configuration working
- Sync simulation architecture proven
- 500 deliveries performance test passed
- Browser-based test runner implemented

**Recommendation:** PROCEED WITH MVP (Sprint 1+)

---

## Sprint 1 Summary

**Status:** COMPLETED (2026-02-02)
**Branch:** sprint-1/integration
**Story Points:** 29
**Test Results:** 19/19 tests PASSED (100%)

**Key Deliverables:**
- Docker Compose with PostgreSQL 14 + Node.js backend
- Prisma schema with 20 database tables
- JWT authentication with bcrypt password hashing
- Match and Delivery sync API endpoints
- Seed data script with test data
- Deployed to test server (192.168.1.235:3001)

**Git Commits:**
- feat(sprint-1): implement backend infrastructure
- fix(docker): use npm install instead of npm ci
- fix(docker): use port 5433 to avoid conflict
- fix(docker): add openssl for Prisma compatibility
- feat(db): add seed script with test data
- docs: reorganize sprint documentation

**Outcome:** All acceptance criteria met, ready for Sprint 2

---

## Sprint 2 Summary

**Status:** COMPLETED (2026-02-06)
**Branch:** sprint-2/integration (merged to main)
**Story Points:** 30
**Test Results:** 15/15 tests PASSED (100%)

**Key Deliverables:**
- Frontend Authentication Service (JWT token management)
- Real API integration replacing sync simulation
- Match Management CRUD operations with real backend
- Offline Queue with exponential backoff retry logic
- Error Handling with toast notifications and NetworkStatus
- Team and Competition API endpoints
- Token Refresh fix (DEF-001 resolved)

**Git Commits:**
- Multiple commits for S2-001 through S2-005
- fix: delivery sync endpoint mismatch (S2-006)
- feat: implement team and competition endpoints (S2-007)
- fix(auth): resolve token refresh unique constraint error (DEF-001)
- chore: add backend test files and agent configurations

**Outcome:** All acceptance criteria met, production-ready integration, ready for Sprint 3

---

## Deployment Information

### Test Server
- **Host:** 192.168.1.235 (Budget-Server)
- **Frontend (Sprint 0):** http://192.168.1.235:3000
- **Backend API (Sprint 1):** http://192.168.1.235:3001
- **Database:** PostgreSQL 14 (port 5433, internal only)

### Containers
- `cricket-db` - PostgreSQL database
- `cricket-api` - Node.js backend API

---

## Notes

- Each sprint follows 3-session structure: Planning, Development, Testing/Retrospective
- Sprint documents are organized in subdirectories for better organization
- Sprint Index is updated after each sprint review
- Velocity baseline established: ~24 points per sprint (updated after Sprint 2)

---

**Maintained By:** Development Team
