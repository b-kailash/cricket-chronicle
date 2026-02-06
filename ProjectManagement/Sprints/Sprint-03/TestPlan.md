# Sprint 3 - Test Plan

**Sprint:** Sprint 3 - Organization Hierarchy Management
**Test Lead:** Development Team
**Test Environment:** Test Server (192.168.1.235) + Local Development
**Test Start Date:** TBD
**Test Completion Date:** TBD

---

## Test Objectives

1. Verify all CRUD operations for provinces, clubs, divisions, teams, and players
2. Validate data relationships and foreign key constraints
3. Confirm offline queue functionality for all operations
4. Test form validation (client-side and server-side)
5. Verify error handling and user feedback
6. Ensure data persistence across browser sessions
7. Test cascading dropdowns and dependent data loading

---

## Test Scope

### In Scope
- Province Management (PBI-201)
- Club Management (PBI-202)
- Division Management (PBI-203)
- Team Management (PBI-204)
- Player Management (PBI-205)
- API endpoints for all entities
- Frontend components and forms
- Offline queue synchronization
- Data validation

### Out of Scope
- Performance testing (deferred to later sprint)
- Security penetration testing (deferred to later sprint)
- Cross-browser compatibility (focus on Chrome/Edge)
- Mobile responsive design (MVP focuses on desktop/tablet)

---

## Test Environment

### Backend
- **API Server:** http://192.168.1.235:3001
- **Database:** PostgreSQL 14 (port 5433)
- **Container:** cricket-api

### Frontend
- **URL:** http://192.168.1.235:3000
- **Browser:** Chrome (latest), Edge (latest)

### Test Data
- Seed data from Sprint 1 (if still available)
- New test data created during Sprint 3

---

## Test Cases

### PBI-201: Province Management

#### TC-201-01: Create Province with Valid Data
**Priority:** High
**Preconditions:** User logged in as Admin
**Steps:**
1. Navigate to Province Management page
2. Click "Add New Province" button
3. Fill form:
   - Name: "Western Province"
   - Region Code: "WP"
   - Country: "South Africa"
   - Contact Name: "John Smith"
   - Contact Email: "john@wp.cricket"
   - Contact Phone: "+27123456789"
   - Status: Active
4. Click Submit

**Expected Result:**
- [ ] Province created successfully
- [ ] Toast notification: "Province created successfully"
- [ ] Redirected to province list or detail page
- [ ] New province appears in list

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-201-02: Create Province with Duplicate Region Code
**Priority:** High
**Preconditions:** Province with region code "WP" already exists
**Steps:**
1. Navigate to Province Management
2. Click "Add New Province"
3. Fill form with Region Code "WP" (duplicate)
4. Submit

**Expected Result:**
- [ ] Error message: "Region Code already exists"
- [ ] Province not created
- [ ] Form remains open with error highlighted

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-201-03: Create Province with Invalid Email
**Priority:** Medium
**Preconditions:** User logged in
**Steps:**
1. Navigate to Province Management
2. Click "Add New Province"
3. Fill form with invalid email (e.g., "notanemail")
4. Submit

**Expected Result:**
- [ ] Client-side validation error: "Invalid email format"
- [ ] Submit button disabled or form not submitted
- [ ] Error message visible under email field

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-201-04: View Province List with Pagination
**Priority:** Medium
**Preconditions:** At least 15 provinces exist
**Steps:**
1. Navigate to Province Management
2. View province list
3. Change pagination to 10 items per page
4. Navigate to page 2

**Expected Result:**
- [ ] List displays 10 provinces on page 1
- [ ] Page 2 shows next 5 provinces
- [ ] Pagination controls work correctly
- [ ] Total count displayed accurately

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-201-05: Search Provinces by Name
**Priority:** Medium
**Preconditions:** Multiple provinces exist
**Steps:**
1. Navigate to Province Management
2. Enter "Western" in search box
3. Observe results

**Expected Result:**
- [ ] Only provinces with "Western" in name are displayed
- [ ] Search is case-insensitive
- [ ] Pagination resets to page 1

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-201-06: Filter Provinces by Country
**Priority:** Medium
**Preconditions:** Provinces from multiple countries exist
**Steps:**
1. Navigate to Province Management
2. Select "South Africa" from Country filter
3. Observe results

**Expected Result:**
- [ ] Only provinces from South Africa are displayed
- [ ] Filter updates list in real-time or on Apply
- [ ] Count updates to match filtered results

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-201-07: Update Province Details
**Priority:** High
**Preconditions:** Province exists
**Steps:**
1. Navigate to Province Management
2. Click "Edit" on a province
3. Update Contact Person Name to "Jane Doe"
4. Submit

**Expected Result:**
- [ ] Province updated successfully
- [ ] Toast: "Province updated successfully"
- [ ] Detail page shows new contact name
- [ ] Updated timestamp changed

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-201-08: Soft Delete Province with No Clubs
**Priority:** High
**Preconditions:** Province exists with zero clubs
**Steps:**
1. Navigate to Province Management
2. Click "Delete" on province
3. Confirm deletion in modal
4. Observe result

**Expected Result:**
- [ ] Province status changed to "Inactive"
- [ ] Toast: "Province deactivated"
- [ ] Province removed from active list
- [ ] Province still in database (soft delete)

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-201-09: Cannot Delete Province with Clubs
**Priority:** High
**Preconditions:** Province has at least one club
**Steps:**
1. Navigate to Province Management
2. Click "Delete" on province with clubs
3. Observe result

**Expected Result:**
- [ ] Error message: "Cannot delete province with active clubs"
- [ ] Delete operation blocked
- [ ] Province remains in list
- [ ] Warning shown in confirmation modal

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-201-10: Offline Create Province
**Priority:** High
**Preconditions:** User logged in, network available
**Steps:**
1. Navigate to Province Management
2. Disable network (Chrome DevTools → Network → Offline)
3. Create new province
4. Submit
5. Re-enable network
6. Wait for sync

**Expected Result:**
- [ ] Message: "Will sync when online"
- [ ] Operation queued in offline queue
- [ ] When online, province syncs automatically
- [ ] Toast: "Province synced successfully"

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

### PBI-202: Club Management

#### TC-202-01: Create Club with Valid Data
**Priority:** High
**Preconditions:** At least one province exists
**Steps:**
1. Navigate to Club Management
2. Click "Add New Club"
3. Fill form:
   - Name: "Newlands Cricket Club"
   - Province: "Western Province"
   - Home Ground Address: "Boundary Rd, Newlands, Cape Town"
   - GPS Latitude: -33.9738
   - GPS Longitude: 18.4672
   - Ground Capacity: 25000
   - Facilities: Check "Pavilion", "Floodlights", "Electronic Scoreboard"
   - Club POC Name: "Jane Doe"
   - Club POC Email: "jane@newlands.cricket"
   - Club POC Phone: "+27111111111"
   - Status: Active
4. Submit

**Expected Result:**
- [ ] Club created successfully
- [ ] Toast: "Club created successfully"
- [ ] Club appears in list

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-202-02: Create Club with Duplicate Name in Same Province
**Priority:** High
**Preconditions:** Club "Newlands Cricket Club" exists in "Western Province"
**Steps:**
1. Create another club with same name in same province
2. Submit

**Expected Result:**
- [ ] Error: "Club name already exists in this province"
- [ ] Club not created

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-202-03: Get Current GPS Location
**Priority:** Low
**Preconditions:** User logged in, browser has geolocation permission
**Steps:**
1. Navigate to Club Management
2. Click "Add New Club"
3. Click "Get Current Location" button
4. Allow geolocation permission
5. Observe GPS fields

**Expected Result:**
- [ ] GPS Latitude and Longitude fields auto-populated
- [ ] Coordinates accurate (within 100m)
- [ ] User can override values manually

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-202-04: View Clubs Filtered by Province
**Priority:** Medium
**Preconditions:** Clubs from multiple provinces exist
**Steps:**
1. Navigate to Club Management
2. Select "Western Province" from Province filter
3. Observe results

**Expected Result:**
- [ ] Only clubs from Western Province displayed
- [ ] Filter updates list correctly

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-202-05: Search Clubs by Name
**Priority:** Medium
**Preconditions:** Multiple clubs exist
**Steps:**
1. Navigate to Club Management
2. Enter "Newlands" in search
3. Observe results

**Expected Result:**
- [ ] Only clubs with "Newlands" in name displayed
- [ ] Search is case-insensitive

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-202-06: Update Club Details
**Priority:** High
**Preconditions:** Club exists
**Steps:**
1. Edit club
2. Update Ground Capacity to 30000
3. Submit

**Expected Result:**
- [ ] Club updated successfully
- [ ] Toast: "Club updated successfully"
- [ ] New capacity displayed

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-202-07: Cannot Delete Club with Teams
**Priority:** High
**Preconditions:** Club has at least one team
**Steps:**
1. Click "Delete" on club with teams
2. Confirm

**Expected Result:**
- [ ] Error: "Cannot delete club with teams"
- [ ] Delete blocked

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-202-08: Soft Delete Club with No Teams
**Priority:** High
**Preconditions:** Club has zero teams
**Steps:**
1. Click "Delete" on club
2. Confirm

**Expected Result:**
- [ ] Club status changed to "Inactive"
- [ ] Toast: "Club deactivated"
- [ ] Removed from active list

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-202-09: Offline Create Club
**Priority:** High
**Preconditions:** Network available, then disabled
**Steps:**
1. Disable network
2. Create club
3. Submit
4. Re-enable network

**Expected Result:**
- [ ] Queued offline
- [ ] Syncs when online
- [ ] Toast: "Club synced successfully"

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-202-10: Image URL Validation
**Priority:** Low
**Preconditions:** User creating club
**Steps:**
1. Enter invalid URL in Logo URL field (e.g., "notaurl")
2. Submit

**Expected Result:**
- [ ] Validation error: "Invalid URL format"
- [ ] Submit blocked

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

### PBI-203: Division Management

#### TC-203-01: Create Division with All Fields
**Priority:** High
**Preconditions:** Province exists
**Steps:**
1. Navigate to Division Management
2. Click "Add New Division"
3. Fill form:
   - Name: "Premier Division Men"
   - Rank Level: "Premier"
   - Province: "Western Province"
   - Age Group: "Senior"
   - Gender: "Men"
4. Submit

**Expected Result:**
- [ ] Division created successfully
- [ ] Toast: "Division created successfully"
- [ ] Division appears in list

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-203-02: View Divisions Filtered by Province
**Priority:** Medium
**Preconditions:** Divisions from multiple provinces exist
**Steps:**
1. Navigate to Division Management
2. Select "Western Province" from filter
3. Observe results

**Expected Result:**
- [ ] Only divisions from Western Province displayed

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-203-03: Search Divisions by Name
**Priority:** Medium
**Preconditions:** Multiple divisions exist
**Steps:**
1. Search for "Premier"
2. Observe results

**Expected Result:**
- [ ] Only divisions with "Premier" in name displayed

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-203-04: Update Division Details
**Priority:** High
**Preconditions:** Division exists
**Steps:**
1. Edit division
2. Change Age Group to "U19"
3. Submit

**Expected Result:**
- [ ] Division updated successfully
- [ ] Toast: "Division updated successfully"

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-203-05: Cannot Delete Division with Teams
**Priority:** High
**Preconditions:** Division has teams
**Steps:**
1. Click "Delete" on division
2. Confirm

**Expected Result:**
- [ ] Error: "Cannot delete division with teams"
- [ ] Delete blocked

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-203-06: Soft Delete Division with No Teams
**Priority:** High
**Preconditions:** Division has zero teams
**Steps:**
1. Click "Delete"
2. Confirm

**Expected Result:**
- [ ] Division deactivated
- [ ] Toast: "Division deactivated"

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-203-07: Offline Create Division
**Priority:** High
**Preconditions:** Network can be disabled
**Steps:**
1. Disable network
2. Create division
3. Re-enable network

**Expected Result:**
- [ ] Queued offline
- [ ] Syncs when online

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-203-08: Enum Validation for Rank, Age, Gender
**Priority:** Medium
**Preconditions:** Creating division
**Steps:**
1. Inspect dropdown options
2. Verify only valid enums are available

**Expected Result:**
- [ ] Rank Level: Premier, Division 1, Division 2, etc.
- [ ] Age Group: Senior, U19, U17, U15, U13, U11
- [ ] Gender: Men, Women, Mixed
- [ ] No invalid values selectable

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

### PBI-204: Team Management

#### TC-204-01: Create Team with All Fields
**Priority:** High
**Preconditions:** Club and Division exist
**Steps:**
1. Navigate to Team Management
2. Click "Add New Team"
3. Fill form:
   - Label: "1st XI"
   - Club: "Newlands Cricket Club"
   - Primary Division: "Premier Division Men"
   - Team POC Name: "Coach Name"
   - Team POC Email: "coach@newlands.cricket"
   - Team POC Phone: "+27222222222"
   - Max Squad Size: 15
   - Status: Active
4. Submit

**Expected Result:**
- [ ] Team created successfully
- [ ] Toast: "Team created successfully"

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-204-02: View Teams Filtered by Club
**Priority:** Medium
**Preconditions:** Teams from multiple clubs exist
**Steps:**
1. Filter by "Newlands Cricket Club"
2. Observe results

**Expected Result:**
- [ ] Only teams from Newlands displayed

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-204-03: Search Teams by Label
**Priority:** Medium
**Preconditions:** Multiple teams exist
**Steps:**
1. Search for "1st XI"
2. Observe results

**Expected Result:**
- [ ] Only teams with "1st XI" label displayed

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-204-04: Update Team Details
**Priority:** High
**Preconditions:** Team exists
**Steps:**
1. Edit team
2. Change Max Squad Size to 20
3. Submit

**Expected Result:**
- [ ] Team updated successfully
- [ ] Toast: "Team updated successfully"

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-204-05: Assign Captain from Roster
**Priority:** High
**Preconditions:** Team has players in roster
**Steps:**
1. View team detail
2. Click "Assign Captain"
3. Select player from roster dropdown
4. Submit

**Expected Result:**
- [ ] Captain assigned successfully
- [ ] Toast: "Captain assigned"
- [ ] Captain name displayed on team detail

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-204-06: Cannot Delete Team with Matches
**Priority:** High
**Preconditions:** Team has scheduled matches
**Steps:**
1. Click "Delete" on team
2. Confirm

**Expected Result:**
- [ ] Error: "Cannot delete team with scheduled matches"
- [ ] Delete blocked

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-204-07: Soft Delete Team with No Matches
**Priority:** High
**Preconditions:** Team has zero matches
**Steps:**
1. Click "Delete"
2. Confirm

**Expected Result:**
- [ ] Team deactivated
- [ ] Toast: "Team deactivated"

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-204-08: Offline Create Team
**Priority:** High
**Preconditions:** Network can be toggled
**Steps:**
1. Disable network
2. Create team
3. Re-enable network

**Expected Result:**
- [ ] Queued offline
- [ ] Syncs when online

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-204-09: Captain/Vice-Captain Validation
**Priority:** Medium
**Preconditions:** Assigning captain and vice-captain
**Steps:**
1. Assign same player as both captain and vice-captain
2. Submit

**Expected Result:**
- [ ] Validation error: "Captain and Vice-Captain must be different players"
- [ ] Assignment blocked

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

### PBI-205: Player Management

#### TC-205-01: Create Player with All Fields
**Priority:** High
**Preconditions:** User logged in
**Steps:**
1. Navigate to Player Management
2. Click "Add New Player"
3. Fill form:
   - First Name: "AB"
   - Last Name: "de Villiers"
   - DOB: 1984-02-17
   - Email: "ab@example.com"
   - Phone: "+27333333333"
   - Jersey Number: 17
   - Batting Style: "Right-hand"
   - Bowling Style: "Right-arm Medium"
   - Primary Role: "All-rounder"
   - Playing Status: "Active"
   - Registration ID: "WP-NEWLANDS-001"
4. Submit

**Expected Result:**
- [ ] Player created successfully
- [ ] Toast: "Player created successfully"

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-205-02: Create Player with Minimal Fields
**Priority:** High
**Preconditions:** User logged in
**Steps:**
1. Create player with only required fields (First Name, Last Name, DOB)
2. Submit

**Expected Result:**
- [ ] Player created successfully
- [ ] Optional fields left blank

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-205-03: Auto-Generate Registration ID
**Priority:** Medium
**Preconditions:** Province and Club set
**Steps:**
1. Create player without manually entering Registration ID
2. Observe auto-generated ID

**Expected Result:**
- [ ] Registration ID auto-generated as Province-Club-Sequential (e.g., WP-NEWLANDS-001)

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-205-04: View Players Filtered by Team
**Priority:** Medium
**Preconditions:** Players on multiple teams
**Steps:**
1. Filter by "1st XI"
2. Observe results

**Expected Result:**
- [ ] Only players in "1st XI" roster displayed

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-205-05: Search Players by Name
**Priority:** Medium
**Preconditions:** Multiple players exist
**Steps:**
1. Search for "de Villiers"
2. Observe results

**Expected Result:**
- [ ] Only players with "de Villiers" in name displayed

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-205-06: Update Player Details
**Priority:** High
**Preconditions:** Player exists
**Steps:**
1. Edit player
2. Change Playing Status to "Injured"
3. Submit

**Expected Result:**
- [ ] Player updated successfully
- [ ] Toast: "Player updated successfully"

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-205-07: Add Player to Team Roster
**Priority:** High
**Preconditions:** Player and Team exist
**Steps:**
1. From Team detail, click "Add Player to Roster"
2. Select player
3. Set Join Date to today
4. Set Jersey Number to 17
5. Submit

**Expected Result:**
- [ ] Player added to roster
- [ ] Toast: "Player added to team roster"
- [ ] Player appears in team roster list

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-205-08: Jersey Number Unique Within Team
**Priority:** High
**Preconditions:** Player with jersey #17 exists in team
**Steps:**
1. Add another player to same team with jersey #17
2. Submit

**Expected Result:**
- [ ] Validation error: "Jersey number already in use by another player"
- [ ] Addition blocked

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-205-09: Cannot Exceed Squad Size
**Priority:** High
**Preconditions:** Team has Max Squad Size = 15, currently has 15 players
**Steps:**
1. Try to add 16th player
2. Submit

**Expected Result:**
- [ ] Validation error: "Squad size limit reached (15/15)"
- [ ] Addition blocked

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-205-10: Remove Player from Roster with Leave Date
**Priority:** High
**Preconditions:** Player in team roster
**Steps:**
1. From roster, click "Remove" on player
2. Set Leave Date to today
3. Select Reason: "Transfer"
4. Submit

**Expected Result:**
- [ ] Player removed from roster
- [ ] Toast: "Player removed from roster"
- [ ] Player no longer in active roster
- [ ] Team history updated with leave date

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-205-11: View Player Team History
**Priority:** Medium
**Preconditions:** Player has been on multiple teams
**Steps:**
1. View player detail
2. Check "Team History" section

**Expected Result:**
- [ ] All teams listed with Join Date and Leave Date
- [ ] Current teams show "Leave Date: -" or "Current"
- [ ] Historical teams show actual leave dates

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-205-12: Player on Multiple Teams
**Priority:** Medium
**Preconditions:** Player exists
**Steps:**
1. Add player to "1st XI" roster
2. Add same player to "2nd XI" roster
3. Observe

**Expected Result:**
- [ ] Player successfully added to both teams
- [ ] Player detail shows both teams in current roster
- [ ] Different jersey numbers allowed for each team

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-205-13: Cannot Delete Player with Match Stats
**Priority:** High
**Preconditions:** Player has match statistics (future sprint)
**Steps:**
1. Click "Delete" on player with stats
2. Confirm

**Expected Result:**
- [ ] Error: "Cannot delete player with match records"
- [ ] Delete blocked

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:** (May be N/A if match stats not yet implemented)

---

#### TC-205-14: Soft Delete Player
**Priority:** High
**Preconditions:** Player has no match stats
**Steps:**
1. Click "Delete" on player
2. Confirm

**Expected Result:**
- [ ] Player status changed to "Retired"
- [ ] Toast: "Player retired"
- [ ] Removed from active list

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

#### TC-205-15: Offline Create/Update Player
**Priority:** High
**Preconditions:** Network can be toggled
**Steps:**
1. Disable network
2. Create player
3. Re-enable network

**Expected Result:**
- [ ] Queued offline
- [ ] Syncs when online
- [ ] Toast: "Player synced successfully"

**Actual Result:**
**Status:** ⬜ Pass ⬜ Fail ⬜ Blocked ⬜ Not Run
**Notes:**

---

## Test Summary

**Total Test Cases:** 50+

### Test Case Count by Story
| Story ID | Story Name | Test Cases |
|----------|------------|------------|
| PBI-201 | Province Management | 10 |
| PBI-202 | Club Management | 10 |
| PBI-203 | Division Management | 8 |
| PBI-204 | Team Management | 9 |
| PBI-205 | Player Management | 15 |

### Test Execution Summary
- **Total Test Cases:** TBD
- **Passed:** TBD
- **Failed:** TBD
- **Blocked:** TBD
- **Not Run:** TBD
- **Pass Rate:** TBD%

### Defects Found
| Defect ID | Summary | Severity | Status |
|-----------|---------|----------|--------|
| - | - | - | - |

---

## Sign-Off

**Developer Sign-Off:**
- Name:
- Date:
- Signature:

**Tester Sign-Off:**
- Name:
- Date:
- Signature:

**Product Owner Sign-Off:**
- Name:
- Date:
- Signature:

---

**Document Version:** 1.0
**Created:** 2026-02-06
**Last Updated:** TBD
**Author:** Development Team
