#!/usr/bin/env bash
set -euo pipefail

GATEWAY_ONLY=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --gateway-only)
      GATEWAY_ONLY=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--gateway-only]"
      echo
      echo "Options:"
      echo "  --gateway-only   Skip internal keto.railway.internal checks and run only gateway probes"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage"
      exit 1
      ;;
  esac
done

# -------- Config --------
# Set these before running, or export in your shell.
INTERNAL_READ_URL="${INTERNAL_READ_URL:-http://keto.railway.internal:4466}"
GATEWAY_READ_URL="${GATEWAY_READ_URL:-https://gateway-production-6cac.up.railway.app}"

# Target subject to verify admin permission for
USER_ID="${USER_ID:-007ffa46-ae96-46de-abc4-81180c932eaf}"

# Optional expected object/namespace
ROLE_NAMESPACE="GlobalRole"
ROLE_OBJECT="admin"

# -------- Helpers --------
need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1"
    exit 1
  }
}

need_cmd curl
need_cmd jq

hr() { printf '%*s\n' "${COLUMNS:-80}" '' | tr ' ' '-'; }

get_json() {
  local url="$1"
  curl -sS --connect-timeout 5 --max-time 15 -w $'\n__HTTP_CODE__:%{http_code}' "$url"
}

post_json() {
  local url="$1"
  local body="$2"
  curl -sS --connect-timeout 5 --max-time 15 -w $'\n__HTTP_CODE__:%{http_code}' -X POST "$url" -H "Content-Type: application/json" -d "$body"
}

safe_get_json() {
  local url="$1"
  local out
  if ! out="$(get_json "$url" 2>/dev/null)"; then
    echo "__UNREACHABLE__|"
    return
  fi

  local code body
  code="$(echo "$out" | awk -F: '/__HTTP_CODE__:/ {print $2}' | tail -n1)"
  body="${out%$'\n'__HTTP_CODE__:*}"

  if [[ -z "$body" ]]; then
    echo "__EMPTY__|$code"
    return
  fi

  echo "$body|$code"
}

safe_post_json() {
  local url="$1"
  local body="$2"
  local out
  if ! out="$(post_json "$url" "$body" 2>/dev/null)"; then
    echo "__UNREACHABLE__|"
    return
  fi

  local code payload
  code="$(echo "$out" | awk -F: '/__HTTP_CODE__:/ {print $2}' | tail -n1)"
  payload="${out%$'\n'__HTTP_CODE__:*}"

  if [[ -z "$payload" ]]; then
    echo "__EMPTY__|$code"
    return
  fi

  echo "$payload|$code"
}

check_namespace() {
  local base="$1"
  local ns="$2"
  local resp
  resp="$(safe_get_json "$base/relation-tuples?namespace=$ns&page_size=1")"
  local body="${resp%|*}"
  local code="${resp##*|}"

  if [[ "$body" == "__UNREACHABLE__" ]]; then
    echo "UNREACHABLE"
    return
  fi

  if [[ "$body" == "__EMPTY__" ]]; then
    echo "UNKNOWN"
    return
  fi

  if [[ "$code" =~ ^[0-9]+$ ]] && [[ "$code" -ge 400 ]]; then
    if echo "$body" | jq -e '.error.reason | test("Unknown namespace")' >/dev/null 2>&1; then
      echo "MISSING"
    else
      echo "ERROR_$code"
    fi
    return
  fi

  if echo "$body" | jq -e '.error.reason | test("Unknown namespace")' >/dev/null 2>&1; then
    echo "MISSING"
  else
    echo "OK"
  fi
}

check_relation() {
  local base="$1"
  local relation="$2"
  local body
  body="$(cat <<EOF
{
  "namespace":"$ROLE_NAMESPACE",
  "object":"$ROLE_OBJECT",
  "relation":"$relation",
  "subject_id":"$USER_ID"
}
EOF
)"
  local resp body code
  resp="$(safe_post_json "$base/relation-tuples/check" "$body")"
  body="${resp%|*}"
  code="${resp##*|}"

  if [[ "$body" == "__UNREACHABLE__" ]]; then
    echo "unreachable"
    return
  fi

  if [[ "$body" == "__EMPTY__" ]]; then
    echo "empty"
    return
  fi

  # Keto commonly returns 403 with {"allowed":false} for denied checks.
  local allowed
  allowed="$(echo "$body" | jq -r 'if has("allowed") then (.allowed|tostring) else "null" end' 2>/dev/null || echo "null")"

  if [[ "$allowed" == "true" || "$allowed" == "false" ]]; then
    echo "$allowed"
    return
  fi

  if [[ "$code" =~ ^[0-9]+$ ]] && [[ "$code" -ge 400 ]]; then
    echo "error:$code"
    return
  fi

  echo "null"
}

list_members_tuple_count() {
  local base="$1"
  local resp body code
  resp="$(safe_get_json "$base/relation-tuples?namespace=$ROLE_NAMESPACE&object=$ROLE_OBJECT&relation=members&page_size=100")"
  body="${resp%|*}"
  code="${resp##*|}"

  if [[ "$body" == "__UNREACHABLE__" ]]; then
    echo "unreachable"
    return
  fi

  if [[ "$body" == "__EMPTY__" ]]; then
    echo "empty"
    return
  fi

  if [[ "$code" =~ ^[0-9]+$ ]] && [[ "$code" -ge 400 ]]; then
    echo "error:$code"
    return
  fi

  echo "$body" | jq -r '.relation_tuples | length // 0'
}

flap_test() {
  local base="$1"
  local relation="$2"
  local rounds="${3:-15}"

  local true_count=0
  local false_count=0
  local error_count=0
  local other_count=0
  local i
  for ((i=1; i<=rounds; i++)); do
    local v
    v="$(check_relation "$base" "$relation")"
    if [[ "$v" == "true" ]]; then
      true_count=$((true_count+1))
    elif [[ "$v" == "false" ]]; then
      false_count=$((false_count+1))
    elif [[ "$v" == error:* ]]; then
      error_count=$((error_count+1))
    else
      other_count=$((other_count+1))
    fi
  done

  echo "true=$true_count false=$false_count error=$error_count other=$other_count rounds=$rounds"
}

# -------- Run --------
echo "Keto Consistency Probe"
echo "INTERNAL_READ_URL=$INTERNAL_READ_URL"
echo "GATEWAY_READ_URL=$GATEWAY_READ_URL"
echo "USER_ID=$USER_ID"
echo "GATEWAY_ONLY=$GATEWAY_ONLY"
hr

echo "1) Namespace availability"
for ns in GlobalRole Organization Group; do
  i_stat="SKIPPED"
  if [[ "$GATEWAY_ONLY" != "true" ]]; then
    i_stat="$(check_namespace "$INTERNAL_READ_URL" "$ns")"
  fi
  g_stat="$(check_namespace "$GATEWAY_READ_URL" "$ns")"
  printf "  %-12s internal=%-7s gateway=%-7s\n" "$ns" "$i_stat" "$g_stat"
done
hr

echo "2) Tuple existence for GlobalRole admin members"
i_cnt="SKIPPED"
if [[ "$GATEWAY_ONLY" != "true" ]]; then
  i_cnt="$(list_members_tuple_count "$INTERNAL_READ_URL")"
fi
g_cnt="$(list_members_tuple_count "$GATEWAY_READ_URL")"
echo "  internal members tuple count: $i_cnt"
echo "  gateway  members tuple count: $g_cnt"
hr

echo "3) Permission checks for target user"
i_members="SKIPPED"
i_is_admin="SKIPPED"
if [[ "$GATEWAY_ONLY" != "true" ]]; then
  i_members="$(check_relation "$INTERNAL_READ_URL" "members")"
  i_is_admin="$(check_relation "$INTERNAL_READ_URL" "is_admin")"
fi
g_members="$(check_relation "$GATEWAY_READ_URL" "members")"
g_is_admin="$(check_relation "$GATEWAY_READ_URL" "is_admin")"

echo "  internal check members : $i_members"
echo "  internal check is_admin: $i_is_admin"
echo "  gateway  check members : $g_members"
echo "  gateway  check is_admin: $g_is_admin"
hr

echo "4) Flap test (mixed/stale runtime detection)"
if [[ "$GATEWAY_ONLY" != "true" ]]; then
  echo "  internal is_admin: $(flap_test "$INTERNAL_READ_URL" "is_admin" 20)"
else
  echo "  internal is_admin: skipped"
fi
echo "  gateway  is_admin: $(flap_test "$GATEWAY_READ_URL" "is_admin" 20)"
hr

echo "Interpretation"
echo "  - If members=true but is_admin=false, runtime namespace logic is inconsistent with expected permit."
echo "  - If internal and gateway differ, you are hitting different Keto runtimes/routes."
echo "  - If flap test shows mixed true/false, replicas are out of sync."
echo "  - For check endpoint, false can be returned with HTTP 403 and still be a valid deny result."