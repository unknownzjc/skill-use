---
name: loopme
description: Supervise a Goal Agent through Herdr, independently review its work, and accept or return complete feedback. Use only when the user requests LoopMe or this delegated workflow.
---

# LoopMe

You are the Outer Loop: define the contract and judge the result.
The Goal owns implementation and any optional Peers; do not add roles.

## Setup

Read the available `herdr` skill before running the loop. Require `HERDR_ENV=1`;
otherwise stop. Installed Herdr/runtime help is the authority for command syntax.
Load [config.yaml](config.yaml) before creating a pane. Validate supported version,
readable role paths resolved from this skill directory, nonempty candidate lists,
candidate kinds, array args and optional string models, positive limits,
nonnegative recovery_prompts, and understood strategy/trigger names.
Report invalid configuration before dispatch; do not guess models or probe catalogs.
Read both roles. Load the Goal role using the runtime's native system-prompt option;
pass the Peer role and runtime instructions to the Goal. Outer reading a role alone
is not role injection.

## Task file

Outer creates one task.md in a fresh private /tmp/loopme-<run-id>/ directory before
opening the Goal pane. This is the Goal Package; dispatch its absolute path and a
short read-and-execute instruction, not another copy of its contents.
Write four concise sections:
- Frozen Task: goal, run identity, cwd, acceptance criteria, constraints, non-goals,
  shared context, frozen decisions, unknowns and relevant artifacts. Include Peer
  Runtime: ordered candidates/args, fallback procedure, absolute role path, startup
  and session-recovery instructions. Peer use is optional; these instructions are not.
- Execution and Verification: before dispatch, use known failure evidence and relevant
  code boundaries to identify key invariants, dangerous states/event orders, and ways
  evidence could falsely pass. Turn these into a few task-specific proof obligations,
  not an implementation prescription or exhaustive test matrix. Supply a minimal
  executable counterexample where risk is high and setup cheap; otherwise specify
  the scenario and expected result. For bugs, require a failing minimal reproduction.
  Before expensive end-to-end runs, Goal proves the boundaries and that each critical
  check accepts valid success and rejects well-formed evidence violating its target
  condition, for that reason rather than a parse/setup error. Then verify the current
  final build on the required real surface; no extra approval gate.
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
- READY_FOR_OUTER_REVIEW: increment review round and independently review.
- GOAL_BLOCKED: missing authority/input/external dependency; surface it.
- GOAL_STALLED: no material progress; resume only for a materially different action,
  otherwise retire and replace within max_goal_attempts, or report GOAL_ATTEMPT_LIMIT_REACHED.
No marker: use at most configured recovery prompts; exhaustion is a candidate failure
only if missing_terminal_marker_after_recovery is configured. It is not a review round.
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

After initial scoping, Goal prefers concurrent Peers when two or more substantial
work packages can proceed independently with agreed interfaces and disjoint writes.
Resolve shared prerequisites first, then dispatch each ready batch without waiting
for one Peer to finish before starting another. Keep coupled work with one owner;
do not split by file count, impose a Peer quota, or delegate the entire goal.
Goal owns shared changes and integration; no duplicate work on Peer-owned questions.
Track package/owner/scope/dependencies/status briefly in task.md, not separate files.

Each assignment supplies Shared Context, Owned Question or implementation deliverable,
Search Scope, Expansion Condition, Expected Delta, explicit Write Scope, dependencies,
shared interfaces and observable completion criteria. Goal loads the Peer role,
prompts ready sibling panes and consumes settled results as they arrive; integrate
only returned scopes, without disrupting active writers. Defer tests/build/lint/format
during concurrent writes; Goal verifies the integrated result after writers settle.
Capture results and close completed Peers. Peers do not create further agents.
NEEDS_CONTEXT_EXPANSION returns to Goal; Outer does not control healthy Peers.

## Review and termination

At READY read task.md and independently inspect the actual changes/evidence against
all frozen acceptance, regression risks and relevant checks, not only the supplied
examples. Reports are not proof. Goal owns full verification; Outer reruns the smallest
checks needed for important risks. Record PASS only if satisfied; otherwise write the
complete evidence-backed REJECT batch (failure, evidence, required change) in task.md.
From the first rejection, identify any shared invariant exposed by related failures
and require controlled proof across the implicated states/orders before expensive
verification—not a patch for each example or an unrelated redesign. Prompt Goal to
read the batch, return write ownership, and wait without mid-revision steering.
At max_review_rounds without PASS, report REVIEW_LIMIT_REACHED with findings by round,
repeated/new issues, suspected design/requirement problem, current evidence and options
to redesign, narrow scope, accept stated risk or stop. No new revision without user choice.

On PASS or terminal block/exhaustion/limit, capture evidence and close the owned Goal
pane. If Goal became unavailable, one agent-list query may locate orphaned Peer panes
with this run prefix for cleanup. Never close unrelated panes or delete the worktree.
Retain and report task.md and evidence paths; /tmp is not durable archival storage.
