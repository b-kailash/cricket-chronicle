# Sprint 2 - User Stories

**Sprint Type:** Integration Sprint
**Sprint Duration:** 3 Sessions
**Sprint Start:** 2026-02-02
**Sprint End:** Pending
**Sprint Status:** PLANNING
**Branch:** sprint-2/integration

---

## Story Summary

| Story ID | Title | Points | Status |
|----------|-------|--------|--------|
| S2-001 | Frontend Authentication Service | 5 | NOT STARTED |
| S2-002 | Replace Sync Simulation with Real API | 8 | NOT STARTED |
| S2-003 | Match Management Integration | 5 | NOT STARTED |
| S2-004 | Offline Queue & Retry Logic | 5 | NOT STARTED |
| S2-005 | Error Handling & User Feedback | 3 | NOT STARTED |

**Total Story Points:** 26
**Completed Points:** 0
**Velocity Target:** 26 points

---

## Story Details

### S2-001: Frontend Authentication Service

**Story Type:** Feature
**Story Points:** 5
**Priority:** Critical
**Status:** NOT STARTED

#### Story Statement
**As a** Scorer
**I want** to log in to the application
**So that** my scoring data is associated with my account and syncs to the server

#### Acceptance Criteria

1. **Login Page**
   - [ ] Email input with validation
   - [ ] Password input with show/hide toggle
   - [ ] "Remember me" checkbox (optional)
   - [ ] Submit button with loading state
   - [ ] Link to registration page
   - [ ] Error message display for invalid credentials

2. **Registration Page**
   - [ ] Email, password, first name, last name inputs
   - [ ] Password confirmation field
   - [ ] Role selection (Scorer by default)
   - [ ] Submit button with loading state
   - [ ] Link to login page
   - [ ] Success message and redirect to login

3. **Token Management**
   - [ ] Access token stored securely
   - [ ] Refresh token stored securely
   - [ ] Auto-refresh before token expiration
   - [ ] Tokens cleared on logout

4. **Protected Routes**
   - [ ] Unauthenticated users redirected to login
   - [ ] Authenticated users can access dashboard
   - [ ] Auth state persists across page refresh

#### Technical Implementation

**Files to Create:**
```
frontend/src/
├── contexts/AuthContext.tsx
├── services/authService.ts
├── components/
│   ├── Login.tsx
│   ├── Register.tsx
│   └── ProtectedRoute.tsx
└── hooks/useAuth.ts
```

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | /api/auth/register | Create new user |
| POST | /api/auth/login | Authenticate user |
| POST | /api/auth/refresh | Refresh access token |
| POST | /api/auth/logout | Invalidate tokens |
| GET | /api/auth/me | Get current user |

---

### S2-002: Replace Sync Simulation with Real API

**Story Type:** Feature
**Story Points:** 8
**Priority:** Critical
**Status:** NOT STARTED

#### Story Statement
**As a** Scorer
**I want** my deliveries to sync to the real server
**So that** match data is persisted centrally and accessible from any device

#### Acceptance Criteria

1. **Single Delivery Sync**
   - [ ] Delivery sent to POST /api/deliveries
   - [ ] LocalId included in request
   - [ ] ServerId stored in local record after success
   - [ ] Sync status updated (pending → synced)
   - [ ] JWT token included in request header

2. **Batch Sync**
   - [ ] Multiple deliveries sent in single request
   - [ ] POST /api/deliveries/batch endpoint used
   - [ ] Each delivery result processed individually
   - [ ] Failed items remain in queue

3. **Conflict Handling**
   - [ ] 409 response detected and handled
   - [ ] User notified of conflict
   - [ ] Conflict details shown (optional)
   - [ ] Option to keep local or server version

4. **Network Error Handling**
   - [ ] Timeout errors caught gracefully
   - [ ] Network errors don't crash app
   - [ ] Failed syncs added to retry queue

#### Technical Implementation

**Files to Update:**
```
frontend/src/
├── services/
│   ├── apiClient.ts        # NEW: HTTP client with auth
│   └── syncService.ts      # UPDATE: Real API calls
└── db/database.ts          # UPDATE: Add sync queue
```

**Sync Payload:**
```typescript
interface DeliverySyncPayload {
  localId: string;
  inningsId: number;
  overNumber: number;
  ballNumber: number;
  sequenceNumber: number;
  bowlerId: number;
  strikerId: number;
  nonStrikerId: number;
  runsOffBat: number;
  extraType?: string;
  extraRuns?: number;
  totalRuns: number;
  isWicket?: boolean;
  wicketType?: string;
  dismissedPlayerId?: number;
  createdOffline: boolean;
}
```

---

### S2-003: Match Management Integration

**Story Type:** Feature
**Story Points:** 5
**Priority:** High
**Status:** NOT STARTED

#### Story Statement
**As a** Scorer
**I want** to create and view matches from the server
**So that** matches are stored centrally and officials can be assigned

#### Acceptance Criteria

1. **Match List**
   - [ ] Fetches matches from GET /api/matches when online
   - [ ] Shows local matches when offline
   - [ ] Merges local and server matches (no duplicates)
   - [ ] Indicates sync status for each match

2. **Match Creation**
   - [ ] Creates match via POST /api/matches when online
   - [ ] Stores locally first, queues for sync when offline
   - [ ] Team selection from server team data
   - [ ] Success feedback with match ID

3. **Innings Management**
   - [ ] Creates innings via POST /api/matches/:id/innings
   - [ ] Innings ID returned and stored locally
   - [ ] Links deliveries to server innings ID

4. **Team Data**
   - [ ] Fetches teams from server for selection
   - [ ] Caches team data locally for offline use
   - [ ] Player list available per team

#### Technical Implementation

**Files to Create/Update:**
```
frontend/src/
├── services/
│   ├── matchApiService.ts  # NEW: Match API calls
│   └── teamService.ts      # NEW: Team data service
└── components/
    ├── MatchList.tsx       # UPDATE: API integration
    └── MatchSetup.tsx      # UPDATE: API integration
```

**API Endpoints:**
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/matches | List all matches |
| POST | /api/matches | Create new match |
| GET | /api/matches/:id | Get match details |
| POST | /api/matches/:id/innings | Create innings |

---

### S2-004: Offline Queue & Retry Logic

**Story Type:** Feature
**Story Points:** 5
**Priority:** High
**Status:** NOT STARTED

#### Story Statement
**As a** Scorer
**I want** failed syncs to automatically retry
**So that** I don't lose data due to temporary network issues

#### Acceptance Criteria

1. **Sync Queue**
   - [ ] Failed syncs added to persistent queue
   - [ ] Queue stored in IndexedDB
   - [ ] Queue survives page refresh/app restart

2. **Retry Logic**
   - [ ] Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s max
   - [ ] Maximum 10 retry attempts per item
   - [ ] Retry counter tracked per item

3. **Background Sync**
   - [ ] Sync triggered when app regains focus
   - [ ] Sync triggered when network status changes to online
   - [ ] Respects backoff timing

4. **Manual Retry**
   - [ ] "Retry Now" button for failed items
   - [ ] "Clear Failed" option after max retries
   - [ ] Bulk retry for all failed items

#### Technical Implementation

**Sync Queue Schema:**
```typescript
interface SyncQueueItem {
  id: string;
  type: 'delivery' | 'match' | 'innings';
  payload: any;
  createdAt: Date;
  lastAttempt?: Date;
  attemptCount: number;
  status: 'pending' | 'retrying' | 'failed';
  error?: string;
}
```

**Backoff Algorithm:**
```typescript
function getBackoffDelay(attemptCount: number): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 60000; // 60 seconds
  const delay = Math.min(baseDelay * Math.pow(2, attemptCount), maxDelay);
  return delay;
}
```

---

### S2-005: Error Handling & User Feedback

**Story Type:** Feature
**Story Points:** 3
**Priority:** Medium
**Status:** NOT STARTED

#### Story Statement
**As a** Scorer
**I want** clear feedback when things go wrong
**So that** I know the status of my data and can take action if needed

#### Acceptance Criteria

1. **Toast Notifications**
   - [ ] Success toast for sync completion
   - [ ] Error toast for sync failure
   - [ ] Info toast for offline mode
   - [ ] Auto-dismiss after 3-5 seconds
   - [ ] Manual dismiss option

2. **Loading States**
   - [ ] Loading spinner during API calls
   - [ ] Disabled buttons during submission
   - [ ] Skeleton loaders for lists (optional)

3. **Error Boundaries**
   - [ ] Catch React component errors
   - [ ] Show friendly error message
   - [ ] "Try Again" button to recover
   - [ ] Error logged for debugging

4. **Network Status**
   - [ ] Clear online/offline indicator
   - [ ] Status visible at all times
   - [ ] Updates immediately on change

#### Technical Implementation

**Files to Create:**
```
frontend/src/
├── components/
│   ├── Toast.tsx
│   ├── ErrorBoundary.tsx
│   ├── LoadingSpinner.tsx
│   └── NetworkStatus.tsx
└── services/
    └── toastService.ts
```

**Toast Types:**
```typescript
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}
```

---

## Dependencies Between Stories

```
S2-001 (Auth) ─────┐
                   ├──► S2-002 (Sync) ──► S2-004 (Queue)
S2-003 (Matches) ──┘                          │
                                              ▼
                                    S2-005 (Error Handling)
```

**Order of Implementation:**
1. S2-001: Authentication (required for all API calls)
2. S2-002: Sync Service (core functionality)
3. S2-003: Match Management (depends on auth + sync)
4. S2-004: Retry Queue (enhances sync)
5. S2-005: Error Handling (polish)

---

## Risks & Dependencies

| Story | Risk | Mitigation |
|-------|------|------------|
| S2-001 | Token storage security | Use encryption for localStorage |
| S2-002 | API response format changes | Define TypeScript interfaces |
| S2-003 | Large team/player datasets | Implement pagination |
| S2-004 | Queue grows too large | Limit queue size, age out old items |
| S2-005 | Toast library conflicts | Use lightweight custom implementation |

---

## Definition of Done (All Stories)

- [ ] Code compiles without TypeScript errors
- [ ] Feature works in Chrome browser
- [ ] Offline functionality preserved
- [ ] No console errors during normal use
- [ ] Manual testing completed
- [ ] Code committed to sprint branch

---

**Document Version:** 1.0
**Last Updated:** 2026-02-02
**Author:** Development Team
