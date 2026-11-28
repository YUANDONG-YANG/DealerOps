#!/usr/bin/env bash
# Shared by the seed scripts that connect to the Azure MySQL server. Source it, do not run it.
#
# Azure MySQL Flexible Server authenticates its admin account with mysql_native_password. MySQL 9
# dropped that plugin from the client, so a 9.x `mysql` earlier on PATH fails every connection with
# "Authentication plugin 'mysql_native_password' cannot be loaded". Scripts that treat a failed
# connection as "the server is not ready yet" then wait for their whole timeout and report the
# wrong cause, so pick a client that can authenticate instead.
#
# The first client older than 9 on PATH wins. MYSQL_BIN and MYSQLDUMP_BIN override the choice.

azure_mysql_pick() {
  local name="$1" override="$2" candidate version
  if [ -n "${override}" ]; then printf '%s' "${override}"; return; fi
  while IFS= read -r candidate; do
    version="$("${candidate}" --version 2>/dev/null | sed -n 's/.*Ver \([0-9][0-9]*\)\..*/\1/p')"
    if [ -n "${version}" ] && [ "${version}" -lt 9 ]; then printf '%s' "${candidate}"; return; fi
  done < <(type -aP "${name}" 2>/dev/null)
  printf '%s' "${name}"
}

MYSQL_BIN="$(azure_mysql_pick mysql "${MYSQL_BIN:-}")"
MYSQLDUMP_BIN="$(azure_mysql_pick mysqldump "${MYSQLDUMP_BIN:-}")"

# Windows mysql.exe and mysqldump.exe end lines with CRLF. Strip the CR so captured values and
# line-anchored sed patterns work under Git Bash. mysqldump escapes any CR inside a value.
mysql() { command "${MYSQL_BIN}" "$@" | tr -d '\r'; }
mysqldump() { command "${MYSQLDUMP_BIN}" "$@" | tr -d '\r'; }

# Reports an unrecoverable connection failure. Waiting cannot fix a rejected credential or a
# missing client plugin, so the caller stops instead of spending its retry budget.
azure_mysql_fatal() {
  case "$1" in
    *"Authentication plugin"*|*"Access denied"*|*"plugin"*"cannot be loaded"*) return 0 ;;
    *) return 1 ;;
  esac
}
