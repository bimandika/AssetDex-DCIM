#!/bin/bash
# Power Management Backend API Testing Script
# Run this after deploying Edge Functions

echo "🚀 Testing Power Management Backend APIs"
echo "========================================"

BASE_URL="http://localhost:8000/functions/v1"

echo ""
echo "1. 📊 Global Power Summary"
echo "-------------------------"
curl -X GET "$BASE_URL/power-usage" | jq

echo ""
echo "2. 🔌 Device Power Specifications"
echo "--------------------------------"
curl -X GET "$BASE_URL/device-power-specs?limit=5" | jq

echo ""
echo "3. 💡 PSU Power Estimation (750W Server)"
echo "---------------------------------------"
curl -X POST "$BASE_URL/estimate-power-from-psu" \
  -H "Content-Type: application/json" \
  -d '{
    "psu_watts": 750,
    "device_type": "Server",
    "efficiency_rating": "80+ Gold"
  }' | jq

echo ""
echo "4. 🔧 Auto Power Assignment"
echo "---------------------------"
curl -X POST "$BASE_URL/assign-power-estimation" \
  -H "Content-Type: application/json" \
  -d '{"action": "assign_all"}' | jq

echo ""
echo "5. 📋 Power Data Overview"
echo "------------------------"
curl -X GET "$BASE_URL/power-data-overview" | jq

echo ""
echo "6. 🏢 DC Power Summary (DC-EAST)"
echo "--------------------------------"
curl -X GET "$BASE_URL/power-usage?dc=DC-EAST" | jq

echo ""
echo "7. 🏗️ Floor Power Summary (DC-EAST, Floor 1)"
echo "--------------------------------------------"
curl -X GET "$BASE_URL/power-usage?dc=DC-EAST&floor=1" | jq

echo ""
echo "8. 🏠 Room Power Summary (DC-EAST, Floor 1, Room A)"
echo "---------------------------------------------------"
curl -X GET "$BASE_URL/power-usage?dc=DC-EAST&floor=1&room=A" | jq

echo ""
echo "✅ Backend Testing Complete!"
