# QA Testing Guide - Cricket Chronicle PWA

**Status**: System Deployed and Ready for Testing
**Test Server**: 192.168.1.235
**Start Date**: 2026-02-06

---

## Quick Start for Testers

### 1. Access the Test Server

```bash
# SSH into the test server
ssh -i ~/.ssh/id_ed25519_test_server bkailash@192.168.1.235

# Navigate to application directory
cd /home/bkailash/CricketChronical
```

### 2. Verify Services are Running

```bash
# Check Docker containers
docker compose ps

# Expected output:
# NAME          IMAGE                      STATUS
# cricket-api   cricketchronical-backend   Up 4 hours
# cricket-db    postgres:14-alpine         Up 4 hours (healthy)
```

### 3. Test API Health

```bash
# Quick health check
curl http://localhost:3001/api/health | jq .

# Expected: status: "healthy"
```

---

## API Testing Examples

### Authentication Testing

#### Register a New User

```bash
curl -X POST http://192.168.1.235:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'

# Response includes:
# - accessToken (JWT)
# - refreshToken (JWT)
# - user object with id, email, role
```

#### Get User Profile (Authenticated)

```bash
# Use the accessToken from registration
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -H "Authorization: Bearer $TOKEN" \
  http://192.168.1.235:3001/api/auth/me

# Response includes user details
```

#### Test Missing Authentication

```bash
curl http://192.168.1.235:3001/api/auth/me

# Expected: 401 error with code "NO_TOKEN"
```

### Data Endpoint Testing

#### Get Teams

```bash
curl http://192.168.1.235:3001/api/teams | jq .

# Returns array of teams with:
# - id, name, shortName
# - clubId, divisionId
# - club and division details
# - playerCount
```

#### Get Competitions

```bash
curl http://192.168.1.235:3001/api/competitions | jq .

# Returns array of competitions with:
# - id, name, season, format
# - startDate, endDate
# - status, province, division
# - matchCount
```

#### Get Health Status

```bash
curl http://192.168.1.235:3001/api/health | jq .

# Returns:
# - status, timestamp, version
# - environment, services
# - uptime
```

---

## Database Testing

### Connect to PostgreSQL

```bash
# From test server
docker exec -it cricket-db psql -U cricket_admin -d cricket_chronicle

# Common commands:
\dt              # List tables
\d users         # Describe users table
SELECT * FROM users;  # Query data
```

### Check Database State

```bash
# Count tables
docker exec cricket-db psql -U cricket_admin -d cricket_chronicle -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"

# List all tables
docker exec cricket-db psql -U cricket_admin -d cricket_chronicle -c "\dt"

# Check user records
docker exec cricket-db psql -U cricket_admin -d cricket_chronicle -c \
  "SELECT id, email, role, status FROM users LIMIT 5;"
```

---

## Docker Management Commands

### View Logs

```bash
# Backend API logs (real-time)
docker compose logs -f backend

# PostgreSQL logs (last 20 lines)
docker compose logs postgres | tail -20

# Specific service (5 minute window)
docker compose logs --since 5m backend
```

### Restart Services

```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart backend
docker compose restart postgres

# Full rebuild and restart
docker compose down
docker compose up -d --build
```

### Database Operations

```bash
# Prisma studio (interactive GUI - requires X11)
docker exec cricket-api npx prisma studio

# Check migration status
docker exec cricket-api npx prisma migrate status

# Generate Prisma Client
docker exec cricket-api npx prisma generate
```

---

## Test Scenarios

### Authentication Flow

1. Register new user with valid credentials
2. Receive accessToken and refreshToken
3. Use token to access protected endpoints
4. Attempt to access without token (should fail)
5. Test token expiration (check JWT expiry time)

### Data Integrity

1. Verify seeded teams exist
2. Verify seeded competitions exist
3. Check foreign key relationships
4. Verify data types match schema

### Error Handling

1. Test invalid JSON in POST body
2. Test missing required fields
3. Test invalid email format
4. Test password validation
5. Test duplicate email registration

### API Endpoints

1. GET /api/health - Should always respond
2. GET /api/teams - Should return array
3. GET /api/competitions - Should return array
4. POST /api/auth/register - Should create user
5. GET /api/auth/me - Should require token

---

## Seeded Test Data

### Available Teams

```
1. Cape Town Cricket Club 1st XI
   - Club: Cape Town Cricket Club
   - Division: Premier League
   - Players: 11

2. Stellenbosch Cricket Club 1st XI
   - Club: Stellenbosch Cricket Club
   - Division: Premier League
   - Players: 11
```

### Available Competitions

```
1. WP Premier League 2025-2026
   - Season: 2025-2026
   - Format: T20
   - Status: IN_PROGRESS
   - Matches: 2
```

---

## Testing Best Practices

### 1. Use a Test Email for Each Run

```bash
# Generate unique test email
curl -X POST http://192.168.1.235:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"test-$(date +%s)@example.com\", \"password\": \"TestPass123!\", \"name\": \"QA Tester\"}"
```

### 2. Save Tokens for Multiple Tests

```bash
# Extract and save token
RESPONSE=$(curl -s -X POST http://192.168.1.235:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Pass123!", "name": "Test"}')

TOKEN=$(echo $RESPONSE | jq -r '.data.accessToken')

# Use token for subsequent requests
curl -H "Authorization: Bearer $TOKEN" http://192.168.1.235:3001/api/auth/me
```

### 3. Check Response Codes

```bash
# Get HTTP status code only
curl -s -o /dev/null -w "%{http_code}" http://192.168.1.235:3001/api/teams
# Expected: 200
```

### 4. Log Request Details

```bash
# Verbose curl output
curl -v -X POST http://192.168.1.235:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Pass123!", "name": "Test"}'
```

---

## Troubleshooting

### Services Not Running

```bash
# Check Docker daemon
docker ps

# View docker logs
docker system logs

# Restart Docker (if needed)
sudo systemctl restart docker
```

### Database Connection Issues

```bash
# Test database connectivity
docker exec cricket-db pg_isready -U cricket_admin -d cricket_chronicle

# Check database logs
docker compose logs postgres | tail -20
```

### Backend Not Responding

```bash
# Check backend status
docker compose ps backend

# View backend logs
docker compose logs backend

# Test connectivity
curl -v http://localhost:3001/api/health
```

### High CPU or Memory Usage

```bash
# Check resource usage
docker stats

# Check specific container
docker stats cricket-api

# Stop unnecessary services
docker compose down
```

---

## Testing Documentation References

### Required Reading Before Testing

1. **SRS** (Software Requirements Specification)
   - Location: `Docs/CricketChronical-SRS.md`
   - Content: Complete system requirements

2. **Project State**
   - Location: `ProjectManagement/project-state.md`
   - Content: Current sprint status, blockers, dependencies

3. **Sprint 2 Test Plan**
   - Location: `ProjectManagement/Sprints/Sprint-02.md`
   - Content: Test cases from completed sprint

4. **Deployment Details**
   - Location: `DEPLOYMENT_FINAL_REPORT.md`
   - Content: This deployment's details

### Create Test Plan

Use this template:
```
Test Case ID: TC-001
Title: User Registration
Prerequisites: None
Steps:
  1. POST /api/auth/register with valid email and password
  2. Verify response contains accessToken and refreshToken
  3. Verify user role is PUBLIC
Expected Result: User created successfully
Actual Result: [To be filled during testing]
Status: [PASS/FAIL]
Notes: [Any observations]
```

---

## Test Data Setup

### Creating Test Users

```bash
# Script to create multiple test users
for i in {1..5}; do
  curl -s -X POST http://192.168.1.235:3001/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"qa-test-${i}@example.com\", \"password\": \"QAPass123!\", \"name\": \"QA Tester ${i}\"}"
done
```

### Resetting Test Data

```bash
# WARNING: This will delete all data
docker exec cricket-db psql -U cricket_admin -d cricket_chronicle << 'EOF'
DELETE FROM users WHERE email LIKE '%qa-test%';
EOF

# Restart to reinitialize seed data
docker compose restart backend
```

---

## Performance Testing

### Response Time Check

```bash
# Measure API response time
time curl -s http://192.168.1.235:3001/api/teams > /dev/null

# Expected: < 500ms for typical queries
```

### Load Testing (Basic)

```bash
# Install Apache Bench if not available
ab -n 100 -c 10 http://192.168.1.235:3001/api/health

# Results show:
# - Requests per second
# - Mean time per request
# - Failed requests
```

---

## Reporting Issues

### Format for Defect Reports

```
Title: [Brief description of issue]
Severity: [Critical/High/Medium/Low]
Priority: [Immediate/High/Medium/Low]
Steps to Reproduce:
  1. [Step 1]
  2. [Step 2]
  ...
Expected Result: [What should happen]
Actual Result: [What actually happened]
Environment: Test Server 192.168.1.235
API Version: 1.0.0
Timestamp: [When issue occurred]
Screenshot/Log: [Any evidence]
```

### Create GitHub Issue

```bash
# Format for GitHub issue
# Use gh command if available
gh issue create --title "Issue Title" --body "Description..."

# Or go to: https://github.com/b-kailash/cricket-chronicle/issues
```

---

## Command Quick Reference

| Task | Command |
|------|---------|
| SSH to server | `ssh -i ~/.ssh/id_ed25519_test_server bkailash@192.168.1.235` |
| View services | `docker compose ps` |
| View logs | `docker compose logs -f backend` |
| Test health | `curl http://localhost:3001/api/health` |
| Connect to DB | `docker exec -it cricket-db psql -U cricket_admin -d cricket_chronicle` |
| Restart services | `docker compose restart` |
| View network | `docker network inspect cricketchronical_cricket-network` |
| Check volumes | `docker volume ls \| grep cricket` |

---

## Support

For questions or issues during testing:
1. Review this guide
2. Check deployment logs
3. Review SRS documentation
4. Contact development team

---

**Last Updated**: 2026-02-06
**Status**: Testing Ready ✓
