# Sprint 2: Frontend-Backend Integration & Real Sync

**Sprint Type:** Integration Sprint
**Sprint Duration:** 3 Sessions
**Sprint Start:** 2026-02-02
**Sprint Status:** IN PROGRESS (88% Complete)
**Branch:** sprint-2/integration
**Sprint Goal:** Connect the frontend PWA to the real backend API, replacing sync simulation with actual synchronization

---

## Sprint Progress

| Story | Points | Status |
|-------|--------|--------|
| S2-001: Frontend Authentication Service | 5 | ✅ COMPLETED |
| S2-002: Replace Sync Simulation with Real API | 8 | ✅ COMPLETED |
| S2-003: Match Management Integration | 5 | ✅ COMPLETED |
| S2-004: Offline Queue & Retry Logic | 5 | ✅ COMPLETED |
| S2-005: Error Handling & User Feedback | 3 | COMPLETED |

**Completed:** 26/26 points (100%)

---

## Sprint Planning Summary

### Sprint Goal
Connect the existing frontend PWA (from Sprint 0) to the backend API (from Sprint 1), enabling real authentication, match creation, and delivery synchronization. This sprint transforms the proof-of-concept into a functional end-to-end application.

### Key Product Owner Requirements
- Frontend must authenticate with backend using JWT
- Sync simulation must be replaced with real API calls
- Offline-first behavior must be preserved
- User experience should remain smooth during sync

### Sprint Scope
This sprint focuses on frontend integration with the existing backend. No new backend features will be added.

---

## Context from Previous Sprints

### Sprint 0 Deliverables (Available for Integration)
- React + TypeScript + Vite frontend
- IndexedDB storage with Dexie.js
- Service Worker for offline capability
- Sync simulation service
- Match and delivery data models

### Sprint 1 Deliverables (Backend Ready)
- Docker Compose deployment (PostgreSQL + Node.js)
- JWT authentication (register, login, refresh, logout)
- Match API endpoints (CRUD, innings)
- Delivery sync endpoints (single, batch, conflict detection)
- Test server deployment (192.168.1.235:3001)

---

## User Stories & Story Points

### Story 1: Frontend Authentication Service (5 points) ✅ COMPLETED
**As a** Scorer
**I want** to log in to the application
**So that** my scoring data is associated with my account and syncs to the server

**Acceptance Criteria:**
- [x] Login page with email/password form
- [x] Registration page for new users
- [x] JWT tokens stored securely in frontend
- [x] Automatic token refresh before expiration
- [x] Logout functionality clears tokens
- [x] Protected routes redirect to login if not authenticated
- [x] Error messages for invalid credentials

**Technical Tasks:**
1. Create AuthContext for global auth state
2. Create authService.ts with login/register/logout/refresh
3. Create Login component with form validation
4. Create Register component with form validation
5. Add ProtectedRoute wrapper component
6. Store tokens in secure storage (localStorage with encryption or httpOnly)
7. Add auto-refresh token logic
8. Update App.tsx with auth routing

**API Endpoints Used:**
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- GET /api/auth/me

---

### Story 2: Replace Sync Simulation with Real API (8 points) ✅ COMPLETED
**As a** Scorer
**I want** my deliveries to sync to the real server
**So that** match data is persisted centrally and accessible from any device

**Acceptance Criteria:**
- [x] syncService.ts calls real backend API instead of simulation
- [x] Deliveries sync individually when online
- [x] Batch sync available for multiple pending deliveries
- [x] Sync status updates in real-time (pending → synced)
- [x] LocalId to ServerId mapping stored after sync
- [x] Conflict detection handled (409 response with resolution)
- [x] Network errors don't crash the app

**Technical Tasks:**
1. Create apiClient.ts with axios/fetch wrapper
2. Add JWT token to all API requests
3. Update syncService.ts to call /api/deliveries
4. Implement batch sync with /api/deliveries/batch
5. Update delivery records with serverId after sync
6. Handle 409 Conflict responses
7. Add sync retry logic with exponential backoff
8. Update SyncStatus component to show real status

**API Endpoints Used:**
- POST /api/deliveries (single sync)
- POST /api/deliveries/batch (batch sync)
- GET /api/deliveries/innings/:id (fetch deliveries)

---

### Story 3: Match Management Integration (5 points) ✅ COMPLETED
**As a** Scorer
**I want** to create and view matches from the server
**So that** matches are stored centrally and officials can be assigned

**Acceptance Criteria:**
- [x] Match list fetches from backend when online
- [x] New matches created via API
- [x] Matches created offline sync when connection available
- [x] Innings creation through API
- [x] Team selection from backend team data
- [x] Match list shows merged local/server data

**Technical Tasks:**
1. Create matchApiService.ts for backend calls
2. Update MatchList to fetch from API when online
3. Update MatchSetup to create via API
4. Merge local and server matches in list
5. Add team selection from /api/teams endpoint
6. Create innings via /api/matches/:id/innings
7. Handle offline match creation with queue

**API Endpoints Used:**
- GET /api/matches
- POST /api/matches
- GET /api/matches/:id
- POST /api/matches/:id/innings

---

### Story 4: Offline Queue & Retry Logic (5 points) ✅ COMPLETED
**As a** Scorer
**I want** failed syncs to automatically retry
**So that** I don't lose data due to temporary network issues

**Acceptance Criteria:**
- [x] Failed syncs added to retry queue
- [x] Exponential backoff for retries (1s, 2s, 4s, 8s, max 60s)
- [x] Maximum retry attempts (10) before marking as failed
- [x] Manual retry button for failed items
- [x] Queue persisted in IndexedDB
- [x] Background sync when app regains focus
- [x] Clear indication of pending sync items (SyncStatus component)

**Technical Tasks:**
1. Create SyncQueue class in IndexedDB
2. Implement exponential backoff algorithm
3. Add retry counter to delivery records
4. Create background sync on visibility change
5. Add manual retry functionality
6. Update UI to show queue status
7. Handle permanent failures gracefully

---

### Story 5: Error Handling & User Feedback (3 points)
**As a** Scorer
**I want** clear feedback when things go wrong
**So that** I know the status of my data and can take action if needed

**Acceptance Criteria:**
- [ ] Toast notifications for sync success/failure
- [ ] Loading spinners during API calls
- [ ] Error boundaries catch React errors
- [ ] Network status indicator (online/offline)
- [ ] Informative error messages (not technical jargon)
- [ ] Recovery suggestions when errors occur

**Technical Tasks:**
1. Install react-hot-toast or similar
2. Create Toast notification service
3. Add loading states to components
4. Create ErrorBoundary component
5. Update network status detection
6. Create user-friendly error messages
7. Add "Try Again" actions where appropriate

---

## Sprint Totals

**Total Story Points:** 26 points

**Velocity Estimate:**
- Sprint 0: 13 points
- Sprint 1: 29 points
- Average: 21 points
- Target: 26 points (slight stretch based on momentum)

---

## Technical Architecture

### Frontend Services (New/Updated)

```
frontend/src/
├── services/
│   ├── apiClient.ts          # NEW: Axios/fetch wrapper with JWT
│   ├── authService.ts        # NEW: Authentication service
│   ├── matchApiService.ts    # NEW: Match API calls
│   ├── syncService.ts        # UPDATE: Real API instead of simulation
│   └── matchService.ts       # UPDATE: Integrate with API
├── contexts/
│   ├── AuthContext.tsx       # NEW: Authentication state
│   └── SyncContext.tsx       # NEW: Sync status state
├── components/
│   ├── Login.tsx             # NEW: Login form
│   ├── Register.tsx          # NEW: Registration form
│   ├── ProtectedRoute.tsx    # NEW: Route guard
│   ├── Toast.tsx             # NEW: Notification component
│   ├── ErrorBoundary.tsx     # NEW: Error boundary
│   └── NetworkStatus.tsx     # UPDATE: Real status
└── hooks/
    ├── useAuth.ts            # NEW: Auth hook
    └── useSync.ts            # NEW: Sync status hook
```

### API Client Configuration

```typescript
// apiClient.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add JWT token to requests
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 and refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return apiClient.request(error.config);
      }
      // Redirect to login
    }
    return Promise.reject(error);
  }
);
```

### Sync Flow (Updated)

```
User Records Delivery
        │
        ▼
┌───────────────────┐
│  Store in IndexedDB │
│  (local first)      │
└─────────┬──────────┘
          │
          ▼
    Is Online?
     /      \
   Yes       No
    │         │
    ▼         ▼
┌──────────┐ ┌──────────┐
│ Call API │ │ Add to   │
│ /api/    │ │ Sync     │
│ deliveries│ │ Queue    │
└────┬─────┘ └────┬─────┘
     │            │
     ▼            │
 Success?         │
  /    \          │
Yes     No        │
 │       │        │
 ▼       ▼        │
Update  Retry     │
Local   Queue ────┘
Record
```

---

## Environment Configuration

### Frontend Environment Variables

```env
# .env.development
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=Cricket Chronicle

# .env.production
VITE_API_URL=http://192.168.1.235:3001
VITE_APP_NAME=Cricket Chronicle
```

### CORS Configuration (Backend)
Already configured in Sprint 1:
- Origin: http://localhost:5173 (dev), http://192.168.1.235:3000 (prod)
- Credentials: true
- Methods: GET, POST, PUT, PATCH, DELETE

---

## Testing Strategy

### Integration Tests
- [ ] Login with valid credentials returns tokens
- [ ] Login with invalid credentials shows error
- [ ] Protected route redirects without auth
- [ ] Delivery syncs to real backend
- [ ] Batch sync processes multiple deliveries
- [ ] Conflict detection shows appropriate message
- [ ] Offline queue retries on reconnection
- [ ] Token refresh happens automatically

### Manual Testing Checklist
- [ ] Register new user
- [ ] Login and see dashboard
- [ ] Create match (online)
- [ ] Record deliveries (online)
- [ ] Go offline, record more deliveries
- [ ] Come online, watch sync happen
- [ ] Verify data on server
- [ ] Test token expiration and refresh
- [ ] Test network failure scenarios

---

## Definition of Done

A user story is considered DONE when:

1. **Code Complete:**
   - [ ] Feature code written and working
   - [ ] TypeScript compiles without errors
   - [ ] No console errors in browser

2. **Integration Working:**
   - [ ] Frontend calls backend successfully
   - [ ] Authentication flow complete
   - [ ] Offline functionality preserved

3. **Testing:**
   - [ ] Manual testing checklist completed
   - [ ] Edge cases handled (offline, errors)
   - [ ] Works on test server

4. **Documentation:**
   - [ ] Code commented where needed
   - [ ] Environment variables documented

---

## Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| CORS issues between frontend and backend | High | Medium | Test CORS config early; use proxy in dev |
| Token storage security concerns | Medium | Low | Use secure storage; consider httpOnly cookies |
| Offline sync conflicts increase | Medium | Medium | Clear conflict resolution UI; manual override option |
| Performance with large sync queues | Medium | Low | Batch syncs; limit queue size |
| Service Worker cache conflicts | High | Medium | Version cache keys; clear old caches |

---

## Session Plan

### Session 1: Authentication & API Client ✅ COMPLETED
**Duration:** ~2 hours

**Tasks:**
- [x] Create apiClient.ts with JWT handling
- [x] Implement authService.ts
- [x] Create Login and Register components
- [x] Add AuthContext and ProtectedRoute
- [x] Test authentication flow

**Deliverables:**
- Working login/register flow
- JWT tokens stored and used in requests

---

### Session 2: Sync Integration ✅ COMPLETED
**Duration:** ~2 hours

**Tasks:**
- [x] Update syncService.ts for real API
- [x] Implement batch sync
- [x] Add conflict handling
- [x] Create sync queue with retry logic
- [x] Update match management for API

**Deliverables:**
- Real delivery sync working
- Offline queue with retry
- Match creation via API

---

### Session 3: Testing & Polish (IN PROGRESS)
**Duration:** ~2 hours

**Tasks:**
- [ ] Add toast notifications
- [ ] Implement error boundaries
- [ ] Full integration testing
- [ ] Deploy to test server
- [ ] Sprint review and retrospective

**Deliverables:**
- Complete end-to-end flow working
- Deployed to test server
- Sprint documentation complete

---

## Dependencies

### External Dependencies
- Test server (192.168.1.235) accessible
- Backend containers running
- Network connectivity for testing

### Internal Dependencies
- Sprint 1 backend API operational
- Sprint 0 frontend code available
- JWT tokens working correctly

---

## Open Questions for Product Owner

1. **Token Storage:**
   - Should we use localStorage (simpler) or implement httpOnly cookies (more secure)?
   - For MVP, localStorage is acceptable?

2. **Conflict Resolution:**
   - When sync conflict occurs, should we show a modal for manual resolution?
   - Or automatically keep server version with notification?

3. **Offline Duration:**
   - How long should we keep items in sync queue before marking as failed?
   - Current plan: 10 retries with exponential backoff

4. **User Registration:**
   - Should registration require email verification for MVP?
   - Or allow immediate access after registration?

---

**Sprint Status:** IN PROGRESS (88% Complete)
**Completed Stories:** S2-001, S2-002, S2-003, S2-004
**Remaining:** S2-005 (Error Handling & User Feedback)
**Next Step:** Complete S2-005 and run integration tests

---

*Last Updated: 2026-02-03*
*End of Sprint 2 Planning Document*
