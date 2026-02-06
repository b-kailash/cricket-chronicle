# Sprint 3 - User Stories

**Sprint:** Sprint 3 - Organization Hierarchy Management
**Epic:** Epic 2: Organization Hierarchy Management
**Sprint Goal:** Establish complete organization hierarchy (provinces, clubs, divisions, teams, players)

---

## Story Index

| Story ID | Story Name | Story Points | Priority | Status |
|----------|------------|--------------|----------|--------|
| PBI-201 | Province Management | 5 | P0 | READY |
| PBI-202 | Club Management | 8 | P0 | READY |
| PBI-203 | Division Management | 5 | P0 | READY |
| PBI-204 | Team Management | 8 | P0 | READY |
| PBI-205 | Player Management | 13 | P0 | READY |

**Total Story Points:** 39

---

## PBI-201: Province Management

### User Story
**As a** System Administrator
**I want to** create, view, update, and delete provinces
**So that** I can establish the top-level organizational hierarchy for cricket administration

### Story Points: 5

### Priority: P0 - Critical (Must have for MVP)

### Business Value
Provinces are the foundational tier of the organization hierarchy. All clubs, divisions, and teams are organized under provinces. This must be completed before any other organizational entities can be created.

### Acceptance Criteria

#### AC1: Create Province
- [ ] Admin can navigate to Province Management page
- [ ] Admin can click "Add New Province" button
- [ ] Form displays with the following fields:
  - [ ] Name (text input, required, unique validation)
  - [ ] Region Code (text input, required, unique validation, max 10 chars)
  - [ ] Country (dropdown, required, options: South Africa, Australia, England, India, etc.)
  - [ ] Contact Person Name (text input, required)
  - [ ] Contact Person Email (email input, required, validation)
  - [ ] Contact Person Phone (tel input, required, validation)
  - [ ] Status (toggle: Active/Inactive, default Active)
- [ ] Form validation shows errors for invalid/missing fields
- [ ] Submit button disabled until form is valid
- [ ] On submit, POST request to `/api/provinces` with form data
- [ ] Success: Toast notification "Province created successfully"
- [ ] Success: Redirect to province list or show new province details
- [ ] Error: Display error message from API (e.g., "Region Code already exists")
- [ ] If offline: Queue operation, show "Will sync when online" message

#### AC2: View Province List
- [ ] Admin can view list of all provinces in a table/card view
- [ ] Table displays: Name, Region Code, Country, Contact Person, Status
- [ ] List supports pagination (10, 25, 50 items per page)
- [ ] Admin can search provinces by name or region code
- [ ] Admin can filter provinces by:
  - [ ] Country (dropdown)
  - [ ] Status (Active, Inactive, All)
- [ ] Each row has action buttons: View, Edit, Delete
- [ ] Empty state message if no provinces exist: "No provinces found. Create your first province."
- [ ] Loading spinner while fetching data

#### AC3: View Province Details
- [ ] Admin can click "View" on a province row
- [ ] Detail page displays all province information:
  - [ ] Name, Region Code, Country
  - [ ] Contact Person (Name, Email, Phone)
  - [ ] Status badge (Active in green, Inactive in grey)
  - [ ] Created date, Last updated date
  - [ ] Number of clubs under this province (count)
- [ ] "Edit" button navigates to edit form
- [ ] "Back to List" button returns to province list

#### AC4: Update Province
- [ ] Admin can click "Edit" on a province
- [ ] Edit form pre-populates with existing province data
- [ ] Admin can modify any field except Region Code (immutable after creation)
- [ ] Form validation same as create
- [ ] On submit, PUT request to `/api/provinces/:id`
- [ ] Success: Toast notification "Province updated successfully"
- [ ] Success: Return to detail view with updated data
- [ ] Error: Display error message from API
- [ ] If offline: Queue operation, show "Will sync when online" message

#### AC5: Delete Province (Soft Delete)
- [ ] Admin can click "Delete" on a province
- [ ] Confirmation modal appears: "Are you sure you want to deactivate this province?"
- [ ] Modal shows warning if clubs exist: "This province has X clubs. Deactivating will hide it from active lists."
- [ ] If province has clubs, DELETE is blocked: "Cannot delete province with active clubs. Deactivate clubs first."
- [ ] If province has no clubs, DELETE request to `/api/provinces/:id`
- [ ] Success: Province status changes to "Inactive" (soft delete)
- [ ] Success: Toast notification "Province deactivated"
- [ ] Success: Province removed from active list (unless "Show Inactive" filter is on)
- [ ] Error: Display error message
- [ ] If offline: Queue operation

### Technical Implementation

#### Backend API Endpoints
```
POST   /api/provinces          - Create province
GET    /api/provinces          - List provinces (with query params: page, limit, search, country, status)
GET    /api/provinces/:id      - Get province by ID
PUT    /api/provinces/:id      - Update province
DELETE /api/provinces/:id      - Soft delete (set status=Inactive)
```

#### Request/Response Schemas

**Create Province Request:**
```json
{
  "name": "Western Province",
  "regionCode": "WP",
  "country": "South Africa",
  "contactPersonName": "John Smith",
  "contactPersonEmail": "john@wp.cricket",
  "contactPersonPhone": "+27123456789",
  "status": "Active"
}
```

**Province Response:**
```json
{
  "id": 1,
  "name": "Western Province",
  "regionCode": "WP",
  "country": "South Africa",
  "contactPersonName": "John Smith",
  "contactPersonEmail": "john@wp.cricket",
  "contactPersonPhone": "+27123456789",
  "status": "Active",
  "createdAt": "2026-02-06T10:00:00Z",
  "updatedAt": "2026-02-06T10:00:00Z",
  "_count": {
    "clubs": 5
  }
}
```

#### Database Schema (Already Exists)
- Table: `provinces`
- Uses Prisma ORM with PostgreSQL
- Unique constraints: `regionCode`, `name`

#### Frontend Components
- `ProvinceManagement.tsx` - Main page
- `ProvinceList.tsx` - Table/grid view
- `ProvinceForm.tsx` - Create/edit form
- `ProvinceDetail.tsx` - Detail view
- `provinceService.ts` - API client service

### Dependencies
- Sprint 1: Database schema ✅
- Sprint 2: Authentication and API client ✅

### Test Cases
- [ ] TC1: Create province with valid data
- [ ] TC2: Create province with duplicate region code (should fail)
- [ ] TC3: Create province with invalid email (should fail)
- [ ] TC4: View province list with pagination
- [ ] TC5: Search provinces by name
- [ ] TC6: Filter provinces by country
- [ ] TC7: Update province details
- [ ] TC8: Soft delete province with no clubs
- [ ] TC9: Cannot delete province with clubs (validation)
- [ ] TC10: Offline create queues operation

### Definition of Done
- [ ] All acceptance criteria met
- [ ] Backend API endpoints implemented and tested
- [ ] Frontend components render correctly
- [ ] Form validation works (client and server-side)
- [ ] CRUD operations work online and offline
- [ ] Error handling displays user-friendly messages
- [ ] Code committed to sprint branch
- [ ] All test cases pass

---

## PBI-202: Club Management

### User Story
**As a** Province Administrator
**I want to** create and manage clubs with their home venues
**So that** I can organize teams within my province and track where matches are played

### Story Points: 8

### Priority: P0 - Critical

### Business Value
Clubs are the primary organizational unit for teams. Each club has a home ground with GPS coordinates for match venue tracking. This is essential for match scheduling and venue management.

### Acceptance Criteria

#### AC1: Create Club
- [ ] Admin can navigate to Club Management page
- [ ] Admin can click "Add New Club" button
- [ ] Form displays with fields:
  - [ ] Name (text, required, unique within province)
  - [ ] Province (dropdown, required, lists all active provinces)
  - [ ] Home Ground Address (textarea, required)
  - [ ] GPS Latitude (number, optional, decimal)
  - [ ] GPS Longitude (number, optional, decimal)
  - [ ] "Get Current Location" button (uses browser geolocation API)
  - [ ] Ground Capacity (number, optional)
  - [ ] Facilities Available (checkboxes: Pavilion, Practice Nets, Floodlights, Electronic Scoreboard, Changing Rooms, Media Box)
  - [ ] Club POC Name (text, required)
  - [ ] Club POC Email (email, required, validation)
  - [ ] Club POC Phone (tel, required, validation)
  - [ ] Logo/Crest URL (text, optional, URL validation)
  - [ ] Status (toggle: Active/Inactive, default Active)
- [ ] Form validation
- [ ] Submit POSTs to `/api/clubs`
- [ ] Success: Toast "Club created successfully"
- [ ] If offline: Queue operation

#### AC2: View Club List
- [ ] View all clubs in table/card view
- [ ] Table displays: Name, Province, Ground, POC, Status
- [ ] Pagination (10, 25, 50 per page)
- [ ] Search by name or address
- [ ] Filter by:
  - [ ] Province (dropdown)
  - [ ] Status (Active, Inactive, All)
- [ ] Each row: View, Edit, Delete actions
- [ ] Empty state message
- [ ] Loading spinner

#### AC3: View Club Details
- [ ] Detail page shows all club info
- [ ] Display facilities as badges/icons
- [ ] Show club logo if URL provided
- [ ] Show map with GPS marker (optional enhancement)
- [ ] Show count of teams under this club
- [ ] Edit and Back buttons

#### AC4: Update Club
- [ ] Edit form pre-populates
- [ ] Can modify all fields
- [ ] PUT to `/api/clubs/:id`
- [ ] Success toast
- [ ] Offline queue support

#### AC5: Delete Club
- [ ] Delete button with confirmation
- [ ] Block delete if teams exist: "Cannot delete club with teams"
- [ ] If no teams, soft delete (status=Inactive)
- [ ] Success toast
- [ ] Offline queue support

### Technical Implementation

#### Backend API Endpoints
```
POST   /api/clubs              - Create club
GET    /api/clubs              - List clubs (query: provinceId, search, status)
GET    /api/clubs/:id          - Get club by ID
PUT    /api/clubs/:id          - Update club
DELETE /api/clubs/:id          - Soft delete
```

#### Request Schema
```json
{
  "name": "Newlands Cricket Club",
  "provinceId": 1,
  "homeGroundAddress": "Boundary Rd, Newlands, Cape Town, 7700",
  "gpsLatitude": -33.9738,
  "gpsLongitude": 18.4672,
  "groundCapacity": 25000,
  "facilitiesAvailable": ["Pavilion", "Floodlights", "Electronic Scoreboard"],
  "clubPOCName": "Jane Doe",
  "clubPOCEmail": "jane@newlands.cricket",
  "clubPOCPhone": "+27111111111",
  "logoURL": "https://example.com/logo.png",
  "status": "Active"
}
```

#### Frontend Components
- `ClubManagement.tsx`
- `ClubList.tsx`
- `ClubForm.tsx`
- `ClubDetail.tsx`
- `ClubMap.tsx` (optional)
- `clubService.ts`

### Dependencies
- PBI-201 (Province Management must be complete)

### Test Cases
- [ ] TC1: Create club with all fields
- [ ] TC2: Create club with duplicate name in same province (fail)
- [ ] TC3: Get current GPS location via browser
- [ ] TC4: View club list filtered by province
- [ ] TC5: Search clubs by name
- [ ] TC6: Update club details
- [ ] TC7: Cannot delete club with teams
- [ ] TC8: Soft delete club with no teams
- [ ] TC9: Offline create queues operation
- [ ] TC10: Image URL validation

### Definition of Done
- [ ] All AC met
- [ ] Backend APIs tested
- [ ] Frontend renders correctly
- [ ] GPS location feature works (browser API)
- [ ] Validation works (client/server)
- [ ] Offline queue support
- [ ] Test cases pass

---

## PBI-203: Division Management

### User Story
**As a** Province Administrator
**I want to** create and manage divisions by skill level, age group, and gender
**So that** teams can be organized into appropriate competitive groups

### Story Points: 5

### Priority: P0 - Critical

### Business Value
Divisions categorize teams for fair competition by skill level, age, and gender. Critical for tournament organization.

### Acceptance Criteria

#### AC1: Create Division
- [ ] Admin navigates to Division Management
- [ ] Click "Add New Division"
- [ ] Form fields:
  - [ ] Name (text, required, e.g., "Premier Division Men")
  - [ ] Rank Level (dropdown, required: Premier, Division 1, Division 2, Division 3, Division 4, Recreational)
  - [ ] Province (dropdown, required, all active provinces)
  - [ ] Age Group (dropdown, required: Senior, U19, U17, U15, U13, U11)
  - [ ] Gender (dropdown, required: Men, Women, Mixed)
- [ ] Validation
- [ ] POST to `/api/divisions`
- [ ] Success toast
- [ ] Offline queue

#### AC2: View Division List
- [ ] Table view: Name, Rank, Province, Age Group, Gender
- [ ] Pagination
- [ ] Search by name
- [ ] Filter by Province, Rank Level, Age Group, Gender
- [ ] Actions: View, Edit, Delete
- [ ] Empty state
- [ ] Loading spinner

#### AC3: View Division Details
- [ ] Detail page with all info
- [ ] Show count of teams in this division
- [ ] Edit and Back buttons

#### AC4: Update Division
- [ ] Edit form pre-populates
- [ ] PUT to `/api/divisions/:id`
- [ ] Success toast
- [ ] Offline queue

#### AC5: Delete Division
- [ ] Confirmation modal
- [ ] Block if teams assigned: "Cannot delete division with teams"
- [ ] Soft delete if no teams
- [ ] Success toast
- [ ] Offline queue

### Technical Implementation

#### Backend API Endpoints
```
POST   /api/divisions          - Create
GET    /api/divisions          - List (query: provinceId, rankLevel, ageGroup, gender)
GET    /api/divisions/:id      - Get by ID
PUT    /api/divisions/:id      - Update
DELETE /api/divisions/:id      - Soft delete
```

#### Request Schema
```json
{
  "name": "Premier Division Men",
  "rankLevel": "Premier",
  "provinceId": 1,
  "ageGroup": "Senior",
  "gender": "Men"
}
```

#### Frontend Components
- `DivisionManagement.tsx`
- `DivisionList.tsx`
- `DivisionForm.tsx`
- `DivisionDetail.tsx`
- `divisionService.ts`

### Dependencies
- PBI-201 (Province Management)

### Test Cases
- [ ] TC1: Create division with all fields
- [ ] TC2: View divisions filtered by province
- [ ] TC3: Search divisions by name
- [ ] TC4: Update division details
- [ ] TC5: Cannot delete division with teams
- [ ] TC6: Soft delete division with no teams
- [ ] TC7: Offline create queues
- [ ] TC8: Enum validation (rank, age, gender)

### Definition of Done
- [ ] All AC met
- [ ] Backend APIs tested
- [ ] Frontend works
- [ ] Enum dropdowns populated correctly
- [ ] Validation works
- [ ] Offline queue
- [ ] Test cases pass

---

## PBI-204: Team Management

### User Story
**As a** Club Administrator
**I want to** create and manage teams with captain assignments
**So that** I can register my club's teams for competitions and assign leadership roles

### Story Points: 8

### Priority: P0 - Critical

### Business Value
Teams are the competitive units. Captain/vice-captain assignments are critical for match administration and toss decisions.

### Acceptance Criteria

#### AC1: Create Team
- [ ] Admin navigates to Team Management
- [ ] Click "Add New Team"
- [ ] Form fields:
  - [ ] Label (text, required, e.g., "1st XI", "2nd XI", "U19s")
  - [ ] Club (dropdown, required, filtered by user's province)
  - [ ] Primary Division (dropdown, required, lists divisions in same province)
  - [ ] Team POC Name (text, required)
  - [ ] Team POC Email (email, required)
  - [ ] Team POC Phone (tel, required)
  - [ ] Captain (dropdown, optional, lists players in team roster - disabled if no players yet)
  - [ ] Vice-Captain (dropdown, optional, lists players in team roster - disabled if no players yet)
  - [ ] Maximum Squad Size (number, default 15, range 11-30)
  - [ ] Status (toggle: Active/Inactive, default Active)
- [ ] Validation
- [ ] POST to `/api/teams`
- [ ] Success toast
- [ ] Offline queue

#### AC2: View Team List
- [ ] Table: Label, Club, Division, Captain, Status
- [ ] Pagination
- [ ] Search by label or club name
- [ ] Filter by Club, Division, Status
- [ ] Actions: View, Edit, Delete, Manage Roster
- [ ] Empty state
- [ ] Loading spinner

#### AC3: View Team Details
- [ ] All team info displayed
- [ ] Captain and Vice-Captain names (if assigned)
- [ ] Current squad size / Maximum squad size
- [ ] List of players in roster (if any)
- [ ] Edit and Back buttons

#### AC4: Update Team
- [ ] Edit form pre-populates
- [ ] Can change captain/vice-captain from roster
- [ ] PUT to `/api/teams/:id`
- [ ] Success toast
- [ ] Offline queue

#### AC5: Delete Team
- [ ] Confirmation modal
- [ ] Block if matches scheduled: "Cannot delete team with scheduled matches"
- [ ] Soft delete if no matches
- [ ] Success toast
- [ ] Offline queue

#### AC6: Assign Captain/Vice-Captain
- [ ] From team detail, click "Assign Captain"
- [ ] Dropdown shows only players in team roster
- [ ] Validation: Captain and Vice-Captain must be different players
- [ ] Validation: Player can be captain of only one team at a time
- [ ] PUT to `/api/teams/:id` with captainId
- [ ] Success toast
- [ ] Offline queue

### Technical Implementation

#### Backend API Endpoints
```
POST   /api/teams              - Create
GET    /api/teams              - List (query: clubId, divisionId, status)
GET    /api/teams/:id          - Get by ID
PUT    /api/teams/:id          - Update
DELETE /api/teams/:id          - Soft delete
```

#### Request Schema
```json
{
  "label": "1st XI",
  "clubId": 5,
  "divisionId": 2,
  "teamPOCName": "Coach Name",
  "teamPOCEmail": "coach@club.com",
  "teamPOCPhone": "+27222222222",
  "captainId": null,
  "viceCaptainId": null,
  "maxSquadSize": 15,
  "status": "Active"
}
```

#### Frontend Components
- `TeamManagement.tsx`
- `TeamList.tsx`
- `TeamForm.tsx`
- `TeamDetail.tsx`
- `TeamRoster.tsx` (for PBI-205)
- `teamService.ts`

### Dependencies
- PBI-202 (Club Management)
- PBI-203 (Division Management)
- PBI-205 (Player Management - for captain assignment)

### Test Cases
- [ ] TC1: Create team with all fields
- [ ] TC2: View teams filtered by club
- [ ] TC3: Search teams by label
- [ ] TC4: Update team details
- [ ] TC5: Assign captain from roster
- [ ] TC6: Cannot delete team with matches
- [ ] TC7: Soft delete team with no matches
- [ ] TC8: Offline create queues
- [ ] TC9: Captain/vice-captain validation

### Definition of Done
- [ ] All AC met
- [ ] Backend APIs tested
- [ ] Frontend works
- [ ] Cascading dropdowns work (Province → Club, Province → Division)
- [ ] Captain assignment works
- [ ] Validation works
- [ ] Offline queue
- [ ] Test cases pass

---

## PBI-205: Player Management

### User Story
**As a** Team Manager
**I want to** create player profiles, manage team rosters, and record player transfers
**So that** I can maintain accurate squad records and track player history

### Story Points: 13

### Priority: P0 - Critical

### Business Value
Most complex organizational entity. Players have detailed profiles, team history, and can transfer. Essential for scorecards, statistics, and team selection.

### Acceptance Criteria

#### AC1: Create Player
- [ ] Admin navigates to Player Management
- [ ] Click "Add New Player"
- [ ] Form fields:
  - [ ] First Name (text, required)
  - [ ] Last Name (text, required)
  - [ ] Date of Birth (date picker, required)
  - [ ] Photo URL (text, optional, URL validation)
  - [ ] Email (email, optional)
  - [ ] Phone (tel, optional)
  - [ ] Jersey Number (number, optional, 1-99)
  - [ ] Batting Style (dropdown: Right-hand, Left-hand)
  - [ ] Bowling Style (dropdown: Right-arm Fast, Left-arm Fast, Right-arm Medium, Left-arm Medium, Right-arm Off-spin, Left-arm Orthodox, Right-arm Leg-spin, Left-arm Chinaman, None)
  - [ ] Primary Role (dropdown: Batter, Bowler, All-rounder, Wicket-keeper)
  - [ ] Playing Status (dropdown: Active, Injured, Retired, Unavailable, Suspended)
  - [ ] Unique Registration ID (auto-generated as Province-Club-Sequential, e.g., WP-CLUB-001, or manual entry)
- [ ] Validation
- [ ] POST to `/api/players`
- [ ] Success toast
- [ ] Offline queue

#### AC2: View Player List
- [ ] Table: Name, Team(s), Role, Batting, Bowling, Status
- [ ] Pagination
- [ ] Search by name or registration ID
- [ ] Filter by Team, Status, Role
- [ ] Actions: View, Edit, Delete, Manage Roster
- [ ] Empty state
- [ ] Loading spinner

#### AC3: View Player Details
- [ ] All player info displayed
- [ ] Player photo if URL provided
- [ ] Age calculated from DOB
- [ ] Current team(s) displayed
- [ ] Team history table: Team, Join Date, Leave Date
- [ ] Match statistics (future - show placeholder)
- [ ] Edit and Back buttons

#### AC4: Update Player
- [ ] Edit form pre-populates
- [ ] Can modify all fields
- [ ] PUT to `/api/players/:id`
- [ ] Success toast
- [ ] Offline queue

#### AC5: Delete Player
- [ ] Confirmation modal
- [ ] Block if player has match statistics: "Cannot delete player with match records"
- [ ] Soft delete if no stats (status=Retired)
- [ ] Success toast
- [ ] Offline queue

#### AC6: Add Player to Team Roster
- [ ] From team detail page, click "Add Player to Roster"
- [ ] Modal with player search/select dropdown
- [ ] Join Date field (date picker, default today)
- [ ] Validation: Jersey number unique within team
- [ ] Validation: Squad size not exceeded
- [ ] POST to `/api/players/:playerId/roster` with teamId, joinDate
- [ ] Success toast "Player added to team roster"
- [ ] Offline queue

#### AC7: Remove Player from Roster (Transfer/Retirement)
- [ ] From team roster view, click "Remove" on player
- [ ] Modal: "Remove [Player Name] from roster?"
- [ ] Leave Date field (date picker, default today)
- [ ] Reason (dropdown: Transfer, Retirement, Unavailable, Other)
- [ ] DELETE to `/api/players/:playerId/roster/:teamId` with leaveDate
- [ ] Success toast "Player removed from roster"
- [ ] Player remains in system but no longer in team
- [ ] Team history updated with leave date
- [ ] Offline queue

#### AC8: View Player Team History
- [ ] From player detail, "Team History" section
- [ ] Table: Team, Club, Join Date, Leave Date, Status
- [ ] Shows all teams player has been on
- [ ] Current teams show "Leave Date: -" or "Current"
- [ ] Historical teams show actual leave date

### Technical Implementation

#### Backend API Endpoints
```
POST   /api/players                        - Create player
GET    /api/players                        - List (query: teamId, status, role, search)
GET    /api/players/:id                    - Get player by ID
PUT    /api/players/:id                    - Update player
DELETE /api/players/:id                    - Soft delete (status=Retired)
POST   /api/players/:id/roster             - Add to team roster
DELETE /api/players/:id/roster/:teamId     - Remove from roster
GET    /api/players/:id/history            - Get team history
```

#### Request Schema - Create Player
```json
{
  "firstName": "AB",
  "lastName": "de Villiers",
  "dateOfBirth": "1984-02-17",
  "photoURL": "https://example.com/ab.jpg",
  "email": "ab@example.com",
  "phone": "+27333333333",
  "jerseyNumber": 17,
  "battingStyle": "Right-hand",
  "bowlingStyle": "Right-arm Medium",
  "primaryRole": "All-rounder",
  "playingStatus": "Active",
  "registrationId": "WP-NEWLANDS-001"
}
```

#### Request Schema - Add to Roster
```json
{
  "teamId": 3,
  "joinDate": "2026-02-06",
  "jerseyNumber": 17
}
```

#### Frontend Components
- `PlayerManagement.tsx`
- `PlayerList.tsx`
- `PlayerForm.tsx`
- `PlayerDetail.tsx`
- `PlayerHistory.tsx`
- `PlayerRosterModal.tsx` (add/remove from team)
- `playerService.ts`

### Dependencies
- PBI-204 (Team Management must be complete)

### Test Cases
- [ ] TC1: Create player with all fields
- [ ] TC2: Create player with minimal fields
- [ ] TC3: Auto-generate registration ID
- [ ] TC4: View player list filtered by team
- [ ] TC5: Search players by name
- [ ] TC6: Update player details
- [ ] TC7: Add player to team roster
- [ ] TC8: Jersey number unique within team (validation)
- [ ] TC9: Cannot exceed squad size (validation)
- [ ] TC10: Remove player from roster with leave date
- [ ] TC11: View player team history
- [ ] TC12: Player on multiple teams (1st XI and 2nd XI)
- [ ] TC13: Cannot delete player with match stats
- [ ] TC14: Soft delete player (status=Retired)
- [ ] TC15: Offline create/update queues

### Definition of Done
- [ ] All AC met
- [ ] Backend APIs tested
- [ ] Frontend works
- [ ] Roster management works (add/remove)
- [ ] Team history tracked correctly
- [ ] Jersey number validation works
- [ ] Squad size validation works
- [ ] Validation works (client/server)
- [ ] Offline queue
- [ ] Test cases pass

---

## Sprint 3 - Stories Summary

| Story ID | Story Name | Points | Dependencies |
|----------|------------|--------|--------------|
| PBI-201 | Province Management | 5 | None |
| PBI-202 | Club Management | 8 | PBI-201 |
| PBI-203 | Division Management | 5 | PBI-201 |
| PBI-204 | Team Management | 8 | PBI-202, PBI-203 |
| PBI-205 | Player Management | 13 | PBI-204 |
| **TOTAL** | | **39** | |

**Implementation Order:**
1. PBI-201 (Province) - No dependencies
2. PBI-202 (Club) and PBI-203 (Division) - Can be done in parallel after PBI-201
3. PBI-204 (Team) - Requires PBI-202 and PBI-203
4. PBI-205 (Player) - Requires PBI-204

**Recommended Development Approach:**
- Session 1: PBI-201 (Province) - 5 points
- Session 2: PBI-202 (Club), PBI-203 (Division), PBI-204 (Team) - 21 points
- Session 3: PBI-205 (Player) - 13 points

---

**Document Version:** 1.0
**Created:** 2026-02-06
**Author:** Development Team
