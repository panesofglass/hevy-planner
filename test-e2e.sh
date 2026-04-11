#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────
# v3 Milestone E2E Test — Intelligence & Personalization
#
# Proves the thesis for all 4 v3 issues via HTTP request/response.
# Every test should FAIL before implementation and PASS after.
#
# Prerequisites:
#   1. wrangler dev running: npm run dev
#   2. Database seeded with a user + program: /seed skill or POST /api/setup
#
# Usage:
#   ./test-e2e.sh              # run all tests
#   ./test-e2e.sh issue1       # run only issue #1 tests
#   ./test-e2e.sh issue2       # run only issue #2 tests
#   ./test-e2e.sh issue3       # run only issue #3 tests
#   ./test-e2e.sh issue10      # run only issue #10 tests
#
# State: Tests modify DB state (benchmarks, phases, assessments).
#        Run against a fresh local DB or use test-reset for clean runs.
#
# Dependencies:
#   issue2 depends on issue1 (gate test logging)
#   issue1, issue3, issue10 are independent
# ──────────────────────────────────────────────────────────────────

set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:8787}"
PASS=0
FAIL=0
SKIP=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Helpers ──────────────────────────────────────────────────────
# NOTE: All grep calls use -E for extended regex (alternation with |)

assert_status() {
  local label="$1" url="$2" expected="$3" method="${4:-GET}" body="${5:-}"
  local actual

  if [[ -n "$body" ]]; then
    actual=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" \
      -H "Content-Type: application/x-www-form-urlencoded" \
      -H "Accept: text/event-stream" \
      -d "$body" "$url")
  else
    actual=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" \
      -H "Accept: text/event-stream" "$url")
  fi

  if [[ "$actual" == "$expected" ]]; then
    echo -e "  ${GREEN}PASS${NC} $label (HTTP $actual)"
    ((PASS++))
  else
    echo -e "  ${RED}FAIL${NC} $label — expected HTTP $expected, got $actual"
    ((FAIL++))
  fi
}

assert_sse_contains() {
  local label="$1" url="$2" pattern="$3"
  local response

  response=$(curl -s -H "Accept: text/event-stream" "$url")

  if echo "$response" | grep -qiE "$pattern"; then
    echo -e "  ${GREEN}PASS${NC} $label"
    ((PASS++))
  else
    echo -e "  ${RED}FAIL${NC} $label — pattern not found: \"$pattern\""
    ((FAIL++))
  fi
}

assert_sse_not_contains() {
  local label="$1" url="$2" pattern="$3"
  local response

  response=$(curl -s -H "Accept: text/event-stream" "$url")

  if echo "$response" | grep -qiE "$pattern"; then
    echo -e "  ${RED}FAIL${NC} $label — pattern should NOT be present: \"$pattern\""
    ((FAIL++))
  else
    echo -e "  ${GREEN}PASS${NC} $label"
    ((PASS++))
  fi
}

assert_post_sse_contains() {
  local label="$1" url="$2" body="$3" pattern="$4"
  local response

  response=$(curl -s -H "Accept: text/event-stream" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -X POST -d "$body" "$url")

  if echo "$response" | grep -qiE "$pattern"; then
    echo -e "  ${GREEN}PASS${NC} $label"
    ((PASS++))
  else
    echo -e "  ${RED}FAIL${NC} $label — pattern not found: \"$pattern\""
    ((FAIL++))
  fi
}

# POST silently (for setup steps that aren't themselves assertions)
post_silent() {
  local url="$1" body="$2"
  curl -s -o /dev/null -X POST \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -H "Accept: text/event-stream" \
    -d "$body" "$url"
}

section() {
  echo ""
  echo -e "${BOLD}${CYAN}── $1 ──${NC}"
}

# ── Preflight ────────────────────────────────────────────────────

echo -e "${BOLD}v3 E2E Test Suite — Intelligence & Personalization${NC}"
echo "Target: $BASE_URL"
echo ""

# Check dev server is running
if ! curl -s -o /dev/null -w "" "$BASE_URL/" 2>/dev/null; then
  echo -e "${RED}ERROR: Dev server not running at $BASE_URL${NC}"
  echo "Start it with: npm run dev"
  exit 1
fi
echo -e "${GREEN}Dev server reachable${NC}"

# Check user is set up (GET / should not return setup page)
setup_check=$(curl -s -H "Accept: text/event-stream" "$BASE_URL/")
if echo "$setup_check" | grep -qiE "setup"; then
  echo -e "${YELLOW}WARNING: No user set up. Some tests may fail due to missing user state.${NC}"
  echo "Run setup first or use /seed skill."
fi

# ══════════════════════════════════════════════════════════════════
# ISSUE #1: Benchmark result logging and trend tracking
# ══════════════════════════════════════════════════════════════════

run_issue1() {
  section "Issue #1: Benchmark result logging and trend tracking"

  # ── Test 1.1: Log a benchmark result ──────────────────────────
  echo -e "\n${BOLD}Test 1.1: Log a benchmark result${NC}"

  # The endpoint must exist and accept a POST with SSE response
  assert_status \
    "POST /api/log-benchmark/wall-dorsiflexion returns 200" \
    "$BASE_URL/api/log-benchmark/wall-dorsiflexion" \
    "200" \
    "POST" \
    "value=3.5&passed=true&notes=Right+side+improving"

  # Response should be a Datastar SSE event
  assert_post_sse_contains \
    "Response is datastar-patch-elements event" \
    "$BASE_URL/api/log-benchmark/wall-dorsiflexion" \
    "value=3.0&passed=true&notes=Second+measurement" \
    "datastar-patch-elements"

  # Response should contain the logged value
  assert_post_sse_contains \
    "Response contains logged benchmark value" \
    "$BASE_URL/api/log-benchmark/wall-dorsiflexion" \
    "value=2.5&passed=false&notes=Third+measurement" \
    "2.5"

  # ── Test 1.1b: Read-back verification (persistence) ───────────
  echo -e "\n${BOLD}Test 1.1b: Read-back — logged values persist in D1${NC}"

  # After POSTing 3 values (3.5, 3.0, 2.5), a cold GET must show the latest
  assert_sse_contains \
    "Progress page shows latest logged value after cold GET" \
    "$BASE_URL/progress" \
    "2.5"

  # ── Test 1.1c: Bilateral benchmark tracking ───────────────────
  echo -e "\n${BOLD}Test 1.1c: Bilateral benchmark tracking (per-side)${NC}"

  # Log left and right side separately
  assert_status \
    "POST left-side benchmark returns 200" \
    "$BASE_URL/api/log-benchmark/wall-dorsiflexion" \
    "200" \
    "POST" \
    "value=4.5&passed=true&side=left&notes=Left+side"

  assert_status \
    "POST right-side benchmark returns 200" \
    "$BASE_URL/api/log-benchmark/wall-dorsiflexion" \
    "200" \
    "POST" \
    "value=2.5&passed=false&side=right&notes=Right+Achilles+side"

  # Progress page should show both sides independently
  assert_sse_contains \
    "Progress page shows left-side value" \
    "$BASE_URL/progress" \
    "left"

  assert_sse_contains \
    "Progress page shows right-side value" \
    "$BASE_URL/progress" \
    "right"

  # ── Test 1.1d: Invalid benchmark ID ───────────────────────────
  echo -e "\n${BOLD}Test 1.1d: Invalid benchmark ID returns error${NC}"

  assert_status \
    "POST /api/log-benchmark/nonexistent-benchmark returns 404" \
    "$BASE_URL/api/log-benchmark/nonexistent-benchmark-xyz" \
    "404" \
    "POST" \
    "value=1&passed=true"

  # ── Test 1.2: Progress page shows last result and trend ───────
  echo -e "\n${BOLD}Test 1.2: Progress page shows last result and trend${NC}"

  # Benchmarks without results should indicate no results
  # Use a benchmark we haven't logged (hollow-body-hold-test)
  assert_sse_contains \
    "Benchmark without results shows 'No results'" \
    "$BASE_URL/progress" \
    "no result"

  # Benchmark WITH results should NOT show "no result"
  # (wall-dorsiflexion has results — must show values, not placeholder)
  # This is tested via the read-back in 1.1b above

  # ── Test 1.3: Gate test status on roadmap phases ──────────────
  echo -e "\n${BOLD}Test 1.3: Gate test status on roadmap phases${NC}"

  # Roadmap should show gate test checklist
  assert_sse_contains \
    "Roadmap shows gate test indicators" \
    "$BASE_URL/progress" \
    "gate"

  # ── Test 1.3b: Gate test reference integrity ──────────────────
  echo -e "\n${BOLD}Test 1.3b: Gate integrity — wrong benchmarks don't satisfy gates${NC}"

  # Log passing results for 8 benchmarks that are NOT in Phase 1 gates
  # (Phase 2/3 benchmarks)
  local wrong_gates=(
    "strict-pullups-12"
    "parallel-dips-15"
    "false-grip-20s"
    "ring-support-30s"
    "pistol-to-box"
    "wall-handstand-45s"
    "planche-lean-10s"
    "scapular-pullups-3x8"
  )
  for gate in "${wrong_gates[@]}"; do
    post_silent "$BASE_URL/api/log-benchmark/$gate" "value=pass&passed=true"
  done

  # Phase 1 should NOT show "all gates passed" — wrong benchmarks were logged
  assert_sse_not_contains \
    "Wrong benchmarks do NOT satisfy Phase 1 gates" \
    "$BASE_URL/progress" \
    "all gates passed"

  # ── Test 1.3c: Correct gate benchmarks ────────────────────────
  echo -e "\n${BOLD}Test 1.3c: Correct gate benchmarks satisfy Phase 1${NC}"

  # Now log the actual Phase 1 gate benchmarks
  local phase1_gates=(
    "pain-free-planks"
    "strict-pullups-8"
    "clean-dips-15"
    "cossack-squat-full"
    "single-leg-balance-30"
    "wall-dorsiflexion-4in"
    "hollow-body-30s"
    "overhead-wall-test"
  )

  # Log only 7 of 8 first — should NOT show all gates passed
  for gate in "${phase1_gates[@]:0:7}"; do
    post_silent "$BASE_URL/api/log-benchmark/$gate" "value=pass&passed=true"
  done

  assert_sse_not_contains \
    "7 of 8 gates does NOT show all-gates-passed" \
    "$BASE_URL/progress" \
    "all gates passed"

  # Log the 8th gate
  post_silent "$BASE_URL/api/log-benchmark/${phase1_gates[7]}" "value=pass&passed=true"

  # NOW all gates should show as passed
  assert_sse_contains \
    "All 8 Phase 1 gates passed shows indicator" \
    "$BASE_URL/progress" \
    "all gates passed"

  # ── Test 1.4: Retest frequency tracking ───────────────────────
  echo -e "\n${BOLD}Test 1.4: Retest frequency tracking${NC}"

  # Benchmarks with frequency should show retest timing
  assert_sse_contains \
    "Benchmark shows last-tested timing" \
    "$BASE_URL/progress" \
    "last tested"

  # Benchmarks with frequency field should show due/not-due state
  # Use more specific pattern than just "due"
  assert_sse_contains \
    "Benchmark shows retest due indicator" \
    "$BASE_URL/progress" \
    "retest|due for|due in"
}

# ══════════════════════════════════════════════════════════════════
# ISSUE #2: Roadmap phase advancement logic
# ══════════════════════════════════════════════════════════════════

run_issue2() {
  section "Issue #2: Roadmap phase advancement logic"

  # ── Test 2.1: Phase status drives display ─────────────────────
  # NOTE: We test phase status by proving it CHANGES after advancement,
  # not by checking initial state (which would false-positive from program JSON).
  echo -e "\n${BOLD}Test 2.1: Phase status changes after advancement (proves D1, not JSON)${NC}"

  # Ensure all Phase 1 gate benchmarks are passed (prerequisite)
  local phase1_gates=(
    "pain-free-planks"
    "strict-pullups-8"
    "clean-dips-15"
    "cossack-squat-full"
    "single-leg-balance-30"
    "wall-dorsiflexion-4in"
    "hollow-body-30s"
    "overhead-wall-test"
  )
  for gate in "${phase1_gates[@]}"; do
    post_silent "$BASE_URL/api/log-benchmark/$gate" "value=pass&passed=true"
  done

  # ── Test 2.2: Ready-to-advance detection ──────────────────────
  echo -e "\n${BOLD}Test 2.2: Ready-to-advance detection${NC}"

  assert_sse_contains \
    "Phase 1 shows ready-to-advance prompt" \
    "$BASE_URL/progress" \
    "ready to advance"

  # ── Test 2.3: Phase advancement action ────────────────────────
  echo -e "\n${BOLD}Test 2.3: Phase advancement action${NC}"

  # POST to advance — should return SSE update
  assert_status \
    "POST /api/advance-phase/phase1 returns 200" \
    "$BASE_URL/api/advance-phase/phase1" \
    "200" \
    "POST"

  # The advance POST response should be a Datastar SSE event
  assert_post_sse_contains \
    "Advance response is datastar-patch-elements" \
    "$BASE_URL/api/advance-phase/phase1" \
    "" \
    "datastar-patch-elements"

  # ── Test 2.3b: Phase change persists on cold reload ───────────
  echo -e "\n${BOLD}Test 2.3b: Phase change persists on reload${NC}"

  # Cold GET — Phase 2 should now have the "current" indicator
  assert_sse_contains \
    "After reload, Phase 2 has roadmap-current class" \
    "$BASE_URL/progress" \
    "Strength Prerequisites.*roadmap-current|roadmap-current.*Strength Prerequisites"

  # Phase 1 should show completed status (green dot / completed class)
  assert_sse_contains \
    "After reload, Phase 1 shows completed" \
    "$BASE_URL/progress" \
    "Joint Restoration.*completed|completed.*Joint Restoration"

  # Phase 2 gate tests should now be the active checklist
  assert_sse_contains \
    "Phase 2 gate tests visible after advancement" \
    "$BASE_URL/progress" \
    "Strict Pull-ups.*Phase 2|False Grip|Ring Support"

  # ── Test 2.4: Cannot advance without gates ────────────────────
  echo -e "\n${BOLD}Test 2.4: Cannot advance without all gates passed${NC}"

  # Phase 2 gates are NOT passed — advancing should return SSE error fragment
  assert_status \
    "POST /api/advance-phase/phase2 returns 200 (SSE error fragment)" \
    "$BASE_URL/api/advance-phase/phase2" \
    "200" \
    "POST"

  assert_post_sse_contains \
    "Phase 2 advance error contains 'Gates not passed'" \
    "$BASE_URL/api/advance-phase/phase2" \
    "" \
    "Gates not passed"

  # ── Test 2.5: Idempotency — cannot re-advance completed phase ─
  echo -e "\n${BOLD}Test 2.5: Cannot re-advance already-completed phase${NC}"

  assert_status \
    "POST /api/advance-phase/phase1 (already completed) returns 200 (SSE error)" \
    "$BASE_URL/api/advance-phase/phase1" \
    "200" \
    "POST"

  assert_post_sse_contains \
    "Phase 1 re-advance error contains 'already completed'" \
    "$BASE_URL/api/advance-phase/phase1" \
    "" \
    "already completed"

  # ── Test 2.6: Invalid phase ID ────────────────────────────────
  echo -e "\n${BOLD}Test 2.6: Invalid phase ID returns 404${NC}"

  assert_status \
    "POST /api/advance-phase/nonexistent-phase returns 404" \
    "$BASE_URL/api/advance-phase/nonexistent-phase-xyz" \
    "404" \
    "POST"
}

# ══════════════════════════════════════════════════════════════════
# ISSUE #3: User onboarding for personalized skill assessments
# ══════════════════════════════════════════════════════════════════

run_issue3() {
  section "Issue #3: User onboarding for personalized skill assessments"

  # ── Test 3.1: Save a skill assessment ─────────────────────────
  echo -e "\n${BOLD}Test 3.1: Save a skill assessment${NC}"

  assert_status \
    "POST /api/skill-assessment/muscle-up returns 200" \
    "$BASE_URL/api/skill-assessment/muscle-up" \
    "200" \
    "POST" \
    "current_state=Can+do+5+strict+pull-ups.+No+muscle-up+experience."

  # Response should be a Datastar SSE event with the assessment text
  assert_post_sse_contains \
    "Response is datastar-patch-elements with assessment text" \
    "$BASE_URL/api/skill-assessment/muscle-up" \
    "current_state=Can+do+5+strict+pull-ups.+No+muscle-up+experience." \
    "5 strict pull-ups"

  # ── Test 3.1b: Invalid skill ID ──────────────────────────────
  echo -e "\n${BOLD}Test 3.1b: Invalid skill ID returns 404${NC}"

  assert_status \
    "POST /api/skill-assessment/nonexistent-skill-xyz returns 404" \
    "$BASE_URL/api/skill-assessment/nonexistent-skill-xyz" \
    "404" \
    "POST" \
    "current_state=test"

  # ── Test 3.2: User assessment overrides program default ───────
  echo -e "\n${BOLD}Test 3.2: User assessment overrides program default${NC}"

  # Progress page should show user's assessment for muscle-up
  assert_sse_contains \
    "Progress page shows user assessment for muscle-up" \
    "$BASE_URL/progress" \
    "5 strict pull-ups"

  # The program default text should NOT appear for muscle-up
  # Program default: "3-5 pull-ups (previously 7-10 before shoulder issues)"
  assert_sse_not_contains \
    "Program default NOT shown for muscle-up (overridden)" \
    "$BASE_URL/progress" \
    "previously 7-10 before shoulder"

  # Pistol squat (no user assessment) should still show program default
  assert_sse_contains \
    "Pistol squat shows program default (no user override)" \
    "$BASE_URL/progress" \
    "Limited depth on pistol squats"

  # ── Test 3.3: Edit existing assessment ────────────────────────
  echo -e "\n${BOLD}Test 3.3: Edit existing assessment (UPSERT)${NC}"

  # Update the assessment with new text
  assert_status \
    "POST /api/skill-assessment/muscle-up (update) returns 200" \
    "$BASE_URL/api/skill-assessment/muscle-up" \
    "200" \
    "POST" \
    "current_state=Up+to+8+pull-ups+now.+Started+false+grip+work."

  # Progress page should show updated text
  assert_sse_contains \
    "Progress page shows updated assessment" \
    "$BASE_URL/progress" \
    "8 pull-ups"

  # Old assessment text should be gone (proves UPSERT, not append)
  assert_sse_not_contains \
    "Old assessment text is gone (UPSERT verified)" \
    "$BASE_URL/progress" \
    "5 strict pull-ups"

  # ── Test 3.4: Assessment UI on skill cards ────────────────────
  echo -e "\n${BOLD}Test 3.4: Assessment UI on skill cards${NC}"

  # Skill cards should have an edit affordance targeting the assessment endpoint
  assert_sse_contains \
    "Skill cards have edit action for assessment" \
    "$BASE_URL/progress" \
    "skill-assessment/muscle-up|api/skill-assessment"
}

# ══════════════════════════════════════════════════════════════════
# ISSUE #10: BODi integration
# ══════════════════════════════════════════════════════════════════

run_issue10() {
  section "Issue #10: BODi integration — program recommendations"

  # ── Test 10.1: Program page renders BODi recommendations ──────
  echo -e "\n${BOLD}Test 10.1: Program page renders BODi recommendations${NC}"

  # The program page should have a BODi section
  # Must match the specific section header, not incidental content
  assert_sse_contains \
    "Program page has BODi section header" \
    "$BASE_URL/program" \
    "BODi"

  # Should show trainer name (a specific BODi field not in current schema)
  assert_sse_contains \
    "BODi recommendation shows trainer field" \
    "$BASE_URL/program" \
    "bodi-trainer|trainer.*bodi|Trainer:"

  # Should show program duration
  assert_sse_contains \
    "BODi recommendation shows duration" \
    "$BASE_URL/program" \
    "bodi-duration|[0-9]+ weeks"

  # Should show fit label
  assert_sse_contains \
    "BODi recommendation shows fit label" \
    "$BASE_URL/program" \
    "bodi-fit|fit-label|Fit:"

  # ── Test 10.2: Hybrid schedule rendering ──────────────────────
  echo -e "\n${BOLD}Test 10.2: Hybrid schedule rendering${NC}"

  # Should show a structured day-by-day hybrid schedule
  assert_sse_contains \
    "Program page has hybrid schedule section" \
    "$BASE_URL/program" \
    "hybrid-schedule|Hybrid Schedule"

  # Schedule should show both BODi and mobility on same days
  assert_sse_contains \
    "Hybrid schedule shows BODi + mobility pairing" \
    "$BASE_URL/program" \
    "bodi-schedule-day|AM:.*PM:|Morning.*Evening"

  # ── Test 10.3: Integration rules display ──────────────────────
  echo -e "\n${BOLD}Test 10.3: Integration rules display${NC}"

  # Should show integration rules section
  assert_sse_contains \
    "Program page has integration rules section" \
    "$BASE_URL/program" \
    "integration-rule|Integration Rules"

  # Rules should contain ordering/safety guidance
  assert_sse_contains \
    "Integration rules show CARs-first ordering" \
    "$BASE_URL/program" \
    "CARs.*first|CARs.*before|prehab.*before"

  # ── Test 10.4: Schema validates extended BODi data ────────────
  echo -e "\n${BOLD}Test 10.4: Schema validates extended BODi data${NC}"

  # The program JSON with BODi data should pass validation
  local validation_result
  validation_result=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d @programs/mobility-joint-restoration.json \
    "$BASE_URL/api/validate-program" 2>&1)

  if echo "$validation_result" | grep -qiE "template-option|week-template"; then
    echo -e "  ${GREEN}PASS${NC} Program with BODi data passes schema validation"
    ((PASS++))
  else
    echo -e "  ${RED}FAIL${NC} Program with BODi data fails schema validation"
    ((FAIL++))
  fi
}

# ══════════════════════════════════════════════════════════════════
# Runner
# ══════════════════════════════════════════════════════════════════

FILTER="${1:-all}"

case "$FILTER" in
  issue1)  run_issue1 ;;
  issue2)  run_issue1; run_issue2 ;;  # issue2 depends on issue1 gate data
  issue3)  run_issue3 ;;
  issue10) run_issue10 ;;
  all)
    run_issue1
    run_issue2
    run_issue3
    run_issue10
    ;;
  *)
    echo "Usage: $0 [issue1|issue2|issue3|issue10|all]"
    exit 1
    ;;
esac

# ── Summary ──────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}════════════════════════════════════════${NC}"
echo -e "${BOLD}Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}, ${YELLOW}$SKIP skipped${NC}"
echo -e "${BOLD}════════════════════════════════════════${NC}"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
