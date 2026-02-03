# GitHub Issue Template for Sprint 2 Critical Bugs

**Title:** Sprint 2: Critical API endpoint mismatches blocking sync functionality

**Labels:** bug, critical, sprint-2

---

## Issue Body (copy below this line):

## Summary

Sprint 2 testing revealed **critical issues** that block core sync functionality. These must be fixed before the sprint can be considered complete.

## Critical Issues

### Issue #1: Delivery Sync Endpoint Mismatch 🔴

**Severity:** Critical
**Impact:** Blocks S2-002, S2-003, S2-004, S2-005 testing

**Problem:**
Frontend calls incorrect API endpoints for delivery sync operations.

| Location | Frontend Calls | Backend Expects |
|----------|---------------|-----------------|
| syncService.ts:386 | `/api/deliveries/sync` | `/api/deliveries` |
| syncService.ts:481 | `/api/deliveries/batch-sync` | `/api/deliveries/batch` |

**Fix Required:**
```typescript
// File: frontend/src/services/syncService.ts

// Line 386: Change
const response = await fetch('/api/deliveries/sync', {...});
// To
const response = await fetch('/api/deliveries', {...});

// Line 481: Change
const response = await fetch('/api/deliveries/batch-sync', {...});
// To
const response = await fetch('/api/deliveries/batch', {...});
```

**Time to Fix:** ~2 minutes

---

### Issue #2: Missing Team API Endpoints 🔴

**Severity:** Critical
**Impact:** Blocks team selection during match creation

**Problem:**
Frontend expects team management endpoints that don't exist in the backend.

**Expected Endpoints (not implemented):**
- `GET /api/teams` - List all teams
- `GET /api/teams/:id` - Get team details
- `GET /api/teams/:id/players` - Get team roster

**Frontend Location:** `frontend/src/services/teamService.ts`

**Options to Fix:**
1. **Option A:** Implement backend endpoints (30-60 min)
2. **Option B:** Modify frontend to use existing data or manual entry fallback

---

## Test Results

| Story | Status | Blocker |
|-------|--------|---------|
| S2-001: Authentication | ⚠️ Partial | - |
| S2-002: Real API Sync | ❌ FAIL | Issue #1 |
| S2-003: Match Management | ❌ FAIL | Issue #2 |
| S2-004: Offline Queue | ⏸️ Blocked | Issue #1 |
| S2-005: Error Handling | ⏸️ Blocked | Issue #1 |

## Related Documentation

- Full test report: `ProjectManagement/Sprints/Sprint-02/TESTING_REPORT.md`
- Defect details: `ProjectManagement/Sprints/Sprint-02/DefectReport.md`
- Test execution log: `ProjectManagement/Sprints/Sprint-02/TestExecution.md`

## Acceptance Criteria for Closing

- [ ] Delivery sync endpoint mismatch fixed
- [ ] Team endpoints implemented OR frontend workaround in place
- [ ] All Sprint 2 stories pass testing
- [ ] No critical/high severity defects remaining
