---
name: loopme
description: Run user-requested coding goals through a Herdr-managed outer review loop with an autonomous Goal Agent and optional Peer Agents. Use when the user asks for LoopMe or explicitly requests this delegated review workflow; do not use for routine coding tasks that do not request delegation.
---

# LoopMe

Use an outer loop to supervise an autonomous inner loop.

The current agent running this skill is the **Outer Loop**.

The Outer Loop delegates implementation to a **Goal Agent**. The Goal Agent
may create **Peer Agents** for focused independent work.

Herdr is used to start agents, communicate with them, wait for them, and
inspect their results.

## Runtime Prerequisite

Before starting the loop, read and follow the available `herdr` skill. Verify
that the Outer Loop is running inside Herdr:

```bash
test "${HERDR_ENV:-}" = 1
```

If that check fails, report that LoopMe requires a Herdr-managed pane and stop.
Use the installed `herdr` CLI help as the authority for current syntax.

## Runtime Configuration

Before opening a pane, load [config.yaml](config.yaml). It is the source of
truth for role paths, ordered Goal and Peer runtime candidates, fallback
policy, and loop limits. Resolve relative role paths from the LoopMe skill
directory.

Validate the loaded configuration before dispatch:

- `version` is supported,
- both roles resolve to readable files,
- each Agent has at least one candidate with a `kind`,
- `args` is an array and `model`, when present, is a string,
- configured limits are positive integers,
- `recovery_prompts` is a non-negative integer,
- the fallback strategy and trigger names are understood.

Report a configuration error before creating any pane rather than guessing a
model or silently repairing the file. Do not probe model catalogs up front;
the ordered candidates are the configured choices.

## Roles

Before starting a Goal Agent, read the configured Goal role and resolve its
absolute path. Load it into the new process with the candidate runtime's native
system-prompt argument. Reading the role in the Outer Loop is not a substitute
for giving it to the Goal Agent.

Before delegating peer creation, read the configured Peer role and resolve its
absolute path. Give that path, the ordered Peer candidates, and the applicable
fallback policy to the Goal Agent in the Peer Runtime portion of its Goal
Package.

Role references define behavior. `config.yaml` defines which runtimes perform
the roles.

## Loop Limits

Use the limits loaded from `config.yaml` unless the user explicitly provides
different ones. `max_goal_attempts` includes the initial operational Goal Agent
and any replacement. Switching models within the same session does not create
a new Goal attempt. A candidate that fails before accepting the Goal Package
does not consume a Goal attempt.

A review round begins only when a Goal Agent reports
`READY_FOR_OUTER_REVIEW`. A pre-review stall, blocked state, startup failure,
or missing readiness marker is not a REJECT and does not consume a review
round.

## Control Invariants

- Keep exactly one active Goal Agent for the loop.
- The Outer Loop owns and controls the Goal Agent.
- The Goal Agent owns and controls its Peer Agents.
- Only an Agent's owner may prompt it, wait on it, read it, send keys to it,
  or revise its assignment.
- The Outer Loop must not directly control a Peer while its Goal Agent is
  available. It may close an orphaned Peer pane only as terminal cleanup.
- Every pane created by LoopMe has a cleanup owner. Keep its agent name, pane
  ID, role, owner, candidate, attempt, state, and write scope in memory; do not
  create a state file.
- The Outer Loop creates a short unique Run Identity before delegation. Every
  Goal and Peer name in the run must use that prefix, so orphaned Agents remain
  discoverable without persistent orchestration state.
- Do not start a replacement Goal Agent until the prior Goal Agent has been
  classified, its persisted work has been inspected, and its pane has been
  retired.
- Close only panes created by this LoopMe run. Never delete the worktree as
  part of Agent cleanup.

## Herdr Lifecycle

Default to a sibling pane in the current tab and the requested repository or
working directory. Preserve the user's focus. Parse pane and agent identifiers
from Herdr's JSON responses rather than predicting them.

For initial startup or a replacement that cannot reuse the session, the shape is:

```bash
herdr pane split --current --direction right --cwd <working-directory> --no-focus
herdr agent start <goal-name> --kind <candidate-kind> --pane <pane-id> -- \
  [--model <candidate-model>] \
  <candidate-args...> \
  --append-system-prompt <absolute-goal-role-path>
```

Pass native arguments as separate arguments without `eval`. Omit `--model`
when the candidate has no model. If a configured runtime uses a different
native option for loading the role, use that runtime's supported equivalent.

The configured runtime is OMP (`kind: omp`). Herdr launches `omp` with the
native arguments after `--`; use its interactive mode, not `--print` or RPC
mode. OMP accepts `--model <provider/model>`, `--thinking <level>` (including
`max`), and `--append-system-prompt <absolute-file-path>`, which loads the
role file's contents. Keep session persistence enabled for fallback recovery.
For recovery after process exit, use `--resume <exact-session-id-or-path>`
rather than `--continue`, which selects the previous session implicitly.

Choose the split direction from the current layout as directed by the `herdr`
skill. Prepare the complete Goal Package before creating the pane. After the
agent becomes ready, prompt it immediately with
`herdr agent prompt <goal-name> <package> --wait`.

Use event-driven waiting:

- Keep only one outstanding lifecycle wait for each owned Agent.
- If the command surface yields a reusable execution or wait handle, continue
  that same wait instead of starting another.
- Do not run short repeated `wait`, `get`, `read`, `git status`, or `git diff`
  calls as a heartbeat while an Agent is working.
- After the Agent settles, read its response once. Use `agent get` only when a
  wait fails, the state is blocked or ambiguous, or the response cannot be
  classified.
- A status update to the user does not require querying the Agent.

Herdr lifecycle state is not semantic completion. Classify the response by its
role marker. For a Goal Agent, the expected markers are
`READY_FOR_OUTER_REVIEW`, `GOAL_BLOCKED`, and `GOAL_STALLED`.

If a Goal Agent settles without a marker, use the configured number of recovery
prompts to ask it to continue or return the correct marker. Exhausting recovery
prompts is a candidate failure only when
`missing_terminal_marker_after_recovery` is configured as a fallback trigger.

If the agent is `blocked`, inspect the UI and preserve approval and authority
boundaries before sending input. If alternate-screen history truncates the
handoff, use the `herdr` skill's file-output fallback.

## Runtime Fallback

Fallback handles an unusable Agent runtime; it is not another implementation
or review loop.

Select candidates in configured order. For Goal fallback, prefer a
candidate not yet used in the run when configured. When
`try_each_peer_candidate_once_per_assignment` is enabled, try each eligible
Peer candidate at most once for that assignment. Healthy Peer candidates may
be used again for later, distinct assignments. Do not start candidates merely
to test them.

Switch candidates only for a configured `switch_on` condition supported by
observable evidence. When the command does not already explain the failure,
inspect the Agent once with `agent get` and `agent read`. A wait timeout alone
is not proof of failure: if the read shows material work still progressing,
resume event-driven waiting instead of switching candidates.

Fallback preserves the existing conversation by default. For both Goal and
Peer Agents, change the model in the original session rather than creating a
new Agent and resending handoff context.

Before switching:

1. capture the failure evidence and any persisted work,
2. classify whether the candidate must be quarantined for the rest of the run,
3. let any active turn or tool operation settle, or safely interrupt it using
   the runtime's supported controls; never bypass an approval boundary,
4. use the runtime's native in-session controls to select the next eligible
   candidate's model and apply its supported mutable settings, including
   thinking level when configured,
5. verify the selected model and settings through the runtime UI or status,
   then continue the existing assignment in that same conversation.

Discover the supported controls from the installed runtime's help or UI; do
not guess a Herdr model-switch command or treat startup arguments as chat
instructions. A model-selection UI action may not cause a working lifecycle
transition, so verify its result before starting the normal work wait.

Keep the Agent name, pane, role, conversation history, assignment, Write Scope,
and owned Peers intact. Update the active candidate in memory without resetting
candidate eligibility, quarantine, recovery, attempt, or review counters. Do
not resend the Goal Package, Peer assignment, or a handoff summary when that
context is already in the session. If needed, send only a short continuation
prompt. After an ambiguous prompt-delivery failure, first check whether the
original assignment was accepted; deliver it only if it is absent.

If the process exited, prefer the runtime's supported resume mechanism for the
exact existing session with the next candidate. Never assume that reusing a
pane or working directory restores a conversation; verify session identity
and history before continuing. A process restart that resumes the same session
does not create a new Goal attempt.

Only replace the Agent when no session exists yet, the session cannot be
resumed, or the next candidate requires an incompatible runtime or startup-only
settings. Capture that reason, retire the prior owned Agent and pane, and start
the next candidate with the same role and assignment plus only the recovery
context needed to continue. Never keep the failed and replacement Agent active
together. Preserve partial changes; do not reset or delete them as cleanup.
A new Goal session receives the current repository state and a concise handoff;
a new Peer session receives its assignment and captured context delta with the
same Write Scope.

A Goal candidate that fails before accepting the Goal Package does not consume
a Goal attempt. Replacing a session that accepted the package and began work
consumes the next Goal attempt and remains bounded by `max_goal_attempts`.
In-session fallback is bounded by candidate eligibility and quarantine, not by
creating artificial Goal attempts. Report `GOAL_ATTEMPT_LIMIT_REACHED` instead
of creating a replacement beyond the limit.

Conditions listed under `do_not_switch_on` keep their normal semantic handling.
In particular, an approval or user-input block must be surfaced, a semantic
terminal marker must be honored, test failures remain implementation work, and
an Outer REJECT returns to the active Goal Agent.

If all Goal candidates are unavailable, report `GOAL_RUNTIME_EXHAUSTED` with
one concise failure record per candidate and stop automatic dispatch. If all
Peer candidates fail, the Goal Agent records `PEER_RUNTIME_EXHAUSTED` and
continues the owned goal itself or chooses another materially different
approach; Peer failure alone does not terminate the Goal.

## Outer Loop

The Outer Loop is responsible for:

1. understanding the user's goal,
2. preserving the original requirements and constraints,
3. defining clear acceptance criteria when needed,
4. delegating execution to the Goal Agent,
5. waiting while the inner loop works,
6. independently reviewing the result,
7. accepting the result or returning concrete feedback.

The Outer Loop should not perform the primary implementation itself.

While the Goal Agent is working, the Outer Loop does not steer implementation,
inspect incremental diffs, monitor Peer Agents, or reinterpret the goal. It
intervenes only for an explicit blocked or authority request, a failed wait,
or an unclassifiable settled response.

Its main responsibilities are:

- delegation,
- review,
- acceptance,
- rejection.

The Outer Loop has final authority over whether the goal is complete.

## Goal Package

When starting the Goal Agent, provide a concise package containing:

- Goal
- Run Identity
- Frozen Acceptance Criteria
- Constraints
- Shared Context
- Frozen Decisions
- Non-goals
- Unresolved Questions
- Relevant Artifacts and Files
- Verification Expectations
- Repository or working directory
- Peer Runtime:
  - the configured ordered Peer candidates, including native args,
  - the applicable fallback policy, including same-session model switching,
  - the absolute path to the configured Peer role,
  - the instruction for loading that role when starting a Peer Agent.

Include only information that changes execution decisions. Preserve the
user's original intent.

Acceptance criteria and constraints are the review contract. References,
examples, prior exploration, and recommendations are supporting context, not
additional requirements unless the Goal Package explicitly promotes them to
the contract. Do not expand the contract during review.

## Inner Loop

Start the Goal Agent using the next eligible configured Goal candidate.

The Goal Agent owns execution of the task. It may:

- inspect the repository,
- plan,
- implement,
- test,
- fix failures,
- create Peer Agents,
- integrate useful Peer results.

The Goal Agent should continue working autonomously until it returns one of:

- `READY_FOR_OUTER_REVIEW`: the result is verified and ready for review,
- `GOAL_BLOCKED`: progress requires missing authority, user input, or an
  unavailable external dependency,
- `GOAL_STALLED`: safe in-scope work no longer produces material progress or
  decision-relevant evidence.

Readiness is not final acceptance. A stalled or blocked result is not REJECT.

## Peer Agents

Peer Agents are independent temporary collaborators.

A Peer Agent receives a focused assignment from the Goal Agent. Examples:

- investigate a bug,
- inspect a subsystem,
- propose an implementation,
- review a diff,
- analyze a failing test,
- check an edge case.

Peers do not own the overall goal.

Start Peer Agents using the configured ordered Peer candidates and fallback
policy.

Prefer focused assignments over delegating the entire goal.

The Goal Agent starts each Peer in a separate Herdr pane, loads the supplied
Peer role at process startup, prompts it with a bounded assignment, waits for a
settled state, reads the result, and closes the Peer pane after its work is
captured.

Before creating a Peer, the Goal Agent must define:

- Shared Context: context the Peer may consume without rediscovering it,
- Owned Question: one knowledge gap or deliverable owned by the Peer,
- Search Scope: the initial files, symbols, or subsystem it may inspect,
- Expansion Condition: evidence that justifies requesting more context,
- Expected Delta: the new knowledge or artifact the Peer must return,
- Write Scope: an explicit non-overlapping set of files, or read-only.

The Goal Agent must not investigate the Peer-owned question concurrently.
Different Peers must not own overlapping questions or write scopes. A Peer
that needs broader context returns `NEEDS_CONTEXT_EXPANSION`; the Goal Agent
decides whether to supply context, expand the scope, or end the assignment.

Peer use is optional, but the Peer Runtime must always be included in the Goal
Package so the Goal Agent can make that choice without rediscovering
configuration.

## Outer Review

When the Goal Agent reports `READY_FOR_OUTER_REVIEW`, increment the review
round and independently inspect the result against the frozen review contract.

Review:

- the original goal,
- every acceptance criterion,
- the implementation or diff,
- relevant tests,
- regressions,
- important edge cases,
- unresolved risks.

Do not accept the Goal Agent's explanation as proof. Inspect the actual
artifacts and evidence.

Finish the complete review before returning a decision. Send all actionable
findings as one batch. After REJECT, do not inspect or steer the in-progress
revision; wait for the next `READY_FOR_OUTER_REVIEW` before reviewing again.

Run verification in proportion to risk. The Goal Agent owns the full
implementation verification; the Outer Loop independently reruns only the
smallest checks needed to validate important findings and acceptance risks.

Return one of two decisions:

### PASS

Use when the goal and acceptance criteria are satisfied.

The task is complete.

### REJECT

Use when further work is required.

Return concrete feedback containing:

- what is wrong,
- evidence,
- what must change.

Send that feedback back to the Goal Agent and let the inner loop continue.
Use `herdr agent prompt <goal-name> <feedback> --wait`, then read the new
handoff before reviewing again.

If the same defect class or design seam fails repeatedly, identify it as a
possible technical-design problem instead of continuing unchanged revisions.

If the result cannot PASS within `max_review_rounds`, stop automatic revision
and report `REVIEW_LIMIT_REACHED` to the user with:

- the findings from each review round,
- which findings repeated and which were new,
- the suspected technical-design or requirement problem,
- current implementation and verification evidence,
- options to redesign, narrow scope, accept a stated risk, or stop.

Do not dispatch another revision until the user chooses how to proceed.

## Loop

The normal lifecycle is:

```text
STARTING -> WORKING -> READY -> REVIEWING -> PASS
                |                    |
                |                    +-> REJECT -> REVISING -> WORKING
                |
                +-> GOAL_BLOCKED
                +-> GOAL_STALLED

STARTING or WORKING -- configured runtime failure --> FALLBACK
FALLBACK -- switch model or resume existing session --> WORKING
FALLBACK -- session unavailable or incompatible --> STARTING (replacement)
FALLBACK -- no eligible candidate --> GOAL_RUNTIME_EXHAUSTED
```

On `GOAL_STALLED`, inspect its evidence once. Resume the same Goal Agent only
when there is a materially different next action. Otherwise retire its pane
and start one replacement if `max_goal_attempts` permits. If the attempt limit
is exhausted, report `GOAL_ATTEMPT_LIMIT_REACHED` instead of starting another
Agent.

On PASS, blocked termination, runtime exhaustion, attempt-limit exhaustion, or
review-limit exhaustion, capture the final evidence and close the Goal pane.
If the Goal Agent became unavailable before cleaning its Peers, the Outer Loop
may perform one Agent-list query and close only orphaned panes whose names use
this run's unique prefix. Use each recorded pane ID and the installed Herdr CLI
syntax; do not infer pane IDs or close unrelated panes.

## Principles

Keep the system simple.

The Outer Loop judges. The Goal Agent executes. Peer Agents assist.

Herdr provides runtime and communication.

Do not introduce additional agent roles unless there is a demonstrated need.
