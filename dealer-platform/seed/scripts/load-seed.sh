#!/usr/bin/env bash
# Load the DealerOps demo seed into a local MySQL database.
#
# Usage: dealer-platform/seed/scripts/load-seed.sh [--reset]
#   --reset  first delete the 30 seed dealerships and every row they own, then reload.
#
# Connection settings come from the environment (never hardcoded):
#   MYSQL_HOST (127.0.0.1), MYSQL_PORT (3306), MYSQL_DB (dealer_core), MYSQL_USER (dealer), MYSQL_PWD.
#   MYSQL_SSL_MODE is optional (unset locally; REQUIRED when the server demands TLS, as Azure does).
# SEED_PYTHON picks the interpreter for the photo loader; one with Pillow also stores enhanced copies.
# Run DealerOps.Core once before loading so its startup schema patches are applied.
# Inserts are guarded by natural keys. This script does not empty the database unless --reset is passed,
# and --reset removes only the seed dealerships.
set -Eeuo pipefail

SEED_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${MYSQL_HOST:=127.0.0.1}" "${MYSQL_PORT:=3306}" "${MYSQL_DB:=dealer_core}" "${MYSQL_USER:=dealer}"
export MYSQL_HOST MYSQL_PORT MYSQL_DB MYSQL_USER
if [[ -n "${MYSQL_PWD:-}" ]]; then export MYSQL_PWD; fi
if [[ -n "${MYSQL_SSL_MODE:-}" ]]; then export MYSQL_SSL_MODE; fi

mysql_cli=(mysql --default-character-set=utf8mb4 -h "$MYSQL_HOST" -P "$MYSQL_PORT" -u "$MYSQL_USER")
if [[ -n "${MYSQL_SSL_MODE:-}" ]]; then
  mysql_cli+=(--ssl-mode="$MYSQL_SSL_MODE")
fi
mysql_cli+=("$MYSQL_DB")

run_sql() {
  "${mysql_cli[@]}" "$@"
}

seed_emails() {
  python3 -I -c 'import json,sys; print(",".join("\x27%s\x27" % d["contact_email"] for d in json.load(open(sys.argv[1]))))' \
    "$SEED_DIR/contract/dealers.json"
}

if [[ "${1:-}" == "--reset" ]]; then
  echo "Removing previously loaded seed dealerships..."
  emails="$(seed_emails)"
  run_sql <<SQL
SET @ids = (SELECT GROUP_CONCAT(id) FROM dealer WHERE contact_email IN ($emails));
DELETE FROM audit_event WHERE FIND_IN_SET(dealer_id, @ids);
DELETE FROM notification WHERE FIND_IN_SET(dealer_id, @ids);
DELETE FROM vehicle_photo WHERE FIND_IN_SET(dealer_id, @ids);
DELETE FROM work_order WHERE FIND_IN_SET(dealer_id, @ids);
DELETE FROM sales_lead_note WHERE FIND_IN_SET(dealer_id, @ids);
DELETE FROM sales_lead WHERE FIND_IN_SET(dealer_id, @ids);
UPDATE listing SET last_check_id = NULL WHERE FIND_IN_SET(dealer_id, @ids);
DELETE FROM compliance_check WHERE FIND_IN_SET(dealer_id, @ids);
DELETE FROM listing WHERE FIND_IN_SET(dealer_id, @ids);
DELETE FROM customer_vehicle WHERE FIND_IN_SET(dealer_id, @ids);
DELETE FROM customer WHERE FIND_IN_SET(dealer_id, @ids);
DELETE FROM vehicle WHERE FIND_IN_SET(dealer_id, @ids);
DELETE FROM membership WHERE FIND_IN_SET(dealer_id, @ids);
DELETE FROM app_user WHERE FIND_IN_SET(dealer_id, @ids) OR FIND_IN_SET(requested_dealer_id, @ids);
DELETE FROM dealer WHERE FIND_IN_SET(id, @ids);
SQL
fi

for file in "$SEED_DIR"/sql/0[1-7]*.sql; do
  echo "Loading $(basename "$file")"
  run_sql < "$file"
done

echo "Loading vehicle photos"
"${SEED_PYTHON:-python3}" -I "$SEED_DIR/scripts/load_photos.py"

# Audit history is derived from the rows above, photos included, so it loads last.
echo "Loading 08_audit.sql"
run_sql < "$SEED_DIR/sql/08_audit.sql"

echo "Row counts:"
run_sql -t -e "
SELECT 'dealer' t, COUNT(*) n FROM dealer UNION ALL SELECT 'app_user', COUNT(*) FROM app_user
UNION ALL SELECT 'membership', COUNT(*) FROM membership UNION ALL SELECT 'vehicle', COUNT(*) FROM vehicle
UNION ALL SELECT 'customer', COUNT(*) FROM customer UNION ALL SELECT 'customer_vehicle', COUNT(*) FROM customer_vehicle
UNION ALL SELECT 'listing', COUNT(*) FROM listing UNION ALL SELECT 'compliance_check', COUNT(*) FROM compliance_check
UNION ALL SELECT 'sales_lead', COUNT(*) FROM sales_lead UNION ALL SELECT 'sales_lead_note', COUNT(*) FROM sales_lead_note
UNION ALL SELECT 'work_order', COUNT(*) FROM work_order UNION ALL SELECT 'vehicle_photo', COUNT(*) FROM vehicle_photo
UNION ALL SELECT 'audit_event', COUNT(*) FROM audit_event UNION ALL SELECT 'notification', COUNT(*) FROM notification;"
