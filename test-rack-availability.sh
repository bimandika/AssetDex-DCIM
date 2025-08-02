#!/bin/bash

# Test script for the check-rack-availability function
# Run this to test the function once deployed

SUPABASE_URL="YOUR_SUPABASE_URL"
ANON_KEY="YOUR_ANON_KEY"

echo "Testing check-rack-availability function..."

# Test 1: Check availability for valid position
echo "Test 1: Valid position (should be available)"
curl -X POST "${SUPABASE_URL}/functions/v1/main/check-rack-availability" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "rack": "RACK-37",
    "position": 20,
    "unitHeight": 1
  }' | jq .

echo -e "\n---\n"

# Test 2: Check availability for conflicting position
echo "Test 2: Conflicting position (should show conflicts)"
curl -X POST "${SUPABASE_URL}/functions/v1/main/check-rack-availability" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "rack": "RACK-37",
    "position": 42,
    "unitHeight": 1
  }' | jq .

echo -e "\n---\n"

# Test 3: Check availability with large server (should suggest alternative)
echo "Test 3: Large server placement (should suggest alternative)"
curl -X POST "${SUPABASE_URL}/functions/v1/main/check-rack-availability" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "rack": "RACK-37",
    "position": 30,
    "unitHeight": 15
  }' | jq .

echo -e "\nTesting complete!"
