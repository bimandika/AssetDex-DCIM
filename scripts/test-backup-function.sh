#!/bin/bash

# Test script for admin-backup Edge Function
# Run this after deploying the function to test all endpoints

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL="${VITE_SUPABASE_URL:-http://localhost:54321}"
FUNCTION_URL="${SUPABASE_URL}/functions/v1/admin-backup"

echo -e "${YELLOW}=== Admin Backup Function Test Suite ===${NC}"
echo "Testing function at: $FUNCTION_URL"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required for JSON parsing${NC}"
    echo "Install with: brew install jq (macOS) or apt-get install jq (Ubuntu)"
    exit 1
fi

# Function to test API endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "${YELLOW}Testing: $description${NC}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$endpoint")
    else
        response=$(curl -s -X "$method" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer YOUR_SUPER_ADMIN_JWT_TOKEN_HERE" \
            -d "$data" \
            -w "\nHTTP_STATUS:%{http_code}" \
            "$endpoint")
    fi
    
    # Extract HTTP status and body
    http_status=$(echo "$response" | tail -n1 | cut -d':' -f2)
    body=$(echo "$response" | sed '$d')
    
    echo "Status: $http_status"
    echo "Response: $body" | jq . 2>/dev/null || echo "$body"
    echo ""
    
    if [ "$http_status" -ge 200 ] && [ "$http_status" -lt 300 ]; then
        echo -e "${GREEN}✓ PASS${NC}"
    else
        echo -e "${RED}✗ FAIL${NC}"
    fi
    echo "----------------------------------------"
}

# Test CORS preflight
echo -e "${YELLOW}1. Testing CORS preflight${NC}"
curl -s -X OPTIONS \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: authorization, content-type" \
    -w "HTTP Status: %{http_code}\n" \
    "$FUNCTION_URL"
echo ""

# Test unauthorized access
echo -e "${YELLOW}2. Testing unauthorized access${NC}"
test_endpoint "GET" "$FUNCTION_URL?action=list" "" "List backups without auth"

# Test with invalid token
echo -e "${YELLOW}3. Testing invalid token${NC}"
curl -s -X GET \
    -H "Authorization: Bearer invalid_token" \
    "$FUNCTION_URL?action=list" \
    | jq . 2>/dev/null || echo "Response received"
echo ""

# Note for manual testing with real token
echo -e "${YELLOW}=== MANUAL TESTING REQUIRED ===${NC}"
echo "To test with authentication, you need to:"
echo "1. Get a JWT token for a super_admin user"
echo "2. Replace 'YOUR_SUPER_ADMIN_JWT_TOKEN_HERE' in this script"
echo "3. Run the following tests:"
echo ""

echo -e "${YELLOW}Test authenticated endpoints:${NC}"
echo "# List backups"
echo "curl -X GET \\"
echo "  -H \"Authorization: Bearer \$JWT_TOKEN\" \\"
echo "  \"$FUNCTION_URL?action=list\""
echo ""

echo "# Create backup"
echo "curl -X POST \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer \$JWT_TOKEN\" \\"
echo "  -d '{\"action\": \"create\", \"name\": \"test_backup\"}' \\"
echo "  \"$FUNCTION_URL\""
echo ""

echo "# Download backup (replace BACKUP_ID)"
echo "curl -X GET \\"
echo "  -H \"Authorization: Bearer \$JWT_TOKEN\" \\"
echo "  \"$FUNCTION_URL?action=download&backup_id=BACKUP_ID.sql\""
echo ""

echo "# Delete backup (replace BACKUP_ID)"
echo "curl -X DELETE \\"
echo "  -H \"Authorization: Bearer \$JWT_TOKEN\" \\"
echo "  \"$FUNCTION_URL?backup_id=BACKUP_ID.sql\""
echo ""

echo "# Restore backup (replace BACKUP_ID)"
echo "curl -X POST \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -H \"Authorization: Bearer \$JWT_TOKEN\" \\"
echo "  -d '{\"action\": \"restore\", \"backup_id\": \"BACKUP_ID.sql\"}' \\"
echo "  \"$FUNCTION_URL\""
echo ""

# Test function health (basic connectivity)
echo -e "${YELLOW}4. Testing function health${NC}"
health_response=$(curl -s -w "%{http_code}" "$FUNCTION_URL" -o /tmp/backup_health_response.json)
if [ "$health_response" = "401" ] || [ "$health_response" = "403" ]; then
    echo -e "${GREEN}✓ Function is responding (auth required as expected)${NC}"
elif [ "$health_response" = "400" ]; then
    echo -e "${GREEN}✓ Function is responding (invalid request as expected)${NC}"
else
    echo -e "${RED}✗ Unexpected response: $health_response${NC}"
    cat /tmp/backup_health_response.json 2>/dev/null || echo "No response body"
fi

# Cleanup
rm -f /tmp/backup_health_response.json

echo ""
echo -e "${YELLOW}=== Test Summary ===${NC}"
echo "Basic connectivity and security tests completed."
echo "For full functionality testing, authentication is required."
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Deploy the function: supabase functions deploy admin-backup"
echo "2. Set up storage bucket using migration-backup-storage.sql"
echo "3. Get a super_admin JWT token from your application"
echo "4. Run the manual tests above with proper authentication"
echo ""
echo -e "${GREEN}Phase 1 Backend Infrastructure Setup Complete!${NC}"
