#!/usr/bin/env bash
# Verifies the security posture documented in docs/SECURITY.md.
#
# Pass criteria: among public SECURITY DEFINER functions, ONLY these have
# EXECUTE granted to anon / authenticated:
#   - has_role               → authenticated: true,  anon: false
#   - increment_listing_view → authenticated: true,  anon: true
#
# Usage:
#   ./scripts/verify-security.sh
#
# Requires:
#   - psql in PATH
#   - PG* env vars set (PGHOST, PGUSER, PGPASSWORD, PGDATABASE) OR a
#     DATABASE_URL exported (psql will pick it up).

set -u
RED=$'\033[31m'; GRN=$'\033[32m'; YLW=$'\033[33m'; DIM=$'\033[2m'; RST=$'\033[0m'

if ! command -v psql >/dev/null 2>&1; then
  echo "${RED}FAIL${RST}  psql is not installed."
  exit 2
fi

if [[ -z "${PGHOST:-}" && -z "${DATABASE_URL:-}" ]]; then
  echo "${RED}FAIL${RST}  No Postgres connection configured (set PG* or DATABASE_URL)."
  exit 2
fi

SQL=$(cat <<'EOF'
SELECT p.proname || '|' ||
       has_function_privilege('anon', p.oid, 'EXECUTE')::text || '|' ||
       has_function_privilege('authenticated', p.oid, 'EXECUTE')::text
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND (has_function_privilege('anon', p.oid, 'EXECUTE')
    OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
ORDER BY p.proname;
EOF
)

rows=$(psql -At -c "$SQL" 2>/dev/null) || {
  echo "${RED}FAIL${RST}  Could not run query against the database."
  exit 2
}

declare -A EXPECTED=(
  ["has_role"]="false|true"
  ["increment_listing_view"]="true|true"
)

fail=0
seen=()

echo "Public SECURITY DEFINER functions with anon/authenticated EXECUTE:"
echo "${DIM}---------------------------------------------------------------${RST}"
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  name="${line%%|*}"
  rest="${line#*|}"
  anon="${rest%%|*}"
  auth="${rest#*|}"
  seen+=("$name")

  expected="${EXPECTED[$name]:-}"
  actual="${anon}|${auth}"
  if [[ "$expected" == "$actual" ]]; then
    echo "  ${GRN}OK${RST}    $name (anon=$anon, auth=$auth) — intentional"
  elif [[ -n "$expected" ]]; then
    echo "  ${RED}DRIFT${RST} $name expected anon|auth=$expected, got $actual"
    fail=1
  else
    echo "  ${RED}LEAK${RST}  $name (anon=$anon, auth=$auth) — NOT in allow-list"
    fail=1
  fi
done <<< "$rows"

# Verify every expected function actually appeared
for name in "${!EXPECTED[@]}"; do
  found=0
  for s in "${seen[@]:-}"; do [[ "$s" == "$name" ]] && found=1; done
  if [[ $found -eq 0 ]]; then
    echo "  ${YLW}MISS${RST}  $name expected but no longer SECURITY DEFINER / no EXECUTE"
    fail=1
  fi
done

echo "${DIM}---------------------------------------------------------------${RST}"
if [[ $fail -eq 0 ]]; then
  echo "${GRN}PASS${RST}  Security posture matches docs/SECURITY.md."
  exit 0
else
  echo "${RED}FAIL${RST}  Security posture drifted — see docs/SECURITY.md and re-run the Supabase linter."
  exit 1
fi
