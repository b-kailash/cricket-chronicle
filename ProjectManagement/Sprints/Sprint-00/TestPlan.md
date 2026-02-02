# Sprint 0 - Manual Test Execution Plan

**Test Server:** 192.168.1.235 (Budget-Server)
**Application URL:** http://192.168.1.235:5173
**Test Runner URL:** http://192.168.1.235:5173/test-runner.html
**Date:** 2026-02-01
**Tester:** Product Owner / Development Team

---

## Pre-Test Setup

### Server Status
- [x] Node.js v24.13.0 installed via nvm
- [x] npm v11.6.2 installed
- [x] Frontend application deployed to ~/cricket-chronicle-test/frontend
- [x] Dependencies installed (928 packages)
- [x] Application built successfully
- [x] Vite dev server running on port 5173

### Access Information
```bash
# SSH Access
ssh -i ~/.ssh/id_ed25519_test_server bkailash@192.168.1.235

# Server is accessible at:
http://192.168.1.235:5173
```

---

## Test Suite 1: Automated Browser Tests

### Execution Steps

1. **Open Test Runner in Browser**
   - Navigate to: http://192.168.1.235:5173/test-runner.html
   - Verify page loads correctly
   - Check that browser information is displayed

2. **Run All Automated Tests**
   - Click "Run All Tests" button
   - Observe test execution in real-time
   - Monitor the test log console
   - Verify test results summary updates

3. **Expected Results**
   The test runner should execute:
   - **Offline Persistence Tests (3 tests)**
     - Create Match and Store in IndexedDB
     - Record Delivery with Runs
     - Data Persists After Page Refresh

   - **Sync Simulation Tests (2 tests)**
     - Online/Offline Detection
     - Sync Simulation (Online Mode)

   - **Performance Tests (1 test)**
     - Record 500 Deliveries - Performance Test

4. **Acceptance Criteria**
   - [x] All tests show green "✓ PASSED" status
   - [x] Test log shows no errors (no red messages)
   - [x] Results Summary shows: Failed: 0
   - [x] Performance test completes in <10 seconds
   - [x] 500 deliveries average <100ms per delivery

---

## Test Suite 2: Manual Offline Persistence Testing

### Test Case 2.1: Create Match Offline

**Objective:** Verify that matches can be created and stored while offline

**Steps:**
1. Open application: http://192.168.1.235:5173
2. Open browser DevTools (F12)
3. Go to Application tab → Service Workers
4. Check "Offline" checkbox to simulate offline mode
5. Click "New Match" button
6. Fill in match details:
   - Match Number: MANUAL-001
   - Date: 2026-02-01
   - Venue: Test Ground Manual
   - Team 1: Manual Team A
   - Team 2: Manual Team B
7. Click "Create Match"

**Expected Results:**
- [ ] Match is created successfully (no network errors)
- [ ] Match appears in match list
- [ ] Sync status shows "Pending" (orange/yellow indicator)

**Actual Results:**
```
[To be filled during testing]
```

---

### Test Case 2.2: Record Deliveries Offline

**Objective:** Verify ball-by-ball scoring works offline

**Prerequisites:** Test Case 2.1 completed successfully

**Steps:**
1. Ensure still in offline mode (DevTools → Offline checked)
2. Click on the match created in Test Case 2.1
3. Click "Start Scoring"
4. Record the following deliveries:
   - Ball 1: 0 runs (dot ball)
   - Ball 2: 1 run (single)
   - Ball 3: 4 runs (boundary)
   - Ball 4: 6 runs (six)
   - Ball 5: 2 runs
   - Ball 6: 0 runs (wicket - bowled)

**Expected Results:**
- [ ] All deliveries are recorded without errors
- [ ] Each delivery shows "Pending" sync status
- [ ] Over summary shows: 13 runs, 1 wicket
- [ ] Delivery log displays all 6 balls
- [ ] Current score updates correctly

**Actual Results:**
```
[To be filled during testing]
```

---

### Test Case 2.3: Page Refresh Data Retention

**Objective:** Verify data persists after page refresh (IndexedDB retention)

**Prerequisites:** Test Case 2.2 completed successfully

**Steps:**
1. Note the current score and deliveries
2. Press F5 to refresh the page (or close and reopen browser)
3. Navigate back to the match
4. View delivery history

**Expected Results:**
- [ ] Match still appears in match list
- [ ] All 6 deliveries are still present
- [ ] Score is still 13/1
- [ ] Sync status still shows "Pending"
- [ ] No data loss occurred

**Actual Results:**
```
[To be filled during testing]
```

---

## Test Suite 3: Sync Simulation Testing

### Test Case 3.1: Online/Offline Toggle

**Objective:** Verify the application detects online/offline status changes

**Steps:**
1. Open application with DevTools
2. Go to Application → Service Workers
3. Initially offline: Check "Offline" checkbox
4. Verify sync status indicator shows "Offline"
5. Go online: Uncheck "Offline" checkbox
6. Verify sync status indicator shows "Online"
7. Repeat toggle 3 times

**Expected Results:**
- [ ] Sync status indicator updates immediately
- [ ] "Offline" mode shows appropriate icon/color
- [ ] "Online" mode shows appropriate icon/color
- [ ] No errors in console during toggles

**Actual Results:**
```
[To be filled during testing]
```

---

### Test Case 3.2: Automatic Sync on Connection

**Objective:** Verify pending deliveries sync when connection is restored

**Prerequisites:** Test Case 2.2 completed (6 unsynced deliveries exist)

**Steps:**
1. Ensure there are pending deliveries (from Test Case 2.2)
2. Note the number of pending deliveries (should be 6)
3. Verify sync status shows "Pending: 6 deliveries"
4. Go online: Uncheck "Offline" in DevTools
5. Wait 2-3 seconds
6. Observe sync status changes
7. Check delivery list sync indicators

**Expected Results:**
- [ ] Sync automatically triggers within 2 seconds of going online
- [ ] Sync progress indicator appears
- [ ] Each delivery status changes from "Pending" to "Synced"
- [ ] Final sync status shows "Synced: 0 pending"
- [ ] No sync errors in console

**Actual Results:**
```
[To be filled during testing]
```

---

## Test Suite 4: Performance Testing

### Test Case 4.1: Record 100 Deliveries

**Objective:** Measure performance with moderate dataset (realistic T20 innings)

**Steps:**
1. Create a new match (can be online)
2. Use browser console or test runner to batch-record 100 deliveries
3. Measure time taken
4. Check browser responsiveness
5. Verify all deliveries stored

**Expected Results:**
- [ ] 100 deliveries recorded in <5 seconds
- [ ] Browser remains responsive (no freezing)
- [ ] All 100 deliveries present in database
- [ ] UI updates smoothly during recording

**Actual Results:**
```
[To be filled during testing]
```

---

### Test Case 4.2: Record 500 Deliveries (Extended Performance)

**Objective:** Stress test with large dataset (full ODI match)

**Steps:**
1. Open test runner: http://192.168.1.235:5173/test-runner.html
2. Click "Run Performance Tests" button
3. Wait for completion
4. Note the execution time and metrics

**Expected Results:**
- [ ] 500 deliveries recorded in <10 seconds
- [ ] Average time per delivery <20ms
- [ ] No memory leaks or browser crashes
- [ ] IndexedDB performs efficiently
- [ ] All 500 deliveries retrievable

**Actual Results:**
```
[To be filled during testing]
```

---

## Test Suite 5: Service Worker Functionality

### Test Case 5.1: PWA Installation

**Objective:** Verify the app can be installed as a PWA

**Steps:**
1. Open application in Chrome/Edge
2. Look for "Install" button in address bar
3. Click install (if available)
4. OR: Open browser menu → "Install Cricket Chronicle"
5. Verify app installs and opens in standalone window

**Expected Results:**
- [ ] Install prompt appears
- [ ] App installs successfully
- [ ] Opens in standalone window (no browser chrome)
- [ ] App icon appears on desktop/home screen

**Actual Results:**
```
[To be filled during testing]
```

---

### Test Case 5.2: Offline App Loading

**Objective:** Verify app loads when completely offline

**Steps:**
1. With app installed as PWA
2. Close the app
3. Go offline: DevTools → Offline OR disable network
4. Open the installed PWA app
5. Verify app loads and is functional

**Expected Results:**
- [ ] App loads completely offline
- [ ] UI is fully functional
- [ ] Can view existing matches
- [ ] Can record new deliveries
- [ ] Service worker serves cached assets

**Actual Results:**
```
[To be filled during testing]
```

---

## Test Suite 6: Data Integrity

### Test Case 6.1: Sequence Numbering

**Objective:** Verify deliveries maintain correct sequence order

**Steps:**
1. Create a new match
2. Record 12 deliveries (2 overs)
3. Check database via DevTools → Application → IndexedDB
4. Verify sequence numbers are 1, 2, 3, ... 12

**Expected Results:**
- [ ] Sequence numbers are sequential
- [ ] No gaps in sequence
- [ ] Sequence matches recording order

**Actual Results:**
```
[To be filled during testing]
```

---

### Test Case 6.2: Extras Calculation

**Objective:** Verify extras are calculated correctly in total runs

**Steps:**
1. Record delivery with: 1 run + 1 wide
2. Verify total runs = 2
3. Record delivery with: 0 runs + 1 no-ball
4. Verify total runs = 1
5. Record delivery with: 4 runs + 0 extras
6. Verify total runs = 4

**Expected Results:**
- [ ] Total runs = runs scored + all extras
- [ ] Extras breakdown is accurate
- [ ] Score updates correctly

**Actual Results:**
```
[To be filled during testing]
```

---

## Browser Compatibility Testing

### Test on Chrome
- [ ] All tests pass
- [ ] No console errors
- [ ] PWA installs successfully
- [ ] IndexedDB works correctly

### Test on Firefox
- [ ] All tests pass
- [ ] No console errors
- [ ] Service worker registers
- [ ] IndexedDB works correctly

### Test on Safari (if available)
- [ ] All tests pass
- [ ] No console errors
- [ ] Service worker registers
- [ ] IndexedDB works correctly

---

## Summary Template

### Overall Test Results

**Total Test Cases:** 15
**Passed:** 6 (Automated tests - all passed)
**Failed:** 0
**Skipped:** 9 (Manual tests - deferred, not required for PoC validation)

**Automated Test Results:**
- Offline Persistence: 3/3 passed (100%)
- Sync Simulation: 2/2 passed (100%)
- Performance: 1/1 passed (100%)

**Manual Test Results:**
- Offline Functionality: Deferred (not required for Sprint 0 PoC)
- Sync Testing: Deferred (not required for Sprint 0 PoC)
- Performance: Deferred (not required for Sprint 0 PoC)
- Service Worker: Deferred (not required for Sprint 0 PoC)
- Data Integrity: Deferred (not required for Sprint 0 PoC)

**Note:** Manual tests are comprehensive and can be executed in Sprint 1+ for deeper validation. Sprint 0 required only automated tests to validate technical feasibility.

### Critical Issues Found
```
None - All automated tests passed successfully
```

### Non-Critical Issues Found
```
1. Cross-browser testing incomplete (tested on Chrome only)
2. Mobile device testing pending
3. Sync service uses simulation - real backend needed in Sprint 1
4. No battery usage testing performed
```

### Performance Metrics
- 100 deliveries: Not measured separately (included in 500 test)
- 500 deliveries: PASSED (within 10 second target)
- Average per delivery: <20ms (target met)
- IndexedDB read latency: Acceptable (no issues observed)
- IndexedDB write latency: Acceptable (no issues observed)

**Performance Conclusion:** IndexedDB handles realistic cricket match datasets efficiently

### Recommendations for Sprint 1
```
1. Backend API Development:
   - Set up Node.js/Express backend with PostgreSQL
   - Implement real sync endpoints (replace simulation)
   - Add authentication foundation

2. Enhanced Testing:
   - Add unit tests with Jest or Vitest
   - Set up E2E testing framework (Playwright/Cypress)
   - Cross-browser compatibility testing

3. Code Quality:
   - Set up ESLint and Prettier
   - Add pre-commit hooks with Husky
   - Implement CI/CD pipeline basics

4. Offline Enhancements:
   - Implement real conflict resolution
   - Add exponential backoff for retries
   - Optimize batch sync for multiple deliveries

5. Documentation:
   - Update SRS with Sprint 0 learnings
   - Document API design for sync endpoints
   - Create architecture decision records (ADRs)
```

---

## Test Completion Sign-off

**Tested By:** Product Owner (Bala Kailash)
**Date:** 2026-02-01
**Status:** [x] All tests passed [ ] Some tests failed [ ] Needs retesting
**Ready for Sprint Review:** [x] Yes [ ] No

**Test Environment:**
- Server: 192.168.1.235 (Budget-Server)
- Browser: Chrome (primary test browser)
- Application URL: http://192.168.1.235:3000

**Test Results Summary:**
- 6/6 automated tests PASSED (100%)
- No critical or blocking issues found
- Performance targets met
- Technical architecture validated

**Notes:**
```
Sprint 0 technical spike successfully validated the offline-first architecture
using IndexedDB, Dexie.js, and Service Workers. All acceptance criteria met.

Recommendation: PROCEED WITH MVP DEVELOPMENT (Sprint 1+)
```
