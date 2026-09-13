---
name: loopme
description: Supervise a Goal Agent through Herdr, independently review its work, and accept or return complete feedback. Use only when the user requests LoopMe or this delegated workflow.
---

# LoopMe

You are the Outer Loop: define the contract and judge the result.
The Goal owns implementation and any optional Peers; do not add roles.

## Setup

Read the available `herdr` skill. Scripts require Node.js >=22 with no dependencies
or installation step. From the actual execution shell, run
`node <skill-dir>/scripts/loopme.mjs init`; it requires HERDR_ENV=1,
validates [config.json](config.json) and readable roles, and discovers supported kinds
from installed Herdr help before creating anything. Use returned JSON paths/run_id
and resolved config; model/provider readiness is explicitly not checked. For validation
without initialization use `check-config`; `--help` describes all options.
Do not guess models or probe catalogs. Installed runtime help remains authoritative.
Read both roles and inject Goal's role with the native system-prompt option. Supply
Peer Runtime and the absolute script path to Goal; reading a role is not role injection.

## Task file

`init` creates a fresh private run directory in the system temp directory (normally
/tmp), containing only a task.md draft. No Agent is started. Before opening the Goal
pane, fill its four sections below; the draft is not a dispatchable contract. This is
the sole Goal Package: dispatch its returned absolute path and a short instruction.
- Frozen Task: goal, run identity, cwd, acceptance criteria, constraints, non-goals,
  shared context, frozen decisions, unknowns, artifacts and absolute helper script path. Peer
  Runtime: ordered candidates/args, fallback procedure, absolute role path, startup
  and session-recovery instructions. Peer use is optional; these instructions are not.
- Execution and Verification: before dispatch, use known failure evidence and relevant
  code boundaries to identify key invariants, dangerous states/event orders, and ways
  evidence could falsely pass. Turn these into a few task-specific proof obligations,
  not an implementation prescription or exhaustive test matrix. Supply a minimal
  executable counterexample where risk is high and setup cheap; otherwise specify
  the scenario and expected result. For bugs, require a failing minimal reproduction.
  Before broad implementation/caller migration, Goal challenges the chosen high-risk
  mechanism with its strongest known counterexample at the actual boundary; failure
  means revise the mechanism, not expand it. Record invariant, experiment, expected/
  observed failure reason, and tested surface in task.md. Each critical check must
  accept valid success and reject a well-formed violation for the intended reason.
  Helper/mocked proof does not cover production launch options or another platform:
  verify the real entry path and final build; label unavailable native proof separately.
  Finish reachable work without claiming that missing proof; no extra approval gate.
- Current Evidence: initially unverified; Goal records status (unverified, failed,
  needs recheck, verified), commands/results, evidence paths and tested source/build,
  including uncommitted changes. Invalidate evidence affected by edits; old builds
  and substitute scenarios do not establish final success.
- Outer Review: initially not reviewed; Outer records each round, decision, findings,
  evidence and stop reason. Preserve previous rounds and counts.

Outer owns the frozen contract and review; Goal owns methods and evidence and may
adapt implementation without weakening acceptance or adding intermediate approvals.
Only Goal writes while working; only Outer writes during review or after retirement.
Peers return evidence to Goal, not to this file. Update when RED is established,
verification methods change, blockers arise, and before handoff—not every tool call
or only at submission. No companion plan/status/handoff files or Outer polling.
Reuse the same path on revision/fallback/resume.
After context loss read it; if missing, Outer reconstructs from preserved records
before redispatch, never guesses absent contract/evidence. Keep credentials out.
Supporting references/methods are not extra acceptance criteria; freeze scope.

## Mechanical evidence helpers

Use `node <script> run --task <task.md> --name <check> [--cwd <dir>]
[--fingerprint <source-or-build-file> ...] -- <executable> <args...>` for finite
checks. It saves full stdout/stderr, actual exit/signal, argv/cwd/platform and explicit
file hashes before/after, in unique evidence directories beside task.md. Include
relevant uncommitted/untracked files; hashes do not infer which acceptance is affected.
The script preserves command status, not upstream shell-pipeline status; use explicit
pipefail where needed. Keep services/Agents on existing lifecycle tools. Process exit
is not tree-termination proof; a missing/invalid result.json is incomplete evidence.

For private acceptance checkers use `node <script> check --task <task.md>
--cases <manifest.json> -- <checker-command> <args...>`. The driver appends each fixture
path. Manifest version 1 contains cases with name, fixture (relative to manifest), and
expect: `{outcome:"accepted"}` or `{outcome:"rejected",assertion:"stable_id"}`; include
both kinds. Checker stdout is one JSON object: accepted + exit 0, rejected with the
matching assertion + exit 1, or invalid with message + exit 2. Crashes/parse errors,
wrong reasons and inconsistent exits never count as a successful negative. See
`--help` for valid JSON examples. Agent owns fixtures, business assertions and final
judgment; script success is not product PASS. Record summary paths in task.md.
Do not put credentials in recorded argv/logs; environment values are not dumped.
On Windows, temp-directory privacy relies on its ACL; POSIX directories use mode 0700.

## Ownership and startup

Exactly one active Goal. Outer alone controls Goal; Goal alone controls Peers.
Only the owner prompts, waits, reads, sends keys or revises assignments. Outer may
close orphaned Peer panes only when Goal is unavailable. Track names, pane IDs,
roles, owners, candidates, attempts, states and write scopes in memory, not files.
Use a short unique run prefix for all agent names; parse identifiers from JSON.
Use a sibling pane in the current tab/cwd, split according to the Herdr layout,
with --no-focus. Never change workspace/worktree topology without user request.
Prepare the task first; after startup readiness, prompt immediately with its path.

```bash
herdr pane split --current --direction <right-or-down> --cwd <cwd> --no-focus
herdr agent start <name> --kind <kind> --pane <pane-id> --   [--model <model>] <candidate-args...> --append-system-prompt <absolute-role-path>
herdr agent prompt <name> "Read <absolute-task-path> and execute; update evidence before your terminal handoff." --wait
```

Pass native args as separate argv, not eval. Omit absent --model. OMP uses interactive
mode with persistence, not --print/RPC/--no-session; --append-system-prompt reads the
role file; --thinking supports max. For other runtimes use their native equivalents.

## Wait and classify

Use one outstanding event-driven lifecycle wait per owned agent; reuse its handle.
Do not heartbeat with short wait/get/read/git calls. After settling read once;
inspect get/read only for failed waits, blocking, ambiguous state or missing response.
Status updates need no query. Working Goal is autonomous: no incremental diff review,
Peer monitoring or steering except explicit blocking/authority or lifecycle ambiguity.
Herdr idle/done is not completion. Classify the semantic marker:
- READY_FOR_OUTER_REVIEW: independently review under the counting rule below.
- GOAL_BLOCKED: missing authority/input/external dependency; surface it.
- GOAL_STALLED: no material progress; resume only for a materially different action,
  otherwise retire and replace within max_goal_attempts, or report GOAL_ATTEMPT_LIMIT_REACHED.
No marker: use at most configured recovery prompts; exhaustion is a candidate failure
only if missing_terminal_marker_after_recovery is configured. Recovery alone is not a review.
Approval blocks must not be bypassed. If Goal output is truncated, read task.md;
for Peer output use Herdr's file-output fallback. Timeout with observed progress
means resume waiting, not runtime replacement.

## Runtime fallback

Follow configured order, preference for untried Goal candidates, per-assignment Peer
eligibility and quarantine. Healthy Peers may be reused for other assignments.
Only configured switch_on failures with observable evidence permit fallback; inspect
once if ambiguous. Honor do_not_switch_on: approvals, semantic markers, implementation/
test failures, Outer REJECT and context expansion are not model failures.
Capture failure/persisted work and quarantine only for a configured reason.
Prefer changing model in the existing session: settle or safely interrupt active work,
use supported native controls, apply candidate settings including thinking, verify
selection, then continue. Preserve name, pane, role, history, assignment, scopes,
owned Peers and counters. No package/handoff replay; a short continue prompt suffices.
For ambiguous delivery check acceptance before sending any missing assignment.
Don't invent commands; model controls may not cause a working lifecycle transition.
After exit prefer --resume <exact-session-id-or-path>, not --continue; verify identity
and history. Same-session model change or exact resume consumes no new Goal attempt.
Replace only if no session exists, resume is unavailable, or candidate runtime/startup
settings are incompatible. Classify prior work and retire old agent/pane first; never
run both. Preserve edits. New Goal reads the same task file, with only missing recovery
context added; new Peer gets assignment/context delta with unchanged Write Scope.
The first operational Goal and replacements count toward max_goal_attempts; pre-package
startup failures do not. Replacement of a working session uses the next attempt;
fallback never resets counters. No attempt remaining: GOAL_ATTEMPT_LIMIT_REACHED.
No Goal candidate eligible: GOAL_RUNTIME_EXHAUSTED with a failure record per candidate.
No Peer candidate eligible: PEER_RUNTIME_EXHAUSTED; Goal continues or changes approach.

## Peers

After initial scoping, Goal records substantial packages, owners, scopes and dependencies
briefly in task.md. Prefer concurrent Peers for ready independent packages. A shared file
or unsettled interface is a prerequisite to isolate, not a blanket veto: Goal owns that
boundary and integration. If staying solo, name the concrete coupling or small scope
that makes delegation unhelpful, not merely "optional" or "tightly coupled".
Reassess after the prerequisite resolves, a mechanism changes, or the first substantive
REJECT. Consider distinct investigation/fixture work even when implementation is coupled.
Mechanism proof is a readiness dependency for broad implementation packages, including
Peer assignments: settle and run the minimal experiment before that writing batch.
Dispatch ready siblings before waiting; do not duplicate their questions, invent trivial
packages, impose a quota, or delegate the entire goal. Outer checks this decision at
handoff, not through mid-execution supervision.

Each assignment names its kind and owned deliverable; separates Supplied Context
into Authoritative, Established and Uncertain; and supplies Required Starting
Material, Expansion Boundary, Expansion Triggers, Expected Delta, explicit Write
Scope, dependencies, shared interfaces and relevant proof obligations/completion
criteria. Required Starting Material is the minimum input to inspect; Expansion
Boundary is a ceiling, not a reading checklist. Conditional references are read only
after their trigger occurs. `Uncertain: none` means execution against settled context,
not permission to invent additional research.
Goal loads the role, prompts ready sibling panes, consumes settled results as they
arrive, and integrates only returned scopes without disrupting active writers. Defer
tests/build/lint/format
during concurrent writes; Goal verifies the integrated result after writers settle.
Capture results and close completed Peers. Peers do not create further agents.
NEEDS_CONTEXT_EXPANSION returns to Goal; Outer does not control healthy Peers.

## Review and termination

Count each READY review once; also count any blocked/stalled-handoff inspection that
finds defects and issues a substantive revision batch, including checker-only fixes.
Pure blocker reports, recovery prompts and model changes do not consume review rounds;
markers and model switches never reset counts or exempt real revisions from the limit.
At review read task.md and independently inspect the actual changes/evidence against
all frozen acceptance, regression risks and relevant checks, not only the supplied
examples. Reports are not proof. Goal owns full verification; Outer reruns the smallest
checks needed for important risks. Record PASS only if satisfied; otherwise write the
complete evidence-backed REJECT batch (failure, evidence, required change) in task.md.
From the first rejection, identify any shared invariant exposed by related failures
and require controlled proof across the implicated states/orders before expanding the
repair or expensive verification—not equivalent local patches or an unrelated redesign.
Return one complete batch only while below the review limit, then wait without steering.
At max_review_rounds without PASS, report REVIEW_LIMIT_REACHED with findings by round,
repeated/new issues, suspected design/requirement problem, current evidence and options
to redesign, narrow scope, accept stated risk or stop. No new revision without user choice.

On PASS or terminal block/exhaustion/limit, capture evidence and close the owned Goal
pane. If Goal became unavailable, one agent-list query may locate orphaned Peer panes
with this run prefix for cleanup. Never close unrelated panes or delete the worktree.
Retain and report task.md and evidence paths; /tmp is not durable archival storage.
