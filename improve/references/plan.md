# Plan and Review

Use this reference for planning and plan review. In planning mode, implementation files are read-only; only plan artifacts may change.

A plan is a zero-context handoff. Its executor must not need this conversation or make product or architecture choices that repository evidence could have resolved.

## Workflow

### 1. Determine the output

- Default to one plan for one executable outcome.
- Create a backlog only when multiple objectives are independently executable or have real dependency boundaries.
- Treat findings as planning inputs, not as a separate mode.
- Treat an execution prompt as a delivery format: inline the complete plan and instruct the executor to obey its scope, verification gates, and stop conditions.
- For review, identify whether the user wants findings only or direct edits to the plan artifact.

### 2. Inspect the repository

Read only what is needed to make the plan specific:

- Repository instructions and relevant root configuration.
- Relevant source, adjacent tests, and the closest existing examples.
- Intent documents such as ADRs, design docs, product specs, or migration notes when they constrain the change.
- Existing plan artifacts only far enough to avoid overwrites, duplicated objectives, or broken dependencies.
- For UI-facing work, read `references/ui-interaction-contract.md` and inspect nearby design-system components, i18n, loading/error/empty states, validation/save/cancel patterns, and state-management conventions.

Record:

- Language, framework, package manager, and repository conventions.
- Build, test, lint, typecheck, generation, migration, or smoke-test commands verified from repository configuration or documentation. If no command is discoverable, say so and provide a concrete manual check; never invent one.
- Current behavior and evidence using `path + symbol/config key/route/test name/section heading`. Use `path:line` or a short excerpt only when the location is ambiguous, security-sensitive, or the exact snapshot matters.
- Compatibility, product, security, data, and migration constraints.
- Produced and consumed contracts: APIs, signatures, schemas, config keys, events, file formats, public types, and dependency-injection seams.
- When relevant, ownership, construction order, cleanup, failure, cancellation, retry, concurrency, state transitions, producer/consumer timing, and effectful caller chains.
- Verification scope: what each command covers and whether in-scope changes alone can satisfy it.

Re-open every cited repository location before writing the plan. Do not rely on stale notes, user-supplied line numbers, or subagent summaries as final evidence.

### 3. Resolve material ambiguity

Use repository conventions and recorded decisions for low-risk choices. Ask one focused question, with a recommended option, only when a missing decision materially changes public API, data shape, security posture, migration behavior, or product semantics.

Do not leave choices for the executor. Each step must state one chosen action. Put useful reasoning and rejected alternatives in the rationale section. If a decision genuinely cannot be made, place an explicit project-specific `STOP`, ask-user, or deferred marker at the affected step.

### 4. Write or review the artifact

Use `plans/` unless it already has an unrelated purpose; then use `handoff-plans/`. Use one file per executable objective. Create an index only for multiple plans.

For a new plan, use the compact shape below and include optional sections only when applicable. For review:

- Remove assumptions that depend on conversation context.
- Make scope, dependencies, commands, expected results, and done criteria concrete.
- Resolve executor choices or convert genuinely blocked choices into local stop conditions.
- Confirm identifiers and contracts match everywhere they appear.
- Patch the artifact when direct improvement was requested; otherwise report findings.

### 5. Audit before delivery

Read and run `plan-audit.md` as a separate mandatory gate for every new, updated, or reviewed plan. Do not restate its checklist here.

Record the required per-step verdicts and evidence-backed notes in an authored or updated plan's **Audit evidence** section. For critique-only review, include them in the report. For a multi-plan set, record Part C results in the index and reconcile every index decision back into the affected plan bodies.

### 6. Deliver and stop

Report the artifact path and key decisions. Do not modify implementation files. Implementation requires a later explicit request to execute the reviewed plan.

## Finding inputs

Before planning from a finding:

1. Confirm the evidence in the current repository.
2. Record a stable location, observed behavior, impact, confidence, fix risk, and a brief fix direction.
3. Merge duplicates and reject documented tradeoffs or items whose value does not justify their cost.
4. Turn low-confidence findings into investigation plans rather than speculative fix plans.
5. Prioritize by expected impact, confidence, implementation effort, and fix risk; use priority and effort fields only when ranking a backlog.
6. If credentials are found, record only the location and credential type and recommend rotation. Never reproduce the value.

Category IDs and fixed finding schemas are optional. Evidence quality is not.

## Multiple plans

Use the smallest coherent plan set. The index should contain:

- Recommended execution order and canonical status: `TODO | IN_PROGRESS | DONE | BLOCKED | REJECTED`.
- Priority and effort for backlog triage, plus dependencies.
- A contract matrix naming each producer, consumer, shape or behavior, and verification.
- Dependency topology, ownership, and construction order for new long-lived components when applicable.
- Deferred or intentionally missing capabilities and which consumers must not assume them.
- Rejected findings or approaches when recording them prevents repeated work.
- The evidence required by `plan-audit.md` Part C.

Minimal status table:

```markdown
| Plan | Title | Priority | Effort | Depends on | Status |
|---|---|---|---|---|---|
| 001 | ... | P1 | S | — | TODO |
```

## Compact plan shape

```markdown
# Plan: <imperative title>

- **Status**: TODO
- **Planned at**: `<commit or repository snapshot>`, <YYYY-MM-DD>
- **Risk**: LOW | MED | HIGH
- **Depends on**: none | `<plan path>`

> **Executor boundary**: Compare the cited current state with the live repository before editing. Touch only files in Scope, run every verification gate, and stop rather than expanding scope or guessing through drift.

## Outcome

<Observable facts that will be true after execution.>

## Context

- `<path>` — <current behavior at `symbol`, config key, route, test name, or section>.
- `<path>` — <existing pattern the executor must follow>.
- Verified commands: `<command>` → <expected success>.
- Constraints and chosen decisions: <compatibility, product, security, data, migration, or design facts>.

## Contracts and risks

<Include only when relevant. Name produced/consumed contract shapes and verification. For stateful, concurrent, or effectful work, state ownership, topology, transitions, completion/error/cancellation/cleanup propagation, and the guard or check for each material risk.>

## Scope

In:
- `<path>` — <allowed change>.

Out:
- `<file, behavior, or interface>` — <why it must remain unchanged>.

## Steps

### 1. <chosen change>

Change:
- <Exact files, symbols, and final behavior. No deliberation or alternative branches.>

Verify:
- `<command or concrete check>`
- Expected: <observable result>.

### 2. <chosen change>

Change:
- <Exact instruction.>

Verify:
- `<command or concrete check>`
- Expected: <observable result>.

## Final verification

- `<command or manual scenario>` → <expected result>.
- Confirm every command is scope-closed or that out-of-scope consumers remain compatible.

## Done

- [ ] Outcome is satisfied.
- [ ] Every verification gate passes.
- [ ] Only in-scope implementation files and plan status artifacts changed.
- [ ] Declared compatibility, contract, lifecycle, and security constraints hold.

## Stop if

<List only project-specific blockers or high-risk assumptions, especially unresolved public API, data, migration, security, or product-semantic decisions. Generic scope and drift rules already appear in Executor boundary.>

## Design rationale / rejected alternatives

<Omit when no non-obvious decision needs preservation. Keep reasoning here, never in executable steps.>

## Audit evidence

- Step verdicts: `<Step 1: clean; Step 2: moved ... to rationale; ...>`
- Objects checked: `<identifiers, contracts, commands, dependency edges, states, or call chains>`.
- Mismatches fixed: `<none or concrete fixes>`.
- Remaining assumptions or deferred decisions: `<none or explicit items>`.
```
