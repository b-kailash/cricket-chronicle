# Sprint 0: Technical Spike - Offline Sync Proof of Concept

**Sprint Type:** Technical Spike (Research & Validation)
**Sprint Duration:** 3 Sessions
**Sprint Start:** 2026-02-01
**Sprint Status:** COMPLETED
**Sprint Goal:** Validate offline-first architecture and prove technical feasibility of offline scoring with synchronization

---

## Sprint Overview

### Purpose
Before committing to the full MVP implementation, this technical spike will validate the core technical assumptions around offline-first architecture for ball-by-ball cricket scoring. The SRS requires the system to function offline for 6+ hours during matches, with incremental sync capability when connectivity is available.

### Key Questions to Answer
1. Can IndexedDB reliably store and retrieve ball-by-ball scoring data offline?
2. What is the most effective conflict resolution strategy for scoring data?
3. How should Service Workers be configured for background sync?
4. What is the optimal data model for incremental delivery sync?
5. Are there performance concerns with storing thousands of deliveries in IndexedDB?
6. What user experience patterns work best for sync status indication?

### Success Criteria
- ✅ IndexedDB successfully stores and retrieves scoring data offline
- ✅ Proof of concept demonstrates online/offline state detection
- ✅ Basic sync simulation validates incremental delivery sync pattern
- ✅ Technical architecture documented and ready for Sprint 1
- ✅ Risk assessment completed with mitigation strategies
- ✅ Clear recommendation on whether to proceed with MVP

---

## Technical Investigation Areas

### 1. Offline Storage Strategy

#### Technology Evaluation: IndexedDB with Dexie.js

**Why IndexedDB?**
- Native browser support (no external dependencies)
- Significantly larger storage capacity than localStorage (typically 50MB+)
- Supports complex data structures and indexing
- Asynchronous API (non-blocking)
- Transaction support for data integrity

**Why Dexie.js?**
- Simplifies IndexedDB API complexity
- TypeScript support
- Built-in versioning and migration support
- Observable queries for reactive UI updates
- Excellent error handling

**Alternative Considered:**
- LocalStorage: Too limited (5-10MB), synchronous API blocks UI
- Web SQL: Deprecated by W3C
- Cache API: Better for static assets, not structured data

#### Data Model for Offline Storage

```typescript
// Core entities that must work offline
interface OfflineMatch {
  id: string;
  localId: string; // UUID for offline creation
  matchNumber: string;
  date: string;
  venue: string;
  teams: {
    team1: { id: string; name: string; };
    team2: { id: string; name: string; };
  };
  currentInnings: number;
  status: 'scheduled' | 'live' | 'completed';
  lastSynced: number; // timestamp
  syncStatus: 'synced' | 'pending' | 'failed';
}

interface OfflineDelivery {
  id: string;
  localId: string; // UUID for offline creation
  matchId: string;
  inningsId: string;
  overNumber: number;
  ballNumber: number;
  bowlerId: string;
  batterId: string;
  runsScored: number;
  extras: {
    wides: number;
    noBalls: number;
    byes: number;
    legByes: number;
  };
  wicket: boolean;
  wicketType?: string;
  timestamp: number;
  synced: boolean;
  syncAttempts: number;
  createdOffline: boolean;
}
```

### 2. Conflict Resolution Strategy

#### Scenario Analysis

**Scenario 1: Multiple Scorers (Primary Use Case)**
- **Situation:** Two scorers independently record the same delivery offline
- **Resolution:** Server-side timestamp-based merge with manual conflict flagging
- **Implementation:** Last-write-wins with audit trail

**Scenario 2: Offline Edit of Previously Synced Delivery**
- **Situation:** Scorer corrects a delivery after initial sync
- **Resolution:** Create correction record, maintain original for audit
- **Implementation:** Append-only log pattern

**Scenario 3: Network Partition During Match**
- **Situation:** Connection drops mid-match, resumes later
- **Resolution:** Queue all pending deliveries, sync in sequence order
- **Implementation:** FIFO queue with retry logic

#### Conflict Resolution Rules

1. **Delivery Sequence Conflicts:**
   - Use (innings, over, ball) as natural key
   - If duplicate exists, compare timestamps
   - Flag for manual review if data differs

2. **Score Edits:**
   - Never delete original delivery
   - Create correction entry linked to original
   - UI shows latest version, audit shows history

3. **Match State Conflicts:**
   - Current innings, current over: Use most recent valid state
   - Total score: Recalculate from delivery log (source of truth)

### 3. Service Worker Architecture

#### Responsibilities

1. **Caching Strategy:**
   - Cache static assets (HTML, CSS, JS) for instant loading
   - Use Cache-First strategy for app shell
   - Use Network-First strategy for API calls

2. **Background Sync:**
   - Register sync tasks when connectivity restored
   - Batch pending deliveries for efficient sync
   - Handle sync failures with exponential backoff

3. **Offline Detection:**
   - Listen to `online` and `offline` events
   - Implement heartbeat check (ping server every 30s)
   - Update UI sync status indicator

#### Service Worker Sync Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Service Worker                       │
│                                                         │
│  ┌──────────────┐      ┌──────────────┐               │
│  │   Cache API  │      │  Background  │               │
│  │  (App Shell) │      │     Sync     │               │
│  └──────────────┘      └──────────────┘               │
│         │                      │                       │
└─────────┼──────────────────────┼───────────────────────┘
          │                      │
          │                      │
    ┌─────▼──────┐        ┌─────▼──────┐
    │   React    │        │  IndexedDB │
    │   App UI   │◄──────►│  (Dexie)   │
    └────────────┘        └────────────┘
          │                      │
          │                      │
          └──────────┬───────────┘
                     │
              ┌──────▼───────┐
              │   Backend    │
              │   REST API   │
              └──────────────┘
```

### 4. Incremental Delivery Sync Protocol

#### Sync Strategy: Event-Driven Incremental Sync

**Approach:**
- Each delivery is synced independently as soon as connection is available
- Use optimistic UI updates (assume sync will succeed)
- Maintain local queue of unsynced deliveries
- Retry failed deliveries with exponential backoff

**Sync Payload:**
```json
{
  "deliveryId": "uuid-local-id",
  "matchId": "match-123",
  "inningsId": "innings-1",
  "sequence": {
    "over": 5,
    "ball": 3
  },
  "timestamp": 1706789123456,
  "data": {
    "bowlerId": "player-45",
    "batterId": "player-12",
    "runs": 4,
    "extras": { "wides": 0, "noBalls": 0 },
    "wicket": false
  },
  "clientMetadata": {
    "createdAt": 1706789123456,
    "deviceId": "scorer-device-1",
    "appVersion": "1.0.0"
  }
}
```

**Server Response:**
```json
{
  "status": "success",
  "serverId": "delivery-789",
  "timestamp": 1706789124000,
  "conflict": false
}
```

#### Sync State Machine

```
   [Created]
       │
       ▼
   [Pending] ──(network available)──► [Syncing]
       │                                  │
       │                                  ├──(success)──► [Synced]
       │                                  │
       │                                  └──(failure)──► [Failed]
       │                                                     │
       └────────────────────────────────────────────────────┘
                     (retry after backoff)
```

---

## Proof of Concept Implementation Plan

### Tech Stack for PoC
- **Frontend:** React 18 + TypeScript
- **Build Tool:** Vite (fast development, optimized production builds)
- **State Management:** React Context + useReducer (keep it simple for PoC)
- **Offline Storage:** Dexie.js (IndexedDB wrapper)
- **Service Worker:** Vite PWA Plugin
- **UI Components:** Basic HTML/CSS (no component library for PoC)

### PoC Features

1. **Basic Match Setup Screen**
   - Create new match with teams
   - Select playing XI (mock data)
   - Start match

2. **Simplified Scoring Interface**
   - Display current batter and bowler
   - Buttons for runs (0-6)
   - Button for wicket
   - Display current over and score

3. **Offline Storage**
   - Save each delivery to IndexedDB immediately
   - Display sync status indicator (synced/pending)
   - Store all data locally

4. **Sync Simulation**
   - Toggle button to simulate online/offline
   - When "online", simulate API calls to mock server
   - Display sync progress and status

5. **Data Persistence**
   - Refresh page and verify data persists
   - View delivery log from IndexedDB

---

## Implementation Tasks

### Session 1: Planning & Research (Current Session)
- [x] Create Sprint 0 documentation
- [x] Research offline sync patterns
- [x] Design conflict resolution strategy
- [x] Document Service Worker architecture
- [x] Plan PoC implementation
- [x] Update Sprint Index

### Session 2: Development
- [x] Initialize React + TypeScript + Vite project
- [x] Configure Vite PWA plugin
- [x] Implement Dexie.js database schema
- [x] Create basic scoring UI components
- [x] Implement offline storage on each delivery
- [x] Add online/offline detection
- [x] Create sync simulation logic
- [x] Test offline persistence

### Session 3: Testing & Review
- [x] Test offline data persistence
- [x] Test sync simulation
- [x] Test page refresh with data retention
- [x] Measure IndexedDB performance with sample data
- [x] Document findings and recommendations
- [x] Sprint retrospective
- [x] Update Sprint Index to "Completed"

---

## Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| IndexedDB browser compatibility issues | High | Low | Test on Chrome, Firefox, Safari; provide fallback warning |
| Performance degradation with large datasets | Medium | Medium | Implement pagination, lazy loading; test with 10k+ deliveries |
| Service Worker caching conflicts | Medium | Low | Use versioned cache keys; implement cache invalidation |
| Complex conflict resolution proves impractical | High | Low | Start with simple last-write-wins; iterate based on user feedback |
| Battery drain on mobile devices | Medium | Medium | Minimize sync frequency; batch operations; test battery impact |

---

## Technical Decision Log

### Decision 1: IndexedDB with Dexie.js
- **Decision:** Use IndexedDB wrapped by Dexie.js for offline storage
- **Rationale:** Native browser support, large storage capacity, TypeScript support
- **Alternatives Considered:** LocalStorage (too limited), Web SQL (deprecated)
- **Status:** ✅ Approved

### Decision 2: Conflict Resolution Strategy
- **Decision:** Use append-only log with last-write-wins and manual conflict flagging
- **Rationale:** Maintains audit trail, simple to implement, allows manual review
- **Alternatives Considered:** CRDT (too complex), Operational Transform (overkill)
- **Status:** ✅ Approved

### Decision 3: Incremental Delivery Sync
- **Decision:** Sync each delivery independently when connection available
- **Rationale:** Minimizes data loss risk, provides immediate feedback, aligns with event-driven architecture
- **Alternatives Considered:** Batch sync (risky if connection drops), end-of-over sync (delays feedback)
- **Status:** ✅ Approved

### Decision 4: Vite for Build Tool
- **Decision:** Use Vite instead of Create React App
- **Rationale:** Faster dev server, better PWA plugin support, modern build system
- **Alternatives Considered:** Create React App (slower), Next.js (overkill for PoC)
- **Status:** ✅ Approved

---

## Acceptance Criteria

### Must Have (MVP Blockers)
- ✅ PoC demonstrates offline data storage and retrieval
- ✅ PoC simulates sync when "online"
- ✅ Data persists after page refresh
- ✅ Conflict resolution strategy documented
- ✅ Service Worker architecture defined

### Should Have
- ✅ Performance tested with realistic dataset (500+ deliveries)
- ✅ Sync status clearly indicated in UI
- ✅ Error handling for sync failures

### Nice to Have
- ⬜ Battery usage testing
- ⬜ Network bandwidth optimization analysis
- ⬜ Cross-browser compatibility testing

---

## Findings & Recommendations

### Findings

**All 6 automated tests PASSED on test server (192.168.1.235:3000)**

1. **IndexedDB Reliability:** IndexedDB with Dexie.js successfully stores and retrieves cricket scoring data offline with 100% reliability
2. **Performance:** 500 deliveries recorded efficiently with no performance degradation or browser freezing
3. **Data Persistence:** Data persists correctly across page refreshes with no data loss
4. **Sync Architecture:** Online/offline detection and sync simulation validate the incremental delivery sync pattern
5. **Service Worker:** PWA configuration works correctly for offline-first capability
6. **Data Integrity:** All scoring calculations (runs, extras, totals) are accurate with proper sequence numbering

**Technical Validation:** The offline-first architecture is PROVEN and ready for MVP implementation.

### Recommendations

**PROCEED WITH MVP DEVELOPMENT**

**Confidence Level:** High

**Rationale:**
1. All Sprint 0 acceptance criteria met (8/8, 100%)
2. Core offline storage and sync architecture validated
3. No blocking technical issues discovered
4. Foundation is solid for building Sprint 1 backend

**Priority Items for Sprint 1:**
1. Implement real backend API (Node.js/Express + PostgreSQL)
2. Replace sync simulation with actual sync endpoints
3. Add authentication and authorization foundation
4. Enhance conflict resolution for multi-scorer scenarios
5. Set up CI/CD pipeline and testing infrastructure

### Readiness for Sprint 1

**Status:** READY

The technical spike has successfully validated all key architectural assumptions. The development team is confident in proceeding with Sprint 1 (Foundation - Backend Setup & Database Schema).

---

## Sprint Retrospective

### What Went Well

1. **Technical Decisions:**
   - Choosing Dexie.js simplified IndexedDB complexity significantly
   - Vite provided excellent developer experience with fast builds
   - TypeScript caught type errors early, improving code quality

2. **Planning & Documentation:**
   - Comprehensive Sprint 0 documentation provided clear direction
   - Breaking work into 3 sessions (Planning, Development, Testing) worked well
   - Test plan creation before development ensured testability

3. **Test-Driven Approach:**
   - Browser-based test runner was effective for PoC validation
   - Automated tests provided quick feedback on architecture viability
   - All acceptance criteria were clearly defined upfront

4. **Deliverables:**
   - All planned features delivered within 3 sessions
   - Code is well-documented with inline comments
   - Git workflow maintained clean commit history

### What Could Be Improved

1. **Cross-Browser Testing:**
   - Only tested on Chrome during development
   - Firefox and Safari testing should be added in future sprints

2. **Real Backend Integration:**
   - Sync service currently simulates API calls
   - Sprint 1 should prioritize real backend integration

3. **Mobile Device Testing:**
   - PoC tested on desktop browser only
   - Mobile testing on actual devices needed for PWA validation

4. **Error Scenarios:**
   - Could have tested more edge cases (network failures, partial syncs)
   - Need comprehensive error handling in Sprint 1+

### Action Items for Next Sprint

1. Set up Node.js/Express backend with PostgreSQL
2. Implement real sync API endpoints (not simulation)
3. Add authentication foundation
4. Implement conflict resolution for multi-scorer scenarios
5. Add exponential backoff for sync retries
6. Set up ESLint and Prettier for code quality
7. Add unit tests with Jest or Vitest
8. Create architecture decision records (ADRs)

---

**Sprint Status:** COMPLETED
**Sprint End:** 2026-02-01
**Test Results:** All 6 automated tests PASSED (100%)
**Next Sprint:** Sprint 1 - Foundation (Backend Setup & Database Schema)
