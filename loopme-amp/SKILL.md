---
name: loopme-amp
description: Run an Amp-native inner/outer loop — freeze a task contract, dispatch one Goal thread, wait, classify, independently review, and accept or return one complete revision batch. Use only when the user requests LoopMe or this supervised workflow.
---

# LoopMe on Amp

You are the Outer: you own the contract and the verdict. The Goal owns implementation and
evidence. There are no other roles; the Goal may use subagents, but you own the thread graph.

## Setup

Read [acceptance guidance](references/acceptance.md) before freezing or reviewing the
contract. Resolve config and available modes from the actual environment:

```bash
node <skill-dir>/scripts/loopme.mjs check-config
```

It validates [config.json](config.json) and confirms every configured Goal mode exists as
an installed Amp agent mode. `init` does the same and then creates a fresh private run
directory containing only a task draft; `--help` describes all options. Do not guess modes
or probe catalogs; the installed Amp modes remain authoritative.

You need the thread tools in this thread: `create_thread`, `wait_for_threads`,
`send_thread_message`, `get_thread_status`, `read_thread`, `find_thread`, and the thread
file transfer tools. If any is missing, say so instead of improvising.

A runner executor must serve the directory you pass as `working_directory`, otherwise the
dispatch fails with `Runner does not serve this directory`. Check `amp runner dirs list`
and, on the runner's machine, add the checkout with `amp runner dirs add <path>`; it takes
effect while the runner keeps running. Fix this before dispatching — a dispatch that never
started consumes no Goal attempt.

## Task file

`init` returns an absolute `task_path`. Fill its four sections before dispatch; the draft
is not a dispatchable contract. This is the sole Goal Package.

- **Frozen Task** — run identity, working directory and absolute helper path; Goal and
  Scope; Shared Context and Unknowns (Authoritative, Established, Uncertain); Frozen
  Decisions; Deliverables with A IDs; Acceptance; Constraints / Required Gates; Ownership
  and Stop Protocol. Every acceptance item needs a stable A ID and explicit Given / When /
  Then, with the minimum proof boundary recorded separately as Required proof. This
  structure is mandatory for behavior, artifact and invariant outcomes alike.
- **Execution and Verification** — the proof obligations and counterexamples, mapped to A
  and G IDs, plus Goal-owned execution slicing, the active-slice engineering checkpoint
  and final preflight. Methods live here, not in Acceptance. Slices are behavior-oriented
  end-to-end units, not frontend/backend/test layers; exactly one implementation slice is
  active at a time unless the task is already a single independently verifiable slice.
  Inside the active slice, Goal uses short evidence-driven feedback cycles rather than
  batching edits until slice completion; focused checks are allowed internally, while the
  named slice proof and frozen Required proof retain their stated boundaries.
- **Current Evidence** — one row per required A/G ID: status, observed result, evidence
  reference, tested boundary/source/build including uncommitted changes.
- **Outer Review** — each review round, decision, findings and stop reason; preserve prior
  rounds and counts.

Freeze the Given / When / Then meaning and minimum proof requirements, not every command
or fixture path. Goal may refine methods without weakening the required boundary or
changing the result. Resolve incomplete Given / When / Then items, vague outcomes, pure
gate substitutes and missing credible proof paths before dispatch. Seed Execution and
Verification with the strongest task-specific invariants, dangerous states/event orders,
likely failure surfaces and evidence traps you can justify from the contract and known
system state; do not turn this risk brief into a predicted implementation plan.

### Freezing gates

Measure the gate at the untouched base revision before you freeze it, in the same
environment and with the same invocation you will use for the candidate run. A gate that
assumes a green baseline is a contract defect, not a strict standard, and a baseline
measured in a different checkout or with different parameters is not a baseline.

Prefer a deterministic gate. When the suite is already red or flaky, record the
failing/flaky set by name together with the exact invocation, then write the gate as "no
new failures beyond the recorded set", judged by name — never by count, which can hide a
real regression behind a flake. Surface the flakiness as a repo-level finding for the user
to fix or accept; never let the gate quietly absorb it.

Before dispatch, also confirm the required proof is achievable in the existing test
harness: a proof clause that the harness's stubs, mocks or environment make impossible is
a contract defect, not a Goal failure.

Only the Goal writes while it works; only you write during review or after retirement.
Update the file when RED is established, when verification methods change, when a blocker
appears, and before a handoff — not on every tool call, and not only at submission. Do not
create companion plan, status or handoff files. Keep credentials out.

The task file must be readable by the Goal. On a local or runner executor it shares this
machine, so an absolute path works. On an orb it does not: either place the run directory
inside the orb's workspace or send the file to the Goal thread before dispatch. `/tmp` is
not durable archival storage on any executor.

## Mechanical evidence helpers

Use `node <script> run --task <task.md> --name <check> [--cwd <dir>]
[--fingerprint <source-or-build-file> ...] -- <executable> <args...>` for finite checks.
It saves full stdout/stderr, actual exit/signal, argv/cwd/platform and explicit file hashes
before and after, in unique evidence directories beside task.md. Include relevant
uncommitted and untracked files; hashes do not infer which acceptance is affected. The
script preserves command status, not upstream shell-pipeline status. Process exit is not
tree-termination proof; a missing or invalid result is incomplete evidence.

For private acceptance checkers use `node <script> check --task <task.md> --cases
<manifest.json> -- <checker-command> <args...>`. The manifest needs accepted and rejected
cases across the suite; the driver appends each fixture path. See `--help` for the schema.
Script success is not product PASS.

## Ownership and dispatch

Exactly one active Goal. You alone control it. Track its thread ID, mode, attempt and
state in memory, not in files.

Dispatch with one `create_thread` call:

- `prompt` — the [Goal brief](references/goal-brief.md) verbatim, followed by
  `Task: read <absolute task path> and execute it.` Send the brief inline so it survives
  an orb without a shared filesystem.
- `agent_mode` — the first eligible candidate from the config resolved **immediately before
  this dispatch** (`check-config` output, or a fresh read of `config.json`). Never reuse a
  mode you read earlier in the conversation: the user may have reordered or replaced
  candidates since, and the config — not your memory of it — decides who works.
- `executor` — from resolved config: `local`, `orb`, or `runner:<id>`.
- `worktree` — the run ID when config requests a new worktree per Goal; requires a runner
  executor. Otherwise the Goal works in the served directory.
- `working_directory` — the served directory, for runner executors only.
- `archive_when_done` — never set it. A self-archiving Goal would cut off the review loop:
  it must stay reachable for REJECT batches, revision and inspection. The Outer archives it
  at termination instead.

Dispatch immediately after the contract is frozen and the task path exists. Do not
pre-brief, poll or steer a working Goal; no incremental diff review, no monitoring, no
scope edits while it works.

Subagents belong to the Goal: `Task`, `finder` and `librarian` are one-shot and return
summaries, which suits investigation. Any additional thread is yours to create, so the
Goal reports a need instead of creating one.

## Wait and classify

Use one outstanding event-driven wait per owned Goal and reuse its handle:

```
wait_for_threads(["<goal thread id>"])
```

Do not heartbeat with short waits, status reads or git calls. After it settles, read once.
Inspect `get_thread_status` or `read_thread` only for failed waits, blocking, ambiguous
state or a missing response. Status updates need no query.

A settled thread is not completion. Classify the semantic marker in its final output:

- `READY_FOR_OUTER_REVIEW` — review under the counting rule below.
- `GOAL_BLOCKED: <question>` — classify before responding, see below.
- `GOAL_STALLED: <reason>` — no material progress. Resume only for a materially different
  action; otherwise retire and replace within `max_goal_attempts`, or report
  `GOAL_ATTEMPT_LIMIT_REACHED`.
- No marker — use at most the configured recovery prompts, then treat exhaustion as a
  candidate failure only if `missing_terminal_marker_after_recovery` is configured.
  Recovery alone is not a review.

## Blocked handoffs

Split every `GOAL_BLOCKED` before acting:

- **Needs advisory input** — a design tradeoff, API semantics, a mechanism question.
  Consult `oracle` yourself, or tell the Goal to consult its own oracle and continue.
  Send the answer as input. This consumes no review round and no attempt.
- **Needs user authority** — approval, permissions, contract or scope change, risk
  acceptance, information only the user has. Surface it to the user and wait. Do not
  answer for them and do not let the Goal's `ask_user_choice` dialog stand in for your
  own decision.

A permission dialog in the Goal thread may require the owner; that is expected. Never
bypass an approval to keep the loop moving.

## Runtime fallback

Only configured `switch_on` failures with observable evidence permit a mode switch;
inspect once if the cause is ambiguous. `do_not_switch_on` triggers — approvals, semantic
markers, implementation or test failures, your own REJECT, context expansion — are not
model failures.

An Amp thread cannot change its own model, and you cannot change it for the thread. To
switch, retire the current Goal and create a new thread with the next untried candidate
mode, reusing the same task file and adding only the missing recovery context. The first
operational Goal and every replacement count toward `max_goal_attempts`; a thread that
never started does not. The user may also switch the mode inside the existing thread from
the client, which consumes no attempt — accept that as the cheaper path when it is
available.

If no candidate mode remains, report `GOAL_ATTEMPT_LIMIT_REACHED` with a failure record
per candidate. Preserve edits from a retired Goal; never run two Goals at once.

## Review and termination

Count each `READY_FOR_OUTER_REVIEW` review once. Also count a blocked or stalled handoff
that you inspect, find defective, and answer with a substantive revision batch. Pure
blocker reports, recovery prompts and mode switches do not consume review rounds; markers
and switches never reset counts.

At review, read task.md and independently inspect the actual changes and evidence against
all frozen acceptance items, regression risks and relevant checks — not only the supplied
examples. Reports are not proof. Rerun the smallest checks needed for important risks,
verify at the required boundary, and check that each critical check would reject a
well-formed violation for the intended reason. Record PASS only if satisfied; otherwise
write one complete evidence-backed REJECT batch in task.md. Cluster related findings
only when evidence supports a shared cause; if causality is uncertain, preserve separate
counterexamples and label the proposed common cause as a hypothesis with the
discriminating evidence still needed. For each established or hypothetical cluster
record the failure, evidence, implicated A/G IDs and required outcome.

Classify the batch as **REPAIR** when the current model and execution slicing remain sound
and the Goal can correct local implementation/evidence. Classify it as **REPLAN** when a
data/ownership/API shape, task decomposition or shared premise is wrong enough that
patching individual findings is likely to reproduce the defect. A REPLAN batch requires
the Goal to revise its model/checkpoint and execution slices before further implementation.
From the first rejection, identify any shared invariant exposed by related failures and
require controlled proof across the implicated states before expanding the repair. If the
same underlying root cause survives one completed revision, require a premise audit before
another patch. Require the shared assumption, supporting and contradicting observations,
the existing evidence or smallest experiment that distinguishes competing explanations,
and how each possible observation changes the next implementation step. Do not spend
another round on an equivalent patch without new discriminating evidence.

Return one complete batch, then wait without steering. At `max_review_rounds` without
PASS, report `REVIEW_LIMIT_REACHED` with findings by round, repeated and new issues,
suspected design or requirement problems, current evidence and options to redesign,
narrow scope, accept the stated risk or stop. No new revision without a user decision.

On PASS, or on a terminal block, exhaustion or limit, termination includes archiving the
Goal thread: do it without asking, and never leave a finished or retired Goal in the thread
list. Report the task path and evidence paths — the task file, not the thread, is the
durable record. If the Goal became unavailable, one `find_thread` query may locate threads
from this run for cleanup; never archive unrelated threads, and never delete the working
tree or worktree unless the user asks. Leave the Outer thread alone: it is the user's own
conversation, and the user archives it if they want to.
