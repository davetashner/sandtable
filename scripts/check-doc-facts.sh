#!/usr/bin/env bash
# Documented facts must match the code they describe (`sand-pmz.37`).
#
# A fact that lives in code gets restated in prose; the code moves, the prose
# does not. Four of those in one week: AGENTS.md named three required checks
# where the ruleset had five and described the `web` job as a list of npm
# commands `npm run verify` had replaced; both agent files said "the first pack
# is the Schlieffen Plan" with five eras merged; the visual gate's scene count
# was quoted four ways (25, twenty, twenty-four, twenty-two) with the list
# holding a fifth number; and README.md counted four eras with five in
# `content/eras/`. Two of those were fixed the same way, which is the whole
# idea: stop restating, derive.
#
# So this gate derives four facts and checks every restatement against the
# derivation. It runs in CI's `lint` job (via `scripts/check-content.sh`) and
# so in `npm run verify` — deliberately, because AGENTS.md is markdownlint-
# ignored and nothing in CI read it at all.
#
# The rule it holds itself to: it must never fire on legitimate prose. A check
# people learn to route around is worse than no check, so it asserts only facts
# with an unambiguous source in the repository, through an idiom that appears
# only when someone is stating that fact, and every failure names the file, the
# line, the wrong value and where the true one lives.
#
# `docs/decisions/` is out of scope on purpose. An ADR is a dated record of a
# decision, not a description of the present, and its prose is right to say
# what was true then — ADR 0021 says "the four eras that existed when it was
# written", ADR 0007 counts "two scenes" meaning photographs. Gating those
# would be exactly the check people route around. `content/`, `poc/` and the
# vendored `.agents/` skills are out for the same reason.
#
# Usage: check-doc-facts.sh [root]   — root defaults to the working directory,
# so the tests can point it at a fixture tree (`scripts/doc-facts.test.ts`).
set -euo pipefail

cd "${1:-.}"

fail=0
bad() { printf '  ✗ %s\n' "$*"; fail=1; }

# The living documentation: everything that describes the repository as it is
# now. See the header for what is excluded and why.
#
# `-prune` rather than `-not -path`: the latter matches after the walk, so it
# still descends into node_modules and tests every file in it only to reject
# it. Pruning cuts the subtree before entering it. (No timing here on purpose
# — a benchmark in a comment is the drift this gate exists to catch.)
DOCS=()
while IFS= read -r d; do DOCS+=("$d"); done < <(
  find . \
    \( -path '*/node_modules' \
    -o -path './.git' \
    -o -path './.claude' \
    -o -path './.beads' \
    -o -path './.agents' \
    -o -path './dist' \
    -o -path './poc' \
    -o -path './content' \
    -o -path './docs/decisions' \) -prune \
    -o -name '*.md' -print |
    sed 's|^\./||' | sort
)

# ---------------------------------------------------------------- the truths

# How many eras the app has: one directory with a pack in it, per era.
ERAS=$(find content/eras -mindepth 2 -maxdepth 2 -name 'pack.json' | wc -l | tr -d ' ')

# How many scenes the visual gate walks: the SCENES array and nothing else in
# that file (VIEWPORTS is an array of arrays too).
SCENES=$(
  awk '/^export const SCENES = \[/ { inside = 1; next }
       inside && /^\];/           { inside = 0 }
       inside && /^[ \t]*\[/ { n++ }
       END { print n + 0 }' scripts/lib/visual-scenes.mjs
)

# The gate list, in order: `verify` is its only definition (ADR 0023).
GATES=$(jq -r '.scripts.verify' package.json |
  grep -oE 'npm (run [A-Za-z0-9:._-]+|test)' |
  sed -e 's/^npm run //' -e 's/^npm test$/test/')

# Every job the two gate workflows define. The ruleset that makes a job a
# required check lives in GitHub's settings and cannot be read from here, so
# this is not the ruleset — it is the set of jobs a paragraph about required
# checks has to account for, which is what caught nothing when `visual` and
# `analyze` were added to the ruleset and the docs still said three.
JOBS=$(grep -hE '^    name: ' .github/workflows/ci.yml .github/workflows/codeql.yml |
  sed 's/^    name: //' | sort)

# A derivation that silently comes back empty is the worst outcome available to
# a gate like this: it would pass every document by asserting nothing, which is
# the bug it exists to catch wearing a green tick.
[ "$ERAS" -gt 0 ] || { bad "no content/eras/*/pack.json — nothing to derive the era count from"; exit 1; }
[ "$SCENES" -gt 0 ] || { bad "no SCENES array in scripts/lib/visual-scenes.mjs"; exit 1; }
[ -n "$GATES" ] || { bad "package.json has no verify script to derive the gate list from"; exit 1; }
[ -n "$JOBS" ] || { bad "no job names in .github/workflows/ci.yml or codeql.yml"; exit 1; }

# ------------------------------------------------------- counting in English

# Prose here spells numbers out ("twenty-two scenes") as often as it digits
# them ("25 scenes"), and both forms have drifted, so both are read.
NUM='[0-9]+|(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)-(one|two|three|four|five|six|seven|eight|nine)|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|one|two|three|four|five|six|seven|eight|nine'

word_value() {
  case "$1" in
  one) echo 1 ;; two) echo 2 ;; three) echo 3 ;; four) echo 4 ;; five) echo 5 ;;
  six) echo 6 ;; seven) echo 7 ;; eight) echo 8 ;; nine) echo 9 ;; ten) echo 10 ;;
  eleven) echo 11 ;; twelve) echo 12 ;; thirteen) echo 13 ;; fourteen) echo 14 ;;
  fifteen) echo 15 ;; sixteen) echo 16 ;; seventeen) echo 17 ;;
  eighteen) echo 18 ;; nineteen) echo 19 ;; twenty) echo 20 ;; thirty) echo 30 ;;
  forty) echo 40 ;; fifty) echo 50 ;; sixty) echo 60 ;; seventy) echo 70 ;;
  eighty) echo 80 ;; ninety) echo 90 ;;
  *) echo "" ;;
  esac
}

# "twenty-two" -> 22, "25" -> 25, anything else -> empty.
num() {
  local w a b va vb
  w=$(printf '%s' "$1" | tr 'A-Z' 'a-z')
  case "$w" in
  '' | *[!0-9]*) ;;
  *)
    printf '%s' "$w"
    return
    ;;
  esac
  a=${w%%-*}
  b=${w#*-}
  va=$(word_value "$a")
  if [ "$b" = "$w" ]; then
    printf '%s' "$va"
    return
  fi
  vb=$(word_value "$b")
  if [ -n "$va" ] && [ -n "$vb" ]; then printf '%s' "$((va + vb))"; fi
}

# Text inside quotation marks is being reported, not asserted. A retrospective
# that says a file once said "the first pack is the Schlieffen Plan" is a true
# sentence about a false one, and a gate that could not tell them apart would
# make the incident unwritable — this doc-fact gate is itself documented in
# docs/agent-workflow.md, which is where that surfaced. So the two assertions
# that read a claim out of running prose read it out of the *unquoted* prose:
# every character between a pair of double quotes is blanked, line numbers and
# everything outside them intact. State resets at a blank line, so an unpaired
# quote costs one paragraph rather than silently switching the gate off for the
# rest of the file.
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

awk '
  FNR == 1 { inq = 0 }
  /^[ \t]*$/ { inq = 0; print FILENAME ":" FNR ":" $0; next }
  {
    # Literals, so a byte-wise awk matches the whole character; a bracket class
    # would match its bytes and shred every other em-dash on the line.
    gsub(/“/, "\""); gsub(/”/, "\"")
    # Most lines carry no quotation mark and are not inside one; the character
    # walk is only for the ones that do.
    if (!inq && index($0, "\"") == 0) { print FILENAME ":" FNR ":" $0; next }
    out = ""
    for (i = 1; i <= length($0); i++) {
      c = substr($0, i, 1)
      if (c == "\"") { inq = !inq; out = out c; continue }
      out = out (inq ? " " : c)
    }
    print FILENAME ":" FNR ":" out
  }' "${DOCS[@]}" > "$TMP/prose"

# A stated count of <noun> must be the derived one. Nothing else is asserted:
# a doc that states no number states nothing that can go stale, which is how
# the scene count was fixed and is always the cheaper answer.
assert_count() {
  local noun=$1 truth=$2 where=$3 hit file rest line text m word got
  while IFS= read -r hit; do
    [ -n "$hit" ] || continue
    file=${hit%%:*}
    rest=${hit#*:}
    line=${rest%%:*}
    text=${rest#*:}
    while IFS= read -r m; do
      word=${m%% *}
      got=$(num "$word")
      [ -n "$got" ] || continue
      if [ "$got" -ne "$truth" ]; then
        bad "$file:$line says \"$word $noun\" — there are $truth ($where)"
      fi
    done < <(printf '%s\n' "$text" | grep -oiE "\b($NUM) $noun\b" || true)
  done < <(grep -iE "\b($NUM) $noun\b" "$TMP/prose" || true)
}

# ------------------------------------------------------------- the assertions

echo "  facts: $ERAS eras, $SCENES visual scenes, $(echo "$GATES" | wc -l | tr -d ' ') gates, $(echo "$JOBS" | wc -l | tr -d ' ') CI jobs"

# 1. How many eras are in the app. `content/eras/` is the register.
assert_count eras "$ERAS" 'content/eras/'

# The same fact stated without a number: the app was described as having one
# pack for as long as it had five. Only the copula forms are matched — "the
# first pack to exercise `pace`" is a true sentence about a pack and is left
# alone.
if [ "$ERAS" -gt 1 ]; then
  while IFS= read -r hit; do
    [ -n "$hit" ] || continue
    file=${hit%%:*}
    rest=${hit#*:}
    bad "$file:${rest%%:*} says \"$(printf '%s' "${rest#*:}" | grep -oiE 'the (first|only) pack is')…\" — content/eras/ holds $ERAS packs, and / is the atlas that lists them"
  done < <(grep -iE 'the (first|only) pack is' "$TMP/prose" || true)
fi

# 2. How many scenes the visual gate walks. Quoted four ways once already.
assert_count scenes "$SCENES" 'scripts/lib/visual-scenes.mjs'

# 3. Name two of the CI jobs in one paragraph and you have to name them all.
#
# The rule is that blunt on purpose. There is no way to derive which checks the
# ruleset requires — that setting lives in GitHub and cannot be read from a
# build — so the derivable fact is the weaker one: what jobs exist. Half a list
# is what actually rots. AGENTS.md named `lint`, `security` and `web` for a week
# after `visual` and `analyze` joined the ruleset; CONTRIBUTING.md and README.md
# were still doing it when this gate was written. Naming two and stopping is
# always the shape, and naming all five is a short sentence.
#
# It only counts a job named as its own code span, so `npm run lint` in a
# command line is not a mention of the `lint` job.
JOB_LIST=$(echo "$JOBS" | tr '\n' ',' | sed -e 's/,$//' -e 's/,/, /g')
while IFS= read -r hit; do
  [ -n "$hit" ] || continue
  file=${hit%%:*}
  rest=${hit#*:}
  bad "$file:${rest%%:*} names some of the CI jobs but not ${rest#*:} — .github/workflows/ci.yml and codeql.yml define $JOB_LIST, and a paragraph that names two of them names them all"
done < <(JOBS="$JOBS" awk '
  function flush(  i, hits, missing) {
    if (start == 0) return
    # A wrapped list indents its continuation, so `analyze\n  (javascript-
    # typescript)` rejoins with three spaces. The names are one span either way.
    gsub(/[ \t]+/, " ", block)
    hits = 0; missing = ""
    for (i = 1; i <= nj; i++) if (index(block, "`" job[i] "`")) hits++
    if (hits < 2) return
    for (i = 1; i <= nj; i++) if (!index(block, "`" job[i] "`")) {
      missing = missing (missing == "" ? "" : " and ") "`" job[i] "`"
    }
    if (missing != "") print startfile ":" start ":" missing
  }
  BEGIN { nj = split(ENVIRON["JOBS"], job, "\n") }
  FNR == 1 { flush(); block = ""; start = 0 }
  /^[ \t]*$/ { flush(); block = ""; start = 0; next }
  { if (start == 0) { start = FNR; startfile = FILENAME } ; block = block " " $0 }
  END { flush() }
' "${DOCS[@]}")

# 4. The gate list. `verify` is the list; a doc that spells it out must spell
# out all of it, in order. Both idioms the docs use are read, and both are
# recognised the same way — every command named has to be a gate. A block that
# also runs `npm run dev` is a menu of scripts, not the gate list, and is left
# alone; three gates is the floor for calling something an enumeration.
GATE_LIST=$(echo "$GATES" | tr '\n' ' ' | sed 's/ $//')
# Every token has to be a gate for a slash-run to be the gate list, so that is
# what the pattern asks for: `docs/decisions/0011.md` never reaches the loop.
GATE_ALT=$(printf '%s' "$GATES" | sed 's/\./\\./g' | tr '\n' '|')

# (a) `lint/format:check/typecheck/…`, the slash-run form.
while IFS= read -r hit; do
  [ -n "$hit" ] || continue
  file=${hit%%:*}
  rest=${hit#*:}
  line=${rest%%:*}
  spelt=${rest#*:}
  tokens=$(printf '%s' "$spelt" | tr '/' '\n')
  [ "$(printf '%s\n' "$tokens" | wc -l | tr -d ' ')" -ge 3 ] || continue
  all_gates=1
  for t in $tokens; do
    printf '%s\n' "$GATES" | grep -qxF "$t" || all_gates=0
  done
  [ "$all_gates" -eq 1 ] || continue
  if [ "$(printf '%s' "$tokens" | tr '\n' ' ')" != "$GATE_LIST" ]; then
    bad "$file:$line spells the gate list as \"$spelt\" — package.json's verify runs $GATE_LIST"
  fi
done < <(grep -oHnE "($GATE_ALT)(/($GATE_ALT)){2,}" "${DOCS[@]}" || true)

# (b) a fenced block of `npm run …` lines, the way docs/agent-workflow.md
# writes it.
while IFS= read -r hit; do
  [ -n "$hit" ] || continue
  file=${hit%%:*}
  rest=${hit#*:}
  line=${rest%%:*}
  spelt=${rest#*:}
  if [ "$spelt" != "$GATE_LIST" ]; then
    bad "$file:$line lists the gates as \"$spelt\" — package.json's verify runs $GATE_LIST"
  fi
done < <(GATES="$GATES" awk '
  function flush(  i, ok, out) {
    if (n >= 3) {
      ok = 1
      for (i = 1; i <= n; i++) if (!(cmd[i] in gate)) ok = 0
      if (ok) {
        out = ""
        for (i = 1; i <= n; i++) out = out (i > 1 ? " " : "") cmd[i]
        print startfile ":" start ":" out
      }
    }
    n = 0; start = 0
  }
  BEGIN { split(ENVIRON["GATES"], g, "\n"); for (i in g) gate[g[i]] = 1 }
  FNR == 1 { if (fenced) flush(); fenced = 0 }
  /^[ \t]*```/ { if (fenced) flush(); fenced = !fenced; next }
  !fenced { next }
  /^[ \t]*npm[ \t]+run[ \t]+[A-Za-z0-9:._-]+/ {
    c = $0; sub(/^[ \t]*npm[ \t]+run[ \t]+/, "", c); sub(/[ \t].*$/, "", c)
    if (start == 0) { start = FNR; startfile = FILENAME }
    cmd[++n] = c; next
  }
  /^[ \t]*npm[ \t]+test([ \t]|$)/ {
    if (start == 0) { start = FNR; startfile = FILENAME }
    cmd[++n] = "test"; next
  }
  END { if (fenced) flush() }
' "${DOCS[@]}")

exit "$fail"
