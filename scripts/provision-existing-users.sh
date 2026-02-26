#!/bin/bash
#
# Bulk Provision Existing Users Script
# Adds users who don't have permissions to the default organization
#
# Usage:
#   chmod +x scripts/provision-existing-users.sh
#   ./scripts/provision-existing-users.sh
#

set -e  # Exit on error

KETO_URL="${ORY_KETO_WRITE_URL:-https://gateway-production-6cac.up.railway.app}"
ORG_ID="default-org"

echo "======================================"
echo "Bulk User Provisioning Script"
echo "======================================"
echo "Keto URL: $KETO_URL"
echo "Organization: $ORG_ID"
echo "======================================"
echo ""

# Array of user IDs that need provisioning
# Replace these with your actual user IDs from Kratos
USERS=(
  "56398ab4-7715-4c71-b509-317f36f15c3f"  # simpleloginwithkratos.bullfight674@simplelogin.com
  "8637c7da-59b7-4f24-b68c-63dee3c2aaf3"  # test@test.io
  "e269aa0f-e825-4ecf-b4b5-c3a8c22e6af3"  # sonlyzzz2020@gmail.com
)

SUCCESS_COUNT=0
FAILED_COUNT=0

for USER_ID in "${USERS[@]}"; do
  echo -n "Provisioning user: $USER_ID ... "
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$KETO_URL/admin/relation-tuples" \
    -H "Content-Type: application/json" \
    -d '{
      "namespace": "Organization",
      "object": "'"$ORG_ID"'",
      "relation": "members",
      "subject_id": "'"$USER_ID"'"
    }')
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo "✓ Success"
    ((SUCCESS_COUNT++))
  else
    echo "✗ Failed (HTTP $HTTP_CODE)"
    ((FAILED_COUNT++))
  fi
done

echo ""
echo "======================================"
echo "Provisioning Complete!"
echo "Success: $SUCCESS_COUNT"
echo "Failed: $FAILED_COUNT"
echo "======================================"

# Verify provisioning
echo ""
echo "Verifying provisioned users..."
for USER_ID in "${USERS[@]}"; do
  echo -n "Checking $USER_ID ... "
  
  CHECK_RESPONSE=$(curl -s "$KETO_URL/relation-tuples/check?namespace=Organization&object=$ORG_ID&relation=members&subject_id=$USER_ID")
  
  if echo "$CHECK_RESPONSE" | grep -q '"allowed":true'; then
    echo "✓ Verified"
  else
    echo "✗ Not found"
  fi
done

echo ""
echo "Done!"
