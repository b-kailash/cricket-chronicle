# Sprint 2 - User Stories

**Sprint Type:** Integration Sprint
**Sprint Duration:** 3 Sessions
**Sprint Start:** 2026-02-02
**Sprint End:** Pending
**Sprint Status:** IN PROGRESS
**Branch:** sprint-2/integration

---

## Story Summary

| Story ID | Title | Points | Status |
|----------|-------|--------|--------|
| S2-001 | Frontend Authentication Service | 5 | ✅ COMPLETED |
| S2-002 | Replace Sync Simulation with Real API | 8 | ✅ COMPLETED |
| S2-003 | Match Management Integration | 5 | ✅ COMPLETED |
| S2-004 | Offline Queue & Retry Logic | 5 | ✅ COMPLETED |
| S2-005 | Error Handling & User Feedback | 3 | ✅ COMPLETED |

**Total Story Points:** 26
**Completed Points:** 26
**Velocity Target:** 26 points

---

## Story Details

### S2-001: Frontend Authentication Service

**Story Type:** Feature
**Story Points:** 5
**Priority:** Critical
**Status:** ✅ COMPLETED
**Completed Date:** 2026-02-03

#### Story Statement
**As a** Scorer
**I want** to log in to the application
**So that** my scoring data is associated with my account and syncs to the server

#### Acceptance Criteria

1. **Login Page**
   - [x] Email input with validation
   - [x] Password input with show/hide toggle
   - [ ] "Remember me" checkbox (optional)
   - [x] Submit button with loading state
   - [x] Link to registration page
   - [x] Error message display for invalid credentials

2. **Registration Page**
   - [x] Email, password, first name, last name inputs
   - [x] Password confirmation field
   - [ ] Role selection (Scorer by default)
   - [x] Submit button with loading state
   - [x] Link to login page
   - [x] Success message and redirect to login

3. **Token Management**
   - [x] Access token stored securely
   - [x] Refresh token stored securely
   - [x] Auto-refresh before token expiration
   - [x] Tokens cleared on logout

4. **Protected Routes**
   - [x] Unauthenticated users redirected to login
   - [x] Authenticated users can access dashboard
   - [x] Auth state persists across page refresh

#### Files Created
- `frontend/src/services/apiClient.ts` - HTTP client with JWT handling
- `frontend/src/services/authService.ts` - Authentication operations
- `frontend/src/contexts/AuthContext.tsx` - Global auth state
- `frontend/src/components/Login.tsx` - Login form
- `frontend/src/components/Register.tsx` - Registration form
- `frontend/src/components/ProtectedRoute.tsx` - Route guard
- `frontend/src/components/AuthPage.tsx` - Auth page switcher
- `frontend/.env.development` - Dev API URL
- `frontend/.env.production` - Prod API URL

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
**Status:** ✅ COMPLETED
**Completed Date:** 2026-02-03

#### Story Statement
**As a** Scorer
**I want** my deliveries to sync to the real server
**So that** match data is persisted centrally and accessible from any device

#### Acceptance Criteria

1. **Single Delivery Sync**
   - [x] Delivery sent to POST /api/deliveries/sync
   - [x] LocalId included in request
   - [x] ServerId stored in local record after success
   - [x] Sync status updated (pending → synced)
   - [x] JWT token included in request header

2. **Batch Sync**
   - [x] Multiple deliveries sent in single request
   - [x] POST /api/deliveries/batch-sync endpoint used
   - [x] Each delivery result processed individually
   - [x] Failed items remain in queue

3. **Conflict Handling**
   - [x] 409 response detected and handled
   - [x] Conflict data stored locally (hasConflict, serverData)
   - [x] Conflict details shown (optional)
   - [x] Option to keep local or server version (resolveConflict method)

4. **Network Error Handling**
   - [x] Timeout errors caught gracefully
   - [x] Network errors don't crash app
   - [x] Failed syncs tracked with syncError field

#### Files Modified
- `frontend/src/services/syncService.ts` - Real API calls, conflict handling
- `frontend/src/db/schema.ts` - Added version, hasConflict, serverData fields

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
**Status:** ✅ COMPLETED
**Completed Date:** 2026-02-03

#### Story Statement
**As a** Scorer
**I want** to create and view matches from the server
**So that** matches are stored centrally and officials can be assigned

#### Acceptance Criteria

1. **Match List**
   - [x] Fetches matches from GET /api/matches when online
   - [x] Shows local matches when offline
   - [x] Merges local and server matches (no duplicates)
   - [x] Indicates sync status for each match

2. **Match Creation**
   - [x] Creates match via POST /api/matches when online
   - [x] Stores locally first, queues for sync when offline
   - [x] Team selection from server team data
   - [x] Success feedback with match ID

3. **Innings Management**
   - [x] Creates innings via POST /api/matches/:id/innings
   - [x] Innings ID returned and stored locally
   - [x] Links deliveries to server innings ID

4. **Team Data**
   - [x] Fetches teams from server for selection
   - [x] Caches team data locally for offline use (localStorage with 1hr expiry)
   - [x] Player list available per team

#### Files Created
- `frontend/src/services/matchApiService.ts` - Match CRUD operations
- `frontend/src/services/teamService.ts` - Team data with caching

#### Files Modified
- `frontend/src/components/MatchList.tsx` - API integration, sync button
- `frontend/src/components/MatchSetup.tsx` - Team selection dropdowns
- `frontend/src/db/schema.ts` - Added competitionId, homeTeamId, awayTeamId, matchDate

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
**Status:** ✅ COMPLETED
**Completed Date:** 2026-02-03

#### Story Statement
**As a** Scorer
**I want** failed syncs to automatically retry
**So that** I don't lose data due to temporary network issues

#### Acceptance Criteria

1. **Sync Queue**
   - [x] Failed syncs added to persistent queue
   - [x] Queue stored in IndexedDB (syncQueue table)
   - [x] Queue survives page refresh/app restart

2. **Retry Logic**
   - [x] Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s max
   - [x] Maximum 10 retry attempts per item
   - [x] Retry counter tracked per item
   - [x] Jitter (±10%) to prevent thundering herd

3. **Background Sync**
   - [x] Sync triggered when app regains focus
   - [x] Sync triggered when network status changes to online
   - [x] Sync triggered on visibility change
   - [x] Respects backoff timing

4. **Manual Retry**
   - [x] "Retry Now" button for individual items
   - [x] "Clear Failed" option after max retries
   - [x] "Retry All Failed" for bulk retry

#### Files Created
- `frontend/src/services/retryQueueService.ts` - Queue management with backoff

#### Files Modified
- `frontend/src/components/SyncStatus.tsx` - Retry UI with queue panel
- `frontend/src/db/schema.ts` - Added maxAttempts, nextRetryAt, status to SyncQueue

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
**Status:** ✅ COMPLETED
**Completed Date:** 2026-02-03

#### Story Statement
**As a** Scorer
**I want** clear feedback when things go wrong
**So that** I know the status of my data and can take action if needed

#### Acceptance Criteria

1. **Toast Notifications**
   - [x] Success toast for sync completion
   - [x] Error toast for sync failure
   - [x] Info toast for offline mode
   - [x] Auto-dismiss after 3-5 seconds
   - [x] Manual dismiss option

2. **Loading States**
   - [x] Loading spinner during API calls
   - [x] Disabled buttons during submission
   - [ ] Skeleton loaders for lists (optional - deferred)

3. **Error Boundaries**
   - [x] Catch React component errors
   - [x] Show friendly error message
   - [x] "Try Again" button to recover
   - [x] Error logged for debugging

4. **Network Status**
   - [x] Clear online/offline indicator
   - [x] Status visible at all times
   - [x] Updates immediately on change

#### Files Created
- `frontend/src/contexts/ToastContext.tsx` - Toast notification context and provider
- `frontend/src/components/Toast.tsx` - Toast display component with animations
- `frontend/src/components/ErrorBoundary.tsx` - Error boundary with recovery UI
- `frontend/src/components/LoadingSpinner.tsx` - Loading spinner and LoadingButton
- `frontend/src/components/NetworkStatus.tsx` - Online/offline status indicator

#### Files Modified
- `frontend/src/App.tsx` - Integrated ErrorBoundary, ToastProvider, ToastContainer, NetworkStatus
- `frontend/src/components/SyncStatus.tsx` - Added toast notifications for sync events

#### Technical Implementation

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

**Default Durations:**
- Success: 3 seconds
- Error: 5 seconds
- Info: 4 seconds
- Warning: 4 seconds

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

**Document Version:** 1.1
**Last Updated:** 2026-02-03
**Author:** Development Team
