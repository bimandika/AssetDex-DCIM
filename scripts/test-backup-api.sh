#!/bin/bash

# Backup API Testing Script
# Usage: ./test-backup-api.sh YOUR_SUPABASE_URL YOUR_JWT_TOKEN

set -e

if [ $# -ne 2 ]; then
    echo "Usage: $0 <SUPABASE_URL> <JWT_TOKEN>"
    echo "Example: $0 https://your-project.supabase.co eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    exit 1
fi

SUPABASE_URL="$1"
JWT_TOKEN="$2"
FUNCTION_URL="${SUPABASE_URL}/functions/v1/admin-backup"

echo "🚀 Testing Backup API at: $FUNCTION_URL"
echo "=============================================="

# Test 1: CORS Preflight
echo "📋 Test 1: CORS Preflight"
curl -X OPTIONS "$FUNCTION_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: authorization, content-type" \
  -s -w "Status: %{http_code}\n" -o /dev/null
echo ""

# Test 2: Unauthorized Access
echo "📋 Test 2: Unauthorized Access (should fail)"
curl -X GET "${FUNCTION_URL}?action=list" \
  -H "Content-Type: application/json" \
  -s -w "Status: %{http_code}\n" -o /dev/null
echo ""

# Test 3: List Backups
echo "📋 Test 3: List Existing Backups"
BACKUP_LIST=$(curl -X GET "${FUNCTION_URL}?action=list" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -s)
echo "Response: $BACKUP_LIST"
echo ""

# Test 4: Create Backup
echo "📋 Test 4: Create New Backup"
CREATE_RESPONSE=$(curl -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "name": "api-test-backup"
  }' \
  -s)
echo "Response: $CREATE_RESPONSE"

# Extract backup ID from response (assuming JSON format)
BACKUP_ID=$(echo "$CREATE_RESPONSE" | grep -o '"backup_id":"[^"]*"' | cut -d'"' -f4)
echo "Created Backup ID: $BACKUP_ID"
echo ""

# Test 5: List Backups Again (should show new backup)
echo "📋 Test 5: List Backups (should include new backup)"
curl -X GET "${FUNCTION_URL}?action=list" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -s | jq '.' 2>/dev/null || echo "Response received (jq not available for formatting)"
echo ""

# Test 6: Download Backup (if we have a backup ID)
if [ ! -z "$BACKUP_ID" ]; then
    echo "📋 Test 6: Download Backup"
    curl -X GET "${FUNCTION_URL}?action=download&backup_id=${BACKUP_ID}" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -s -w "Status: %{http_code}, Size: %{size_download} bytes\n" \
      -o "/tmp/test_backup_${BACKUP_ID}.sql"
    echo "Downloaded to: /tmp/test_backup_${BACKUP_ID}.sql"
    echo ""
fi

# Test 7: Error Cases
echo "📋 Test 7: Error Cases"
echo "Missing backup_id for download:"
curl -X GET "${FUNCTION_URL}?action=download" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -s -w "Status: %{http_code}\n" -o /dev/null

echo "Invalid action:"
curl -X POST "$FUNCTION_URL" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "invalid"}' \
  -s -w "Status: %{http_code}\n" -o /dev/null
echo ""

# Test 8: Delete Backup (cleanup)
if [ ! -z "$BACKUP_ID" ]; then
    echo "📋 Test 8: Delete Test Backup (cleanup)"
    curl -X DELETE "${FUNCTION_URL}?backup_id=${BACKUP_ID}" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -H "Content-Type: application/json" \
      -s -w "Status: %{http_code}\n" -o /dev/null
    echo "Cleanup completed"
fi

echo ""
echo "✅ All tests completed!"
echo "=============================================="
