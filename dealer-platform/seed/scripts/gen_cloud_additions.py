#!/usr/bin/env python3
"""Writes sql/09_cloud_additions.sql: the rows created on the cloud demo since a given time.

Usage: gen_cloud_additions.py <backup.sql.gz> [--since '2026-11-01 18:53']

The input is an Azure backup: one azure-backup-*.sql.gz, or the azure-incr-*.sql.gz files joined in
order. Row ids differ between databases, so references are resolved through natural keys, and a row
whose natural key already exists is skipped. The output is safe to load more than once.

--since defaults to the time in the existing output, so rows saved earlier are kept across rebuilds,
or else to when the backup's database was created (its platform admin row).

Sign-in records and client IPs are left out. Changes to rows older than --since are not carried.
"""
import argparse
import gzip
import pathlib
import re

OUT = pathlib.Path(__file__).resolve().parent.parent / "sql" / "09_cloud_additions.sql"

# In load order: natural key columns, and the columns that reference another table's id.
TABLES = {
    "dealer": (["legal_name"], {}),
    "app_user": (["username"], {"dealer_id": "dealer", "requested_dealer_id": "dealer"}),
    "membership": (["dealer_id", "username"], {"dealer_id": "dealer"}),
    "vehicle": (["dealer_id", "vin"], {"dealer_id": "dealer"}),
    "customer": (["dealer_id", "email"], {"dealer_id": "dealer"}),
    "customer_vehicle": (["customer_id", "vehicle_id"],
                         {"dealer_id": "dealer", "customer_id": "customer", "vehicle_id": "vehicle"}),
    "vehicle_photo": (["vehicle_id", "created_at"], {"dealer_id": "dealer", "vehicle_id": "vehicle"}),
    "vehicle_payment": (["vehicle_id", "created_at"], {"dealer_id": "dealer", "vehicle_id": "vehicle"}),
    "work_order": (["vehicle_id", "task", "created_at"], {"dealer_id": "dealer", "vehicle_id": "vehicle"}),
    "listing": (["vehicle_id"], {"dealer_id": "dealer", "vehicle_id": "vehicle"}),
    "compliance_check": (["listing_id", "content_version", "created_at"],
                         {"dealer_id": "dealer", "listing_id": "listing"}),
    "sales_lead": (["dealer_id", "customer_id", "vehicle_id", "created_at"],
                   {"dealer_id": "dealer", "customer_id": "customer", "vehicle_id": "vehicle"}),
    "sales_lead_note": (["lead_id", "created_at"], {"dealer_id": "dealer", "lead_id": "sales_lead"}),
    "notification": (["dealer_id", "kind", "created_at"], {"dealer_id": "dealer"}),
    "audit_event": (["actor_username", "entity_type", "entity_id", "action", "created_at"], {"dealer_id": "dealer"}),
}
AUDIT_ENTITIES = {
    "APP_USER": "app_user", "CUSTOMER": "customer", "CUSTOMER_VEHICLE": "customer_vehicle",
    "DEALER": "dealer", "LEAD": "sales_lead", "LISTING": "listing", "MEMBERSHIP": "membership",
    "VEHICLE": "vehicle",
}
HEAD = re.compile(r"^INSERT INTO `([a-z_]+)` \(([^)]*)\) VALUES ")
DELETE = re.compile(r"^DELETE FROM `([a-z_]+)` WHERE `[a-z_]+` IN \((.*)\);$")
TRUNCATE = re.compile(r"^TRUNCATE TABLE `([a-z_]+)`;$")


def parse_rows(values):
    """Yields each tuple of a mysqldump VALUES clause as raw SQL literals, quotes included."""
    i, n = 0, len(values)
    while i < n:
        if values[i] != "(":
            i += 1
            continue
        i += 1
        row, start, quoted = [], i, False
        while i < n:
            c = values[i]
            if quoted:
                if c == "\\":
                    i += 1
                elif c == "'":
                    quoted = False
            elif c == "'":
                quoted = True
            elif c in ",)":
                row.append(values[start:i])
                start = i + 1
                if c == ")":
                    break
            i += 1
        i += 1
        yield row


def read_backup(path):
    """Returns {table: {primary key literal: row}}, applying later files over earlier ones."""
    data = {}
    with gzip.open(path, "rt", encoding="utf-8", newline="\n") as f:
        for line in f:
            line = line.rstrip("\n")
            head = HEAD.match(line)
            if head:
                columns = [c.strip(" `") for c in head.group(2).split(",")]
                for row in parse_rows(line[head.end():]):
                    data.setdefault(head.group(1), {})[row[0].strip("'")] = dict(zip(columns, row))
            elif deleted := DELETE.match(line):
                for key in deleted.group(2).split(","):
                    data.get(deleted.group(1), {}).pop(key.strip("'"), None)
            elif truncated := TRUNCATE.match(line):
                data.pop(truncated.group(1), None)
    return data


class Writer:
    def __init__(self, data):
        self.data = data
        self.lines = []
        self.resolved = set()

    def var(self, table, row_id):
        return f"@{table}_{row_id}"

    def key_condition(self, table, row):
        """Matches the row by natural key, with references replaced by resolved variables."""
        keys, refs = TABLES[table]
        parts = []
        for column in keys:
            value = row[column]
            if column in refs:
                value = self.reference(refs[column], value)
            elif table == "audit_event" and column == "entity_id":
                value = self.audit_entity(row)
            if column == "created_at":
                # A database created by an older dealer-core stores whole seconds, not microseconds.
                parts.append(f"ABS(TIMESTAMPDIFF(SECOND, `created_at`, {value})) <= 1")
            else:
                parts.append(f"`{column}` <=> {value}")
        return " AND ".join(parts)

    def reference(self, table, row_id):
        """Returns the variable holding a row's id here, resolving rows older than --since first."""
        if row_id == "NULL":
            return "NULL"
        self.resolve(table, row_id)
        return self.var(table, row_id)

    def resolve(self, table, row_id):
        if (table, row_id) in self.resolved:
            return
        condition = self.key_condition(table, self.data[table][row_id])
        self.lines.append(f"SET {self.var(table, row_id)} = (SELECT id FROM `{table}` WHERE {condition});")
        self.resolved.add((table, row_id))

    def audit_entity(self, row):
        target = AUDIT_ENTITIES[row["entity_type"].strip("'")]
        return self.reference(target, row["entity_id"].strip("'"))

    def value(self, table, column, row):
        refs = TABLES[table][1]
        raw = row[column]
        if column in refs:
            return self.reference(refs[column], raw)
        if table == "listing" and column == "last_check_id":
            return "NULL"  # Set once the check exists; the two rows reference each other.
        if table == "audit_event" and column == "entity_id":
            return self.audit_entity(row)
        if table == "audit_event" and column == "client_ip":
            return "NULL"
        if table == "notification" and column == "payload":
            # A buyer inquiry names its lead by id inside the JSON.
            for lead in re.findall(r'\\"leadId\\":\\"(\d+)\\"', raw):
                marker = f'\\"leadId\\":\\"{lead}\\"'
                new_id = self.reference("sales_lead", lead)
                raw = f"REPLACE({raw}, '{marker}', CONCAT('\\\"leadId\\\":\\\"', {new_id}, '\\\"'))"
        return raw

    def insert(self, table, row_id, row):
        columns = [c for c in row if c != "id"]
        values = ", ".join(self.value(table, c, row) for c in columns)
        condition = self.key_condition(table, row)
        if table == "app_user":
            # Azure enforces these as unique too, so a clash must not abort the whole load.
            for column in ("email", "phone", "display_name"):
                if row[column] != "NULL":
                    condition += f" OR `{column}` = {row[column]}"
        names = ", ".join(f"`{c}`" for c in columns)
        self.lines.append(f"INSERT INTO `{table}` ({names})\nSELECT {values} FROM DUAL\n"
                          f"WHERE NOT EXISTS (SELECT 1 FROM `{table}` WHERE {condition});")
        self.resolved.discard((table, row_id))
        self.resolve(table, row_id)


def default_since(data):
    if OUT.exists() and (saved := re.search(r"on the cloud demo since (.+)\.$", OUT.read_text(encoding="utf-8"), re.M)):
        return saved.group(1)
    return next(u["created_at"].strip("'") for u in data["app_user"].values() if u["role"] == "'Platform.Admin'")


def is_new(table, row, since):
    created = row.get("created_at", row.get("linked_at", "''")).strip("'")
    if created < since:
        return False
    # The platform admin comes from ADMIN_USERNAME at startup, and sign-ins are not demo data.
    if table == "app_user" and row["role"] == "'Platform.Admin'":
        return False
    if table == "audit_event":
        return row["actor_username"] != "'system'" and row["entity_type"].strip("'") in AUDIT_ENTITIES \
            and not row["action"].startswith("'LOGIN")
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("backup")
    parser.add_argument("--since", help="UTC time; rows created from then on are carried")
    parser.add_argument("--allow-removal", action="store_true", help="drop saved accounts the backup no longer has")
    args = parser.parse_args()

    data = read_backup(args.backup)
    # A backup of an empty, rebuilt database must not erase what an earlier run saved.
    saved = re.findall(r"^SET @app_user_\d+ = \(SELECT id FROM `app_user` WHERE `username` <=> '(.+?)'\);$",
                       OUT.read_text(encoding="utf-8"), re.M) if OUT.exists() else []
    current = {u["username"].strip("'") for u in data.get("app_user", {}).values()}
    missing = [name for name in saved if name not in current]
    if missing and not args.allow_removal:
        raise SystemExit(f"{OUT.name} was not changed. The backup lacks these saved accounts: {', '.join(missing)}. "
                         "If they were removed on purpose, rerun with --allow-removal.")
    since = args.since or default_since(data)
    writer = Writer(data)
    counts = {}
    for table in TABLES:
        for row_id, row in data.get(table, {}).items():
            if table == "audit_event" and row["entity_type"].strip("'") in AUDIT_ENTITIES \
                    and row["entity_id"].strip("'") not in data[AUDIT_ENTITIES[row["entity_type"].strip("'")]]:
                continue  # The audited row was removed, so there is nothing to point at.
            if is_new(table, row, since):
                writer.insert(table, row_id, row)
                counts[table] = counts.get(table, 0) + 1
    for row_id, listing in data.get("listing", {}).items():
        check = listing["last_check_id"]
        if is_new("listing", listing, since) and check != "NULL":
            writer.lines.append(f"UPDATE listing SET last_check_id = {writer.reference('compliance_check', check)} "
                                f"WHERE id = {writer.var('listing', row_id)} AND last_check_id IS NULL;")

    # No SET time_zone: a TIMESTAMP column must read back the same text, as the backups do with --skip-tz-utc.
    header = ["SET NAMES utf8mb4;", "",
              f"-- Generated by scripts/gen_cloud_additions.py: rows created on the cloud demo since {since}.",
              "START TRANSACTION;"]
    OUT.write_text("\n".join(header + writer.lines + ["COMMIT;"]) + "\n", encoding="utf-8")
    print(f"Wrote {OUT.name}: " + ", ".join(f"{t}={n}" for t, n in counts.items()))


if __name__ == "__main__":
    main()
