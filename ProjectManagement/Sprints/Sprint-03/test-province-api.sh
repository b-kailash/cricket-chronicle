#!/bin/bash

# Sprint 3 - PBI-201: Province Management API Test Script
# Test Server: 192.168.1.235:3001
# Tests all Province CRUD operations

set -e

BASE_URL="http://192.168.1.235:3001/api"
AUTH_TOKEN=""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Sprint 3 - Province API Test Suite"
echo "Test Server: 192.168.1.235:3001"
echo "=========================================="
echo ""

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Health check passed${NC}"
    echo "$BODY" | jq '.'
else
    echo -e "${RED}✗ Health check failed (HTTP $HTTP_CODE)${NC}"
    echo "$BODY"
fi
echo ""
sleep 1

# Test 2: Login (Get Auth Token)
echo -e "${YELLOW}Test 2: Login - Get Auth Token${NC}"
LOGIN_RESPONSE=$(curl -s -X POST -w "\n%{http_code}" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@cricket.com","password":"Admin123!"}' \
    "${BASE_URL}/auth/login")
HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
BODY=$(echo "$LOGIN_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Login successful${NC}"
    AUTH_TOKEN=$(echo "$BODY" | jq -r '.data.accessToken')
    echo "Token: ${AUTH_TOKEN:0:50}..."
else
    echo -e "${RED}✗ Login failed (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq '.'
    exit 1
fi
echo ""
sleep 1

# Test 3: Create Province
echo -e "${YELLOW}Test 3: Create Province - Valid Data${NC}"
CREATE_RESPONSE=$(curl -s -X POST -w "\n%{http_code}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d '{
        "name": "Western Province",
        "regionCode": "WP",
        "country": "South Africa",
        "contactName": "John Smith",
        "contactEmail": "john@wp.cricket",
        "contactPhone": "+27123456789",
        "status": "ACTIVE"
    }' \
    "${BASE_URL}/provinces")
HTTP_CODE=$(echo "$CREATE_RESPONSE" | tail -n1)
BODY=$(echo "$CREATE_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ]; then
    echo -e "${GREEN}✓ Province created successfully${NC}"
    PROVINCE_ID=$(echo "$BODY" | jq -r '.data.id')
    echo "Province ID: $PROVINCE_ID"
    echo "$BODY" | jq '.data'
else
    echo -e "${RED}✗ Create province failed (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq '.'
fi
echo ""
sleep 1

# Test 4: Create Province - Duplicate Region Code (Should Fail)
echo -e "${YELLOW}Test 4: Create Province - Duplicate Region Code (Expected to Fail)${NC}"
DUPLICATE_RESPONSE=$(curl -s -X POST -w "\n%{http_code}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d '{
        "name": "Western Province Copy",
        "regionCode": "WP",
        "country": "South Africa",
        "contactName": "Jane Doe",
        "contactEmail": "jane@wp.cricket",
        "contactPhone": "+27987654321"
    }' \
    "${BASE_URL}/provinces")
HTTP_CODE=$(echo "$DUPLICATE_RESPONSE" | tail -n1)
BODY=$(echo "$DUPLICATE_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 409 ]; then
    echo -e "${GREEN}✓ Duplicate validation working correctly${NC}"
    echo "$BODY" | jq '.error'
else
    echo -e "${RED}✗ Duplicate validation failed (Expected 409, got $HTTP_CODE)${NC}"
    echo "$BODY" | jq '.'
fi
echo ""
sleep 1

# Test 5: Create Province - Invalid Email (Should Fail)
echo -e "${YELLOW}Test 5: Create Province - Invalid Email (Expected to Fail)${NC}"
INVALID_RESPONSE=$(curl -s -X POST -w "\n%{http_code}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d '{
        "name": "Eastern Province",
        "regionCode": "EP",
        "country": "South Africa",
        "contactName": "Bob Wilson",
        "contactEmail": "invalid-email",
        "contactPhone": "+27111111111"
    }' \
    "${BASE_URL}/provinces")
HTTP_CODE=$(echo "$INVALID_RESPONSE" | tail -n1)
BODY=$(echo "$INVALID_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 400 ]; then
    echo -e "${GREEN}✓ Email validation working correctly${NC}"
    echo "$BODY" | jq '.error'
else
    echo -e "${RED}✗ Email validation failed (Expected 400, got $HTTP_CODE)${NC}"
    echo "$BODY" | jq '.'
fi
echo ""
sleep 1

# Test 6: Get Province by ID
if [ ! -z "$PROVINCE_ID" ]; then
    echo -e "${YELLOW}Test 6: Get Province by ID${NC}"
    GET_RESPONSE=$(curl -s -w "\n%{http_code}" \
        "${BASE_URL}/provinces/${PROVINCE_ID}")
    HTTP_CODE=$(echo "$GET_RESPONSE" | tail -n1)
    BODY=$(echo "$GET_RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ]; then
        echo -e "${GREEN}✓ Get province by ID successful${NC}"
        echo "$BODY" | jq '.data'
    else
        echo -e "${RED}✗ Get province by ID failed (HTTP $HTTP_CODE)${NC}"
        echo "$BODY" | jq '.'
    fi
    echo ""
    sleep 1
fi

# Test 7: List Provinces
echo -e "${YELLOW}Test 7: List All Provinces${NC}"
LIST_RESPONSE=$(curl -s -w "\n%{http_code}" \
    "${BASE_URL}/provinces?limit=10&offset=0")
HTTP_CODE=$(echo "$LIST_RESPONSE" | tail -n1)
BODY=$(echo "$LIST_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ List provinces successful${NC}"
    echo "$BODY" | jq '.data'
else
    echo -e "${RED}✗ List provinces failed (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq '.'
fi
echo ""
sleep 1

# Test 8: Search Provinces
echo -e "${YELLOW}Test 8: Search Provinces by Name${NC}"
SEARCH_RESPONSE=$(curl -s -w "\n%{http_code}" \
    "${BASE_URL}/provinces?search=Western")
HTTP_CODE=$(echo "$SEARCH_RESPONSE" | tail -n1)
BODY=$(echo "$SEARCH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Search provinces successful${NC}"
    echo "$BODY" | jq '.data'
else
    echo -e "${RED}✗ Search provinces failed (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq '.'
fi
echo ""
sleep 1

# Test 9: Filter Provinces by Country
echo -e "${YELLOW}Test 9: Filter Provinces by Country${NC}"
FILTER_RESPONSE=$(curl -s -w "\n%{http_code}" \
    "${BASE_URL}/provinces?country=South%20Africa")
HTTP_CODE=$(echo "$FILTER_RESPONSE" | tail -n1)
BODY=$(echo "$FILTER_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓ Filter provinces successful${NC}"
    echo "$BODY" | jq '.data'
else
    echo -e "${RED}✗ Filter provinces failed (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq '.'
fi
echo ""
sleep 1

# Test 10: Update Province
if [ ! -z "$PROVINCE_ID" ]; then
    echo -e "${YELLOW}Test 10: Update Province${NC}"
    UPDATE_RESPONSE=$(curl -s -X PUT -w "\n%{http_code}" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{
            "contactName": "John Smith Updated",
            "contactPhone": "+27999999999"
        }' \
        "${BASE_URL}/provinces/${PROVINCE_ID}")
    HTTP_CODE=$(echo "$UPDATE_RESPONSE" | tail -n1)
    BODY=$(echo "$UPDATE_RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ]; then
        echo -e "${GREEN}✓ Update province successful${NC}"
        echo "$BODY" | jq '.data'
    else
        echo -e "${RED}✗ Update province failed (HTTP $HTTP_CODE)${NC}"
        echo "$BODY" | jq '.'
    fi
    echo ""
    sleep 1
fi

# Test 11: Delete Province (Should Work - No Clubs)
if [ ! -z "$PROVINCE_ID" ]; then
    echo -e "${YELLOW}Test 11: Delete Province (Soft Delete)${NC}"
    DELETE_RESPONSE=$(curl -s -X DELETE -w "\n%{http_code}" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        "${BASE_URL}/provinces/${PROVINCE_ID}")
    HTTP_CODE=$(echo "$DELETE_RESPONSE" | tail -n1)
    BODY=$(echo "$DELETE_RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ]; then
        echo -e "${GREEN}✓ Delete province successful${NC}"
        echo "$BODY" | jq '.data'
    else
        echo -e "${RED}✗ Delete province failed (HTTP $HTTP_CODE)${NC}"
        echo "$BODY" | jq '.'
    fi
    echo ""
    sleep 1
fi

# Test 12: Verify Province Status is INACTIVE
if [ ! -z "$PROVINCE_ID" ]; then
    echo -e "${YELLOW}Test 12: Verify Province Status is INACTIVE${NC}"
    VERIFY_RESPONSE=$(curl -s -w "\n%{http_code}" \
        "${BASE_URL}/provinces/${PROVINCE_ID}")
    HTTP_CODE=$(echo "$VERIFY_RESPONSE" | tail -n1)
    BODY=$(echo "$VERIFY_RESPONSE" | sed '$d')

    if [ "$HTTP_CODE" -eq 200 ]; then
        STATUS=$(echo "$BODY" | jq -r '.data.status')
        if [ "$STATUS" == "INACTIVE" ]; then
            echo -e "${GREEN}✓ Province status is INACTIVE (soft delete confirmed)${NC}"
        else
            echo -e "${RED}✗ Province status is not INACTIVE (got: $STATUS)${NC}"
        fi
        echo "$BODY" | jq '.data | {id, name, status}'
    else
        echo -e "${RED}✗ Verify province status failed (HTTP $HTTP_CODE)${NC}"
        echo "$BODY" | jq '.'
    fi
    echo ""
fi

echo "=========================================="
echo "Province API Test Suite Complete"
echo "=========================================="
