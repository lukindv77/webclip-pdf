#!/usr/bin/env bash
# Local mirror of .github/workflows/repository-integrity.yml (developer convenience;
# exact-head GitHub CI remains the acceptance authority).
#
#   bash project_tools/local_ci.sh [-j N] [--fast] [--js-only] [--authority-only] [--match REGEX]
#     -j N              parallel JS test workers (default: CPU count)
#     --fast            skip the slow transitive P1-231 tests (s0h, s0i, s1a-s1d);
#                       direct identity-pin tests still run. Run the full mirror before push.
#     --js-only         only deterministic JS tests
#     --authority-only  only P1-231 authority lanes (push mode)
#     --match REGEX     only JS tests whose file name matches REGEX
#
# Requirements: git, Node 22.23.2 and Python 3.12 on PATH (override with WEBCLIP_NODE /
# WEBCLIP_PYTHON). The checkout must be LF-only (see .gitattributes): identity
# fingerprints are byte-exact. Logs go to .git/local-ci-logs/<timestamp>/.
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel)" || exit 2
cd "$ROOT" || exit 2
NODE="${WEBCLIP_NODE:-node}"
if [ -n "${WEBCLIP_PYTHON:-}" ]; then PYTHON="$WEBCLIP_PYTHON"
elif command -v python3 >/dev/null 2>&1 && python3 --version >/dev/null 2>&1; then PYTHON=python3
else PYTHON=python; fi
export PYTHONUTF8=1 PYTHONIOENCODING=utf-8

JOBS="$(nproc 2>/dev/null || echo 4)"; MODE=all; MATCH=''; SKIP=''
while [ $# -gt 0 ]; do
  case "$1" in
    -j) JOBS="$2"; shift 2 ;;
    --fast) SKIP='test_p1_231_(s1[a-d]|s0[hi])_'; shift ;;
    --js-only) MODE=js; shift ;;
    --authority-only) MODE=authority; shift ;;
    --match) MATCH="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

LOG="$(git rev-parse --absolute-git-dir)/local-ci-logs/$(date +%Y%m%d-%H%M%S)"; mkdir -p "$LOG"
HEAD_SHA="$(git rev-parse HEAD)"
echo "head=$HEAD_SHA node=$("$NODE" --version) python=$("$PYTHON" --version 2>&1) jobs=$JOBS logs=$LOG"

crlf="$(git ls-files --eol | awk '$2=="w/crlf"' | wc -l)"
if [ "$crlf" -ne 0 ]; then
  echo "FATAL: $crlf files are checked out with CRLF; identity fingerprints would not match CI."
  echo "       Fix (commit or stash your work first; reset --hard discards it):"
  echo "       git config core.autocrlf false && git rm -rq --cached . && git reset -q --hard"
  exit 2
fi
DIRTY="$(git status --porcelain)"
[ -n "$DIRTY" ] && echo "note: uncommitted changes; authority lanes and identity checks judge the HEAD commit only"

fails=()
step() { local name="$1"; shift; local t0=$SECONDS
  if "$@" >"$LOG/$(echo "$name" | tr -c 'A-Za-z0-9_.-' '_').log" 2>&1; then echo "ok   $name ($((SECONDS-t0))s)"
  else echo "FAIL $name ($((SECONDS-t0))s) -> $LOG"; fails+=("$name"); fi; }

if [ "$MODE" = all ]; then
  # Single-line `run: python project_tools/X.py [args]` steps that need no PR-only env.
  while IFS= read -r cmd; do
    step "$cmd" "$PYTHON" ${cmd#python }
  done < <(grep -E '^\s+run: python project_tools/' .github/workflows/repository-integrity.yml \
           | sed -E 's/^\s+run: //' | grep -v '\$' | awk '!seen[$0]++')
  step "node --check (tracked .js)" bash -c 'git ls-files "*.js" | while read -r f; do "$0" --check "$f" || exit 1; done' "$NODE"
  if [ -z "$DIRTY" ]; then
    step "current identity witnesses in sync" "$NODE" project_tools/sync_current_identity_witnesses.js --check
  fi
fi

if [ "$MODE" = all ] || [ "$MODE" = js ]; then
  t0=$SECONDS
  ls project_tools/test_*.js \
    | { [ -n "$MATCH" ] && grep -E "$MATCH" || cat; } \
    | { [ -n "$SKIP" ] && grep -vE "$SKIP" || cat; } > "$LOG/js_list.txt"
  total=$(wc -l < "$LOG/js_list.txt")
  export NODE LOG
  xargs -P "$JOBS" -I{} bash -c 's=$SECONDS; n=$(basename "$1"); "$NODE" "$1" > "$LOG/js_$n.log" 2>&1; echo "$? $((SECONDS-s)) $n"' _ {} \
    < "$LOG/js_list.txt" > "$LOG/js_results.txt"
  jsf=$(awk '$1!=0' "$LOG/js_results.txt" | wc -l)
  echo "JS tests: $total files, failures=$jsf, wall=$((SECONDS-t0))s"
  if [ "$jsf" -ne 0 ]; then
    awk -v lg="$LOG" '$1!=0 {print "  FAIL " $3 "  -> " lg "/js_" $3 ".log"}' "$LOG/js_results.txt"
    fails+=("js-tests($jsf)")
  fi
fi

if [ "$MODE" = all ] || [ "$MODE" = authority ]; then
  step "S0-B source generation" "$NODE" project_tools/release_source_generation_authority.js --candidate "$HEAD_SHA"
  step "S0-F candidate admission" "$NODE" project_tools/release_candidate_generation.js --candidate "$HEAD_SHA"
  step "S0-G evidence settlement" "$NODE" project_tools/release_evidence_settlement.js --candidate "$HEAD_SHA"
  step "S1-A shadow identity (push mode)" "$NODE" project_tools/release_shadow_identity.js --event push --candidate "$HEAD_SHA"
fi

echo "----"
if [ "${#fails[@]}" -eq 0 ]; then echo "LOCAL CI: SUCCESS"; exit 0; fi
printf 'LOCAL CI: FAILURE -> %s\n' "${fails[@]}"; exit 1
