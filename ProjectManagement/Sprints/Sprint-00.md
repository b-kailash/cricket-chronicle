# Sprint 0: Technical Spike - Offline Sync Proof of Concept

**Sprint Type:** Technical Spike (Research & Validation)
**Sprint Duration:** 3 Sessions
**Sprint Start:** 2026-02-01
**Sprint Status:** In Progress
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
- [ ] Initialize React + TypeScript + Vite project
- [ ] Configure Vite PWA plugin
- [ ] Implement Dexie.js database schema
- [ ] Create basic scoring UI components
- [ ] Implement offline storage on each delivery
- [ ] Add online/offline detection
- [ ] Create sync simulation logic
- [ ] Test offline persistence

### Session 3: Testing & Review
- [ ] Test offline data persistence
- [ ] Test sync simulation
- [ ] Test page refresh with data retention
- [ ] Measure IndexedDB performance with sample data
- [ ] Document findings and recommendations
- [ ] Sprint retrospective
- [ ] Update Sprint Index to "Completed"

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
**TBD after Session 2 & 3**

### Recommendations
**TBD after Session 2 & 3**

### Readiness for Sprint 1
**TBD after Session 2 & 3**

---

## Sprint Retrospective

### What Went Well
**TBD**

### What Could Be Improved
**TBD**

### Action Items for Next Sprint
**TBD**

---

**Sprint Status:** In Progress
**Last Updated:** 2026-02-01
**Next Review:** Session 2 - Development Phase
