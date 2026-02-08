# Cricket Chronicle API Reference

> **Version**: 1.0.0
> **Base URL**: `http://localhost:3001`
> **API Prefix**: `/api`
> **Last Updated**: February 6, 2026 (Sprint 2 Complete)

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Error Handling](#error-handling)
4. [Endpoints](#endpoints)
   - [Root](#root)
   - [Health](#health)
   - [Auth](#auth)
   - [Matches](#matches)
   - [Deliveries](#deliveries)
   - [Teams](#teams)
   - [Competitions](#competitions)
5. [Data Models](#data-models)

---

## Overview

| Property | Value |
|----------|-------|
| Total Endpoints | 27 |
| Protocol | HTTP/HTTPS |
| Content-Type | `application/json` |
| Rate Limit | 100 requests / 15 minutes per IP |
| CORS Origin | `http://localhost:5173` |
| Body Size Limit | 10 MB |
| Security | Helmet.js, Morgan request logging |

### Key Architecture Features

- **Offline-First**: LocalId (UUID) support for offline creation, sync status tracking, batch delivery sync
- **Real-time Scoring**: Ball-by-ball delivery tracking with automatic scorecard generation
- **Conflict Resolution**: Delivery conflict detection (409), upsert-based token storage
- **Validation**: Zod schemas on all mutation endpoints, type-safe Prisma ORM

---

## Authentication

### JWT Token Scheme

| Token | Lifetime | Storage |
|-------|----------|---------|
| Access Token | 1 hour (configurable via `JWT_EXPIRES_IN`) | Client memory |
| Refresh Token | 7 days (configurable via `JWT_REFRESH_EXPIRES_IN`) | Database (max 5 per user) |

**Access token payload**: `{ userId, email, role }`

### Authorization Header

```
Authorization: Bearer <access_token>
```

### Middleware Types

| Middleware | Behavior |
|-----------|----------|
| `authenticate` | Requires valid JWT. Returns 401 if missing or invalid. |
| `optionalAuth` | Accepts token if present, proceeds without if absent. |
| `authorize(...roles)` | Role-based check after authentication. Returns 403 if forbidden. |

---

## Error Handling

All errors follow a consistent envelope:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": {},
    "stack": "..."
  }
}
```

> `stack` is included only when `NODE_ENV=development`.

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request body/params failed Zod validation |
| `NO_TOKEN` | 401 | Authorization header missing |
| `INVALID_TOKEN_FORMAT` | 401 | Token is not a valid Bearer token |
| `TOKEN_EXPIRED` | 401 | Access token has expired |
| `INVALID_TOKEN` | 401 | Token signature verification failed |
| `TOKEN_REVOKED` | 401 | Refresh token revoked or expired |
| `NOT_AUTHENTICATED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient role permissions |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Resource conflict (e.g., duplicate delivery localId) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests from this IP |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Endpoints

### Root

#### `GET /`

API information endpoint.

- **Auth**: None

**Response** `200`
```json
{
  "name": "Cricket Chronicle API",
  "version": "1.0.0",
  "status": "running",
  "docs": "/api/health"
}
```

---

### Health

Base path: `/api/health`

#### `GET /api/health`

Main health check with database connectivity status.

- **Auth**: None

**Response** `200` (healthy) / `503` (degraded)
```json
{
  "status": "healthy",
  "timestamp": "2026-02-06T12:00:00.000Z",
  "version": "1.0.0",
  "environment": "development",
  "services": {
    "api": "up",
    "database": "connected"
  },
  "uptime": 3600.5
}
```

---

#### `GET /api/health/live`

Kubernetes liveness probe.

- **Auth**: None

**Response** `200`
```json
{ "status": "alive" }
```

---

#### `GET /api/health/ready`

Kubernetes readiness probe. Verifies database connection.

- **Auth**: None

**Response** `200` (ready) / `503` (not ready)
```json
{ "status": "ready" }
```

---

### Auth

Base path: `/api/auth`

#### `POST /api/auth/register`

Register a new user account.

- **Auth**: None

**Request Body**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Min 8 characters |
| `firstName` | string | No | |
| `lastName` | string | No | |
| `role` | enum | No | `PUBLIC` (default), `SCORER` |

**Response** `201`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "role": "PUBLIC"
    },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  },
  "message": "User registered successfully"
}
```

---

#### `POST /api/auth/login`

Authenticate with email and password.

- **Auth**: None

**Request Body**
| Field | Type | Required |
|-------|------|----------|
| `email` | string | Yes |
| `password` | string | Yes |

**Response** `200`
```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "email": "user@example.com", "role": "PUBLIC" },
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

---

#### `POST /api/auth/refresh`

Obtain new tokens using a refresh token.

- **Auth**: None (refresh token in body)

**Request Body**
| Field | Type | Required |
|-------|------|----------|
| `refreshToken` | string | Yes |

**Response** `200`
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG..."
  }
}
```

---

#### `POST /api/auth/logout`

Revoke a refresh token.

- **Auth**: None

**Request Body**
| Field | Type | Required |
|-------|------|----------|
| `refreshToken` | string | No |

**Response** `200`
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### `GET /api/auth/me`

Get the currently authenticated user's profile.

- **Auth**: **Required**

**Response** `200`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "PUBLIC",
    "status": "ACTIVE"
  }
}
```

---

### Matches

Base path: `/api/matches`

#### `POST /api/matches`

Create a new cricket match.

- **Auth**: **Required**

**Request Body**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `localId` | UUID | No | For offline-created matches |
| `matchNumber` | string | No | |
| `competitionId` | integer | No | Positive |
| `homeTeamId` | integer | Yes | Positive |
| `awayTeamId` | integer | Yes | Positive |
| `venueClubId` | integer | No | Positive |
| `scheduledStart` | ISO-8601 | No | |
| `oversPerInnings` | integer | No | Positive |
| `tossWinnerId` | integer | No | Positive |
| `tossDecision` | enum | No | `BAT`, `FIELD` |
| `createdOffline` | boolean | No | |

**Response** `201`
```json
{
  "success": true,
  "data": { "id": 1, "matchNumber": "M001", "status": "SCHEDULED", "..." : "..." },
  "message": "Match created successfully"
}
```

---

#### `GET /api/matches`

List matches with optional filtering and pagination.

- **Auth**: Optional

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `competitionId` | integer | Filter by competition |
| `teamId` | integer | Filter by team (home or away) |
| `status` | enum | `SCHEDULED`, `LIVE`, `COMPLETED` |
| `limit` | integer | Results per page (default: 20) |
| `offset` | integer | Pagination offset (default: 0) |

**Response** `200`
```json
{
  "success": true,
  "data": {
    "matches": [ { "id": 1, "matchNumber": "M001", "..." : "..." } ],
    "pagination": { "total": 50, "limit": 20, "offset": 0 }
  }
}
```

---

#### `GET /api/matches/:id`

Get detailed match information including teams, venue, and innings.

- **Auth**: Optional
- **Params**: `id` (integer) - Match ID

**Response** `200`
```json
{
  "success": true,
  "data": {
    "id": 1,
    "matchNumber": "M001",
    "status": "LIVE",
    "homeTeam": { "id": 1, "name": "Club A 1st XI" },
    "awayTeam": { "id": 2, "name": "Club B 1st XI" },
    "venue": { "id": 1, "name": "Main Ground" },
    "innings": []
  }
}
```

---

#### `PATCH /api/matches/:id`

Update match details.

- **Auth**: **Required**
- **Params**: `id` (integer) - Match ID

**Request Body**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `matchNumber` | string | No | |
| `status` | enum | No | `SCHEDULED`, `LIVE`, `INNINGS_BREAK`, `COMPLETED`, `ABANDONED`, `NO_RESULT`, `POSTPONED` |
| `tossWinnerId` | integer | No | Positive |
| `tossDecision` | enum | No | `BAT`, `FIELD` |
| `actualStart` | ISO-8601 | No | |
| `actualEnd` | ISO-8601 | No | |
| `resultSummary` | string | No | |
| `weatherConditions` | string | No | |
| `pitchReport` | string | No | |

**Response** `200`
```json
{
  "success": true,
  "data": { "id": 1, "status": "LIVE", "..." : "..." }
}
```

---

#### `POST /api/matches/:id/innings`

Create an innings for a match.

- **Auth**: **Required**
- **Params**: `id` (integer) - Match ID

**Request Body**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `localId` | UUID | No | For offline-created innings |
| `battingTeamId` | integer | Yes | Positive |
| `bowlingTeamId` | integer | Yes | Positive |
| `inningsNumber` | integer | Yes | 1-4 |
| `targetScore` | integer | No | Positive |
| `createdOffline` | boolean | No | |

**Response** `201`
```json
{
  "success": true,
  "data": { "id": 1, "inningsNumber": 1, "battingTeamId": 1, "..." : "..." },
  "message": "Innings created successfully"
}
```

---

#### `GET /api/matches/:id/innings`

Get all innings for a match.

- **Auth**: Optional
- **Params**: `id` (integer) - Match ID

**Response** `200`
```json
{
  "success": true,
  "data": [
    { "id": 1, "inningsNumber": 1, "battingTeamId": 1, "bowlingTeamId": 2, "..." : "..." }
  ]
}
```

---

#### `GET /api/matches/:id/sync-status`

Get sync status for offline-created match data.

- **Auth**: **Required**
- **Params**: `id` (integer) - Match ID

**Response** `200`
```json
{
  "success": true,
  "data": {
    "syncStatus": "SYNCED",
    "lastSyncedAt": "2026-02-06T12:00:00.000Z",
    "pendingDeliveries": 0
  }
}
```

> `syncStatus` values: `PENDING`, `SYNCED`, `CONFLICT`, `FAILED`

---

### Deliveries

Base path: `/api/deliveries`

#### `POST /api/deliveries`

Sync a single delivery (ball-by-ball scoring).

- **Auth**: **Required**

**Request Body**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `localId` | UUID | Yes | Unique identifier from client |
| `inningsId` | integer | Yes | Positive |
| `overNumber` | integer | Yes | >= 0 |
| `ballNumber` | integer | Yes | 1-10 |
| `sequenceNumber` | integer | Yes | Positive |
| `bowlerId` | integer | Yes | Positive |
| `strikerId` | integer | Yes | Positive |
| `nonStrikerId` | integer | Yes | Positive |
| `runsOffBat` | integer | No | 0-6 |
| `extraType` | enum | No | `WIDE`, `NO_BALL`, `BYE`, `LEG_BYE`, `PENALTY` |
| `extraRuns` | integer | No | >= 0 |
| `totalRuns` | integer | No | >= 0 |
| `isLegalDelivery` | boolean | No | |
| `isWicket` | boolean | No | |
| `wicketType` | enum | No | `BOWLED`, `CAUGHT`, `LBW`, `RUN_OUT`, `STUMPED`, `HIT_WICKET`, `CAUGHT_AND_BOWLED`, `OBSTRUCTING_FIELD`, `TIMED_OUT`, `HIT_BALL_TWICE`, `RETIRED_OUT`, `RETIRED_HURT` |
| `dismissedPlayerId` | integer | No | Positive |
| `fielderId` | integer | No | Positive |
| `shotType` | string | No | |
| `ballZone` | string | No | |
| `commentary` | string | No | |
| `timestamp` | ISO-8601 | No | |
| `createdOffline` | boolean | No | |

**Response** `201` (created) / `409` (conflict)
```json
{
  "success": true,
  "data": {
    "id": 123,
    "serverId": 123,
    "localId": "550e8400-e29b-41d4-a716-446655440000",
    "synced": true,
    "conflict": false,
    "syncedAt": "2026-02-06T12:00:00.000Z"
  }
}
```

---

#### `POST /api/deliveries/batch`

Sync multiple deliveries in a single request.

- **Auth**: **Required**

**Request Body**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `deliveries` | array | Yes | 1-100 delivery objects (same schema as single sync) |

**Response** `200`
```json
{
  "success": true,
  "data": {
    "results": [
      { "localId": "...", "synced": true, "conflict": false, "serverId": 1 }
    ],
    "summary": {
      "total": 50,
      "synced": 48,
      "conflicts": 2,
      "failed": 0
    }
  }
}
```

---

#### `GET /api/deliveries/:id`

Get a single delivery by server ID.

- **Auth**: **Required**
- **Params**: `id` (integer) - Delivery ID

**Response** `200`
```json
{
  "success": true,
  "data": {
    "id": 123,
    "overNumber": 5,
    "ballNumber": 3,
    "runsOffBat": 4,
    "bowler": { "id": 10, "firstName": "James", "lastName": "Anderson" },
    "striker": { "id": 20, "firstName": "Virat", "lastName": "Kohli" },
    "..." : "..."
  }
}
```

---

#### `PATCH /api/deliveries/:id`

Update a delivery record.

- **Auth**: **Required**
- **Params**: `id` (integer) - Delivery ID

**Request Body**
| Field | Type | Required |
|-------|------|----------|
| `runsOffBat` | integer (0-6) | No |
| `extraType` | enum or null | No |
| `extraRuns` | integer (>= 0) | No |
| `totalRuns` | integer (>= 0) | No |
| `isWicket` | boolean | No |
| `wicketType` | enum or null | No |
| `dismissedPlayerId` | integer or null | No |
| `fielderId` | integer or null | No |
| `shotType` | string or null | No |
| `ballZone` | string or null | No |
| `commentary` | string or null | No |

**Response** `200`
```json
{
  "success": true,
  "data": { "id": 123, "runsOffBat": 4, "..." : "..." }
}
```

---

#### `GET /api/deliveries/innings/:inningsId`

Get all deliveries for an innings, ordered by sequence.

- **Auth**: **Required**
- **Params**: `inningsId` (integer)

**Response** `200`
```json
{
  "success": true,
  "data": [
    { "id": 1, "overNumber": 0, "ballNumber": 1, "..." : "..." },
    { "id": 2, "overNumber": 0, "ballNumber": 2, "..." : "..." }
  ]
}
```

---

#### `GET /api/deliveries/match/:matchId`

Get all deliveries across all innings for a match.

- **Auth**: **Required**
- **Params**: `matchId` (integer)

**Response** `200`
```json
{
  "success": true,
  "data": [
    { "id": 1, "inningsId": 1, "overNumber": 0, "ballNumber": 1, "..." : "..." }
  ]
}
```

---

### Teams

Base path: `/api/teams`

#### `GET /api/teams`

List all teams with club and division info.

- **Auth**: Optional

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `divisionId` | integer | Filter by division |
| `clubId` | integer | Filter by club |
| `status` | enum | `ACTIVE` (default), `INACTIVE`, `SUSPENDED` |

**Response** `200`
```json
[
  {
    "id": "1",
    "name": "Club A 1st XI",
    "shortName": "1st XI",
    "clubId": "1",
    "divisionId": "2",
    "club": { "id": "1", "name": "Club A" },
    "division": { "id": "2", "name": "Premier League" },
    "playerCount": 15
  }
]
```

---

#### `GET /api/teams/:id`

Get team details with full player roster.

- **Auth**: Optional
- **Params**: `id` (integer) - Team ID

**Response** `200`
```json
{
  "id": "1",
  "name": "Club A 1st XI",
  "shortName": "1st XI",
  "clubId": "1",
  "divisionId": "2",
  "club": { "id": "1", "name": "Club A" },
  "division": { "id": "2", "name": "Premier League" },
  "players": [
    {
      "id": "123",
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1995-03-15T00:00:00.000Z",
      "battingStyle": "RIGHT_HANDED",
      "bowlingStyle": "RIGHT_ARM_FAST",
      "role": "ALL_ROUNDER",
      "teamId": "1",
      "jerseyNumber": 10
    }
  ]
}
```

---

#### `GET /api/teams/:id/players`

Get active players for a team, sorted by role and name.

- **Auth**: Optional
- **Params**: `id` (integer) - Team ID

**Response** `200`
```json
[
  {
    "id": "123",
    "firstName": "John",
    "lastName": "Doe",
    "dateOfBirth": "1995-03-15T00:00:00.000Z",
    "battingStyle": "RIGHT_HANDED",
    "bowlingStyle": "RIGHT_ARM_FAST",
    "role": "ALL_ROUNDER",
    "teamId": "1"
  }
]
```

---

### Competitions

Base path: `/api/competitions`

#### `GET /api/competitions`

List all competitions with optional filters.

- **Auth**: Optional

**Query Parameters**
| Param | Type | Description |
|-------|------|-------------|
| `status` | enum | `UPCOMING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `divisionId` | integer | Filter by division |
| `provinceId` | integer | Filter by province |

**Response** `200`
```json
[
  {
    "id": "1",
    "name": "Premier T20 League 2026",
    "season": "2025-2026",
    "format": "T20",
    "startDate": "2026-01-15T00:00:00.000Z",
    "endDate": "2026-04-30T00:00:00.000Z",
    "status": "IN_PROGRESS",
    "province": { "id": "1", "name": "Western Province" },
    "division": { "id": "2", "name": "Premier League" },
    "matchCount": 24
  }
]
```

> `format` values: `T20`, `ODI`, `LIST_A`, `FIRST_CLASS`, `TEST`, `OTHER`

---

#### `GET /api/competitions/:id`

Get competition details with all associated matches.

- **Auth**: Optional
- **Params**: `id` (integer) - Competition ID

**Response** `200`
```json
{
  "id": "1",
  "name": "Premier T20 League 2026",
  "season": "2025-2026",
  "format": "T20",
  "startDate": "2026-01-15T00:00:00.000Z",
  "endDate": "2026-04-30T00:00:00.000Z",
  "status": "IN_PROGRESS",
  "province": { "id": "1", "name": "Western Province" },
  "division": { "id": "2", "name": "Premier League" },
  "matches": [
    {
      "id": "10",
      "matchNumber": "M001",
      "status": "COMPLETED",
      "scheduledStart": "2026-01-20T14:00:00.000Z",
      "homeTeam": "Club A 1st XI",
      "awayTeam": "Club B 1st XI"
    }
  ]
}
```

---

## Data Models

### Enums

**User Roles**: `ADMIN`, `PROVINCIAL_ADMIN`, `CLUB_ADMIN`, `SCORER`, `PUBLIC`

**Match Status**: `SCHEDULED`, `LIVE`, `INNINGS_BREAK`, `COMPLETED`, `ABANDONED`, `NO_RESULT`, `POSTPONED`

**Toss Decision**: `BAT`, `FIELD`

**Extra Type**: `WIDE`, `NO_BALL`, `BYE`, `LEG_BYE`, `PENALTY`

**Wicket Type**: `BOWLED`, `CAUGHT`, `LBW`, `RUN_OUT`, `STUMPED`, `HIT_WICKET`, `CAUGHT_AND_BOWLED`, `OBSTRUCTING_FIELD`, `TIMED_OUT`, `HIT_BALL_TWICE`, `RETIRED_OUT`, `RETIRED_HURT`

**Sync Status**: `PENDING`, `SYNCED`, `CONFLICT`, `FAILED`

**Match Format**: `T20`, `ODI`, `LIST_A`, `FIRST_CLASS`, `TEST`, `OTHER`

**Batting Style**: `RIGHT_HANDED`, `LEFT_HANDED`

**Player Role**: `BATSMAN`, `BOWLER`, `ALL_ROUNDER`, `WICKET_KEEPER`

**Entity Status**: `ACTIVE`, `INACTIVE`, `SUSPENDED`

### Entity Hierarchy

```
Province
  └── Club
        └── Team
              └── Player
  └── Division
        └── Competition
              └── Match
                    └── Innings (1-4)
                          └── Delivery (ball-by-ball)
```

### Source Files

| Module | Route File | Service File |
|--------|-----------|--------------|
| Health | `backend/src/routes/health.ts` | - |
| Auth | `backend/src/routes/auth.ts` | `backend/src/services/auth.ts` |
| Matches | `backend/src/routes/matches.ts` | `backend/src/services/match.ts` |
| Deliveries | `backend/src/routes/deliveries.ts` | `backend/src/services/delivery.ts` |
| Teams | `backend/src/routes/teams.ts` | - (inline) |
| Competitions | `backend/src/routes/competitions.ts` | - (inline) |

**Middleware**: `backend/src/middleware/auth.ts` (authenticate, optionalAuth, authorize)
**Validation**: `backend/src/schemas/` (Zod schemas per module)
**Database**: `backend/prisma/schema.prisma`
