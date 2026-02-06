# Sprint 3 - Sprint Planning

**Sprint Type:** Feature Development Sprint
**Sprint Duration:** 3 Sessions (Planning, Development, Testing/Retrospective)
**Sprint Start:** 2026-02-06
**Sprint End:** TBD
**Sprint Status:** PLANNING
**Facilitator:** Development Team

---

## Sprint Goal

**Establish the complete organization hierarchy management system (provinces, clubs, divisions, teams, players) to create the foundational data structure required for match creation, player assignments, and tournament organization.**

---

## Sprint Metadata

| Metric | Value |
|--------|-------|
| **Sprint Number** | 3 |
| **Epic** | Epic 2: Organization Hierarchy Management |
| **Priority** | P0 - Critical (MVP Required) |
| **Target Story Points** | 39 |
| **Team Velocity (Avg)** | 24 points per sprint |
| **Velocity Assessment** | Above average (162% of baseline) - ambitious but achievable |
| **Dependencies** | Sprint 1 (Database), Sprint 2 (Frontend-Backend integration) |

---

## Sprint Backlog - Candidate Stories

### Story 1: Province Management (PBI-201)
**Priority:** P0 - Critical
**Story Points:** 5
**Status:** READY

**User Story:**
> As a **System Administrator**, I want to **create, view, update, and delete provinces** so that **I can establish the top-level organizational hierarchy for cricket administration**.

**Business Value:**
Provinces are the foundational tier of the organization hierarchy. All clubs, divisions, and teams are organized under provinces. This is required before any other organizational entities can be created.

**Acceptance Criteria:**
1. Admin can create a new province with:
   - Name (required, unique)
   - Region Code (required, unique)
   - Country (required)
   - Contact Person (Name, Email, Phone)
   - Status (Active/Inactive)
2. Admin can view a list of all provinces with pagination and search
3. Admin can update province details
4. Admin can deactivate (soft delete) a province
5. Cannot delete province if clubs exist under it
6. Frontend form validation for all required fields
7. Backend API endpoints:
   - `POST /api/provinces` - Create province
   - `GET /api/provinces` - List provinces (with pagination, search, filter)
   - `GET /api/provinces/:id` - Get province details
   - `PUT /api/provinces/:id` - Update province
   - `DELETE /api/provinces/:id` - Deactivate province
8. Data persists to PostgreSQL via Prisma
9. Offline support: Queue operations when offline, sync when online

**Technical Notes:**
- Use existing Prisma schema (Province table already exists from Sprint 1)
- Implement frontend components: ProvinceList, ProvinceForm, ProvinceDetail
- Add to navigation menu under "Administration"
- Follow authentication patterns from Sprint 2

**Dependencies:** None (Sprint 1 database, Sprint 2 auth already complete)

---

### Story 2: Club Management (PBI-202)
**Priority:** P0 - Critical
**Story Points:** 8
**Status:** READY

**User Story:**
> As a **Province Administrator**, I want to **create and manage clubs with their home venues** so that **I can organize teams within my province and track where matches are played**.

**Business Value:**
Clubs are the primary organizational unit for teams. Each club has a home ground with GPS coordinates for match venue tracking. This is essential for match scheduling and venue management.

**Acceptance Criteria:**
1. Admin can create a new club with:
   - Name (required, unique within province)
   - Province (required, dropdown selection)
   - Home Ground Address (required)
   - GPS Location (Latitude, Longitude - auto-populated or manual entry)
   - Ground Capacity (optional)
   - Facilities Available (checkbox: Pavilion, Nets, Lights, Scoreboard, etc.)
   - Club POC (Name, Email, Phone)
   - Logo/Crest (Image URL or file upload)
   - Status (Active/Inactive)
2. Admin can view clubs filtered by province
3. Admin can search clubs by name or location
4. Admin can update club details
5. Admin can deactivate a club (soft delete)
6. Cannot delete club if teams exist under it
7. Display clubs on a map view (optional enhancement)
8. Backend API endpoints:
   - `POST /api/clubs` - Create club
   - `GET /api/clubs?provinceId=X` - List clubs by province
   - `GET /api/clubs/:id` - Get club details
   - `PUT /api/clubs/:id` - Update club
   - `DELETE /api/clubs/:id` - Deactivate club
9. Venue details visible in match scheduling

**Technical Notes:**
- GPS location can use browser geolocation API for auto-fill
- Image upload may use base64 encoding or external storage (S3, CloudFlare)
- Consider map integration (Google Maps, Leaflet, Mapbox)
- Implement hierarchical dropdown: Province → Clubs

**Dependencies:** PBI-201 (Province Management must be complete)

---

### Story 3: Division Management (PBI-203)
**Priority:** P0 - Critical
**Story Points:** 5
**Status:** READY

**User Story:**
> As a **Province Administrator**, I want to **create and manage divisions by skill level, age group, and gender** so that **teams can be organized into appropriate competitive groups**.

**Business Value:**
Divisions categorize teams by skill level (Premier, Division 1, Division 2), age group (Senior, U19, U15), and gender (Men, Women, Mixed). This is critical for tournament organization and fair competition.

**Acceptance Criteria:**
1. Admin can create a new division with:
   - Name (required, e.g., "Premier Division", "U19 Division 1")
   - Rank Level (required: Premier, Division 1, Division 2, Division 3, etc.)
   - Province (required, dropdown selection)
   - Age Group (required: Senior, U19, U17, U15, U13, U11, etc.)
   - Gender (required: Men, Women, Mixed)
2. Admin can view divisions filtered by province
3. Admin can search divisions by name or level
4. Admin can update division details
5. Admin can deactivate a division
6. Cannot delete division if teams are assigned to it
7. Backend API endpoints:
   - `POST /api/divisions` - Create division
   - `GET /api/divisions?provinceId=X` - List divisions by province
   - `GET /api/divisions/:id` - Get division details
   - `PUT /api/divisions/:id` - Update division
   - `DELETE /api/divisions/:id` - Deactivate division
8. Division filter in team management screen

**Technical Notes:**
- Rank Level should be an enum or predefined list
- Age Group should be standardized (U11, U13, U15, U17, U19, Senior, etc.)
- Gender should be enum (Men, Women, Mixed)
- Consider validation: One team can be in multiple divisions (e.g., play up)

**Dependencies:** PBI-201 (Province Management must be complete)

---

### Story 4: Team Management (PBI-204)
**Priority:** P0 - Critical
**Story Points:** 8
**Status:** READY

**User Story:**
> As a **Club Administrator**, I want to **create and manage teams with captain assignments** so that **I can register my club's teams for competitions and assign leadership roles**.

**Business Value:**
Teams are the competitive units in matches. Each team belongs to a club and competes in a division. Captain and vice-captain assignments are critical for match administration and toss decisions.

**Acceptance Criteria:**
1. Admin can create a new team with:
   - Label (required, e.g., "1st XI", "2nd XI", "U19s")
   - Club (required, dropdown filtered by user's province)
   - Primary Division (required, dropdown)
   - Team POC (Name, Email, Phone)
   - Captain (Player FK - dropdown, optional initially)
   - Vice-Captain (Player FK - dropdown, optional initially)
   - Maximum Squad Size (default: 15)
   - Status (Active/Inactive)
2. Admin can view teams filtered by club or division
3. Admin can search teams by name or club
4. Admin can update team details
5. Admin can assign/change captain and vice-captain from player roster
6. Admin can deactivate a team
7. Cannot delete team if matches are scheduled for it
8. Backend API endpoints:
   - `POST /api/teams` - Create team
   - `GET /api/teams?clubId=X&divisionId=Y` - List teams with filters
   - `GET /api/teams/:id` - Get team details
   - `PUT /api/teams/:id` - Update team
   - `DELETE /api/teams/:id` - Deactivate team
9. Team selection dropdown in match creation

**Technical Notes:**
- Captain and Vice-Captain can only be assigned from players in team roster
- Consider validation: Player can be captain of only one team
- Squad size limit should be configurable
- Implement cascading dropdowns: Province → Club → Team

**Dependencies:** PBI-202 (Club Management), PBI-203 (Division Management)

---

### Story 5: Player Management (PBI-205)
**Priority:** P0 - Critical
**Story Points:** 13
**Status:** READY

**User Story:**
> As a **Team Manager**, I want to **create player profiles, manage team rosters, and record player transfers** so that **I can maintain accurate squad records and track player history**.

**Business Value:**
Player management is the most complex organizational entity. Players have detailed profiles (batting/bowling styles, roles), team history with join/leave dates, and can transfer between teams. This data is essential for match scorecards, statistics, and team selection.

**Acceptance Criteria:**
1. Admin can create a new player with:
   - Name (First, Last - required)
   - Date of Birth (required for age verification)
   - Photo URL (optional)
   - Contact (Email, Phone - optional)
   - Jersey Number (optional, unique within team)
   - Batting Style (Right-hand, Left-hand)
   - Bowling Style (Right-arm Fast, Left-arm Spin, Right-arm Off-spin, etc.)
   - Primary Role (Batter, Bowler, All-rounder, Wicket-keeper)
   - Playing Status (Active, Injured, Retired, Unavailable)
   - Unique Registration ID (auto-generated or manual)
2. Admin can add player to team roster with join date
3. Admin can remove player from roster with leave date (transfer/retirement)
4. Player can be on multiple team rosters (e.g., 1st XI and 2nd XI)
5. Admin can view player team history (all teams with join/leave dates)
6. Admin can update player profile details
7. Admin can search players by name, team, or registration ID
8. Admin can filter players by status (Active, Injured, etc.)
9. Cannot delete player if they have match statistics
10. Backend API endpoints:
    - `POST /api/players` - Create player
    - `GET /api/players?teamId=X&status=Active` - List players with filters
    - `GET /api/players/:id` - Get player details with team history
    - `PUT /api/players/:id` - Update player
    - `POST /api/players/:id/roster` - Add player to team roster
    - `DELETE /api/players/:id/roster/:teamId` - Remove from roster
    - `GET /api/players/:id/history` - Get team history
11. Player selection dropdown in team captain assignment
12. Player selection in match squad (future sprint)

**Technical Notes:**
- Batting Style: enum (Right-hand, Left-hand)
- Bowling Style: enum (Right-arm Fast, Left-arm Fast, Right-arm Medium, Left-arm Medium, Right-arm Off-spin, Left-arm Orthodox, Right-arm Leg-spin, Left-arm Chinaman, etc.)
- Primary Role: enum (Batter, Bowler, All-rounder, Wicket-keeper)
- Playing Status: enum (Active, Injured, Retired, Unavailable, Suspended)
- Consider CSV import for bulk player registration
- Photo upload should support common image formats (JPG, PNG)
- Registration ID format: Province-Club-Sequential (e.g., WP-CLUB-001)

**Dependencies:** PBI-204 (Team Management must be complete)

---

## Sprint Summary

### Total Story Points: 39
| Story ID | Story Name | Points |
|----------|------------|--------|
| PBI-201 | Province Management | 5 |
| PBI-202 | Club Management | 8 |
| PBI-203 | Division Management | 5 |
| PBI-204 | Team Management | 8 |
| PBI-205 | Player Management | 13 |
| **TOTAL** | | **39** |

### Velocity Analysis
- **Team Average Velocity:** 24 points per sprint
- **Sprint 3 Planned:** 39 points
- **Percentage of Baseline:** 162%
- **Assessment:** Ambitious but achievable
- **Rationale:**
  - All stories follow similar CRUD patterns established in Sprint 2
  - Database schema already exists (Sprint 1)
  - Authentication and API patterns proven (Sprint 2)
  - No complex algorithm or integration requirements
  - May require 3 full sessions vs. 2

---

## Definition of Done

A story is considered DONE when:
1. All acceptance criteria are met
2. Code is committed to sprint branch
3. Backend API endpoints tested with Postman/curl
4. Frontend components render correctly
5. Data persists to PostgreSQL
6. Offline queue handles create/update operations
7. Error handling provides user feedback (toasts)
8. Code reviewed (self-review minimum)
9. Test cases documented in TestPlan.md
10. No critical bugs or errors

---

## Technical Architecture

### Backend Components (Node.js + Prisma)
- **Routes:** `/api/provinces`, `/api/clubs`, `/api/divisions`, `/api/teams`, `/api/players`
- **Controllers:** ProvinceController, ClubController, DivisionController, TeamController, PlayerController
- **Services:** ProvinceService, ClubService, DivisionService, TeamService, PlayerService
- **Validation:** Zod schemas for request validation
- **Database:** Prisma ORM with PostgreSQL (schema already exists)

### Frontend Components (React + TypeScript)
- **Pages:**
  - ProvinceManagement, ClubManagement, DivisionManagement, TeamManagement, PlayerManagement
- **Components:**
  - ProvinceList, ProvinceForm, ProvinceDetail
  - ClubList, ClubForm, ClubDetail, ClubMap (optional)
  - DivisionList, DivisionForm, DivisionDetail
  - TeamList, TeamForm, TeamDetail, TeamRoster
  - PlayerList, PlayerForm, PlayerDetail, PlayerHistory
- **Services:**
  - provinceService.ts, clubService.ts, divisionService.ts, teamService.ts, playerService.ts
- **State Management:** React Context or Redux (follow Sprint 2 patterns)

### Database Schema (Already Exists - Sprint 1)
Tables: `provinces`, `clubs`, `divisions`, teams`, `players`, `player_team_history`

---

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| High story points (39) exceed velocity | Medium | High | Prioritize PBI-201 through PBI-204; PBI-205 (Player) can partially carry to Sprint 4 if needed |
| Complex relationships between entities | Low | Medium | Database schema already validated; follow foreign key relationships |
| Image upload for club logos/player photos | Medium | Low | Use base64 encoding initially; defer to external storage later |
| GPS location accuracy | Low | Low | Allow manual entry; geolocation is enhancement |
| Player transfer logic complexity | Medium | Medium | Keep simple for MVP; advanced transfer windows can be future enhancement |

---

## Sprint Schedule (Proposed)

### Session 1: Planning & Setup (This Session)
- Review and approve sprint backlog
- Create sprint branch: `sprint-3/organization-hierarchy`
- Set up backend routes and controllers skeleton
- Create frontend page scaffolding

### Session 2: Development (Main Work)
- **PBI-201:** Province Management (Backend + Frontend)
- **PBI-202:** Club Management (Backend + Frontend)
- **PBI-203:** Division Management (Backend + Frontend)
- **PBI-204:** Team Management (Backend + Frontend)
- **PBI-205 (Partial):** Player Management (Backend API at minimum)

### Session 3: Testing & Retrospective
- Complete PBI-205 frontend components
- Execute test plan (all CRUD operations)
- Fix any defects
- Document test results
- Conduct sprint retrospective
- Merge to main

---

## Dependencies

### Completed (No Blockers)
- ✅ Sprint 1: Database schema with all tables
- ✅ Sprint 2: Authentication and API integration patterns
- ✅ Sprint 2: Offline queue and error handling

### External Dependencies
- None

---

## Success Criteria

Sprint 3 is successful if:
1. All 5 stories (PBI-201 through PBI-205) are complete
2. Admin can create the full organization hierarchy: Province → Club → Division → Team → Player
3. All CRUD operations work both online and offline
4. Data relationships are enforced (e.g., cannot delete club if teams exist)
5. Frontend provides clear navigation and user feedback
6. Test pass rate ≥ 95%
7. Zero critical defects

---

## Notes

- This sprint establishes the foundational data structure for all future features
- Player management (PBI-205) is the most complex story; allocate sufficient time
- Consider incremental delivery: Backend APIs first, then frontend components
- Leverage existing patterns from Sprint 2 (auth, API client, error handling)
- GPS and image upload features can be simplified for MVP if needed

---

**Sprint Planning Status:** PENDING PRODUCT OWNER APPROVAL

**Next Steps:**
1. Product Owner reviews and approves sprint backlog
2. Create sprint branch: `sprint-3/organization-hierarchy`
3. Update project-state.md to mark Sprint 3 as "In Progress"
4. Begin Session 2 development work

---

**Document Version:** 1.0
**Created:** 2026-02-06
**Author:** Development Team
