# Planning Mode

Use this reference for normal `/improve` planning, backlog creation, finding-to-plan conversion, and plan review. Planning mode produces plan artifacts only; it does not edit implementation files.

## Goal

Write a self-contained handoff plan that an executor can follow without conversation context. The plan must be specific, bounded, verifiable, and explicit about when to stop instead of improvising.

## 1. Classify the request

Choose the smallest applicable mode:

- **Known task** — user already knows what should change.
- **Finding-driven** — plan comes from a bug, audit finding, performance issue, security issue, test gap, or tech-debt item. Read `references/finding-format.md` first.
- **Backlog** — split a larger initiative into a few ordered executable plans plus an index.
- **Review** — critique or tighten an existing plan.

Capture the target outcome in one sentence: what will be true after the plan is executed?

If the user only provides a plan path without an action, do not assume execution. Summarize or review the plan, or ask one focused question if the intent is unclear.

## 2. Recon the repo

Read enough to make the plan concrete:

- README, AGENTS/CLAUDE/CONTRIBUTING when present.
- Root config and CI/test config such as `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, test configs, and workflow files.
- Relevant source files, adjacent tests, and examples of the pattern to follow.
- Optional intent docs: ADRs, `CONTEXT.md`, `DESIGN.md`, product specs, roadmap docs.
- Existing plan directory state, only to avoid overwriting unrelated plans or duplicating the same objective.

Record the facts the executor needs:

- Language, framework, package manager, and verified commands.
- Naming/layout/error-handling/state/testing conventions.
- Current-state file paths and line references.
- Compatibility, product, security, migration, or data constraints.

When a change exposes or translates behavior through a different surface or representation — for example backend-to-public API, adapter-to-facade, database-to-API, SDK-to-product, or service-to-UI/CLI — inspect that surface's adjacent patterns before choosing names, paths, shapes, or terminology. Prefer the affected surface's conventions over local implementation wording, and record evidence for non-obvious choices.

For UI-facing work, read `references/ui-interaction-contract.md` and inspect nearby UI, design-system components, i18n, loading/error/empty states, validation/save/cancel patterns, and state-management conventions.

## 3. Resolve ambiguity

Resolve ambiguity from evidence before asking: repo docs/design notes, neighboring code in the affected area, tests, generated specs, existing callers, then common industry conventions. Choose the least surprising repo-consistent default and document the evidence.

Ask only when a decision remains material and high risk after recon, such as data loss, security/sensitive-data handling, irreversible behavior, saved-data shape, external or public contract semantics, product terminology that changes meaning, or a boundary choice that changes long-term architecture.

For low-risk ambiguity, choose the repo-consistent default and document it as an assumption, decision note, or STOP condition.

When asking, ask exactly one focused question with 2–4 concrete options and a recommended default.

## 4. Write the plan

Before writing:

- Read `references/plan-template.md`.
- For UI-facing plans, read `references/ui-interaction-contract.md`.
- Re-open every file cited by the plan yourself; do not rely on stale notes, subagent summaries, or user-provided line numbers.

Use one file per executable objective:

```text
plans/
  README.md              # only for multiple plans
  001-short-slug.md
  002-short-slug.md
```

If `plans/` already has an unrelated project purpose, use `handoff-plans/` and say so.

Each plan must include the material required by `references/plan-template.md`, especially:

- Status metadata and planned-at commit.
- Why this matters.
- Current state with file paths and line references.
- Repo conventions, verified commands, and any evidence-backed decisions that prevent executor improvisation.
- Scope and out-of-scope boundaries.
- Ordered steps with verification gates.
- Test plan, done criteria, STOP conditions, and maintenance notes.
- For UI-facing work: a concise `UI Interaction Contract` or an explicit explanation that the UI change is trivial.

## 5. Compact quality check

Before delivering, fix high-signal gaps only:

- Could an executor with no chat context follow this?
- Are every step, scope item, command, and expected result concrete?
- Are commands verified from repo config/docs rather than guessed?
- Are all implementation files mentioned by steps in scope?
- Are out-of-scope boundaries and STOP conditions specific to this plan?
- For non-obvious naming, shape, or boundary choices, does the plan cite repo evidence instead of relying on implementation wording alone?
- Are done criteria machine-checkable?
- For UI work, are state, dependencies, feedback, existing-data compatibility, copy/i18n, accessibility basics, and smoke checks explicit?
- Are secret values omitted?

Do not inflate the plan with boilerplate just to satisfy the checklist.

## 6. Deliver, optionally ask, and optionally dispatch

Present the written or updated plan path(s) and a concise summary.

Use the post-plan `ask_user` decision gate only when all of these are true:

- Planning mode actually wrote or updated one or more executable plan artifacts.
- The session is interactive enough to use `ask_user`.
- The user did not explicitly request `plan only`, `just write the plan`, `do not execute`, `no follow-up question`, or equivalent.

If any condition is false, stop after presenting the plan summary. Include the manual command the user can run later:

- Single plan: `pi "/skill:improve execute <plan-path>"`
- Backlog/multiple plans with an index: `pi "/skill:improve execute"` so execute mode selects the next executable plan from the index.

Before presenting a herdr dispatch option, check whether this pane is inside herdr:

```bash
test "${HERDR_ENV:-}" = "1"
```

If inside herdr, call `ask_user` with exactly one focused decision:

- `Execute in new herdr tab` — dispatch a separate herdr-managed pi session. For a single plan, dispatch `/skill:improve execute <plan-path>`. For backlog/multiple plans with an index, dispatch `/skill:improve execute` without a plan argument so execute mode selects the next executable plan from the index.
- `Keep plan only` — stop after planning.
- `Revise plan` — wait for the user's revision instructions or ask for the single most important revision detail if they did not provide one.

If not inside herdr, do not offer `Execute in new herdr tab`. Instead call `ask_user` with options such as:

- `Keep plan only` — stop after planning.
- `Show manual execute command` — print the appropriate `pi "/skill:improve execute..."` command and stop.
- `Revise plan` — wait for the user's revision instructions or ask for the single most important revision detail if they did not provide one.

If the user chooses `Execute in new herdr tab`, do not implement in the current pane. Read and follow `references/post-plan-dispatch.md`.

If the user chooses `Keep plan only` or `Show manual execute command`, stop after responding.

If the user chooses `Revise plan`, revise only plan artifacts unless the user later makes an explicit execution request.

## Backlogs

Create a small `README.md` index only when multiple plans are needed. Include execution order, dependencies, blocked/deferred notes, and rejected findings or approaches. Prefer the smallest coherent set of high-leverage plans.

## Plan review

When reviewing or tightening a plan, check:

- Self-contained context.
- Verification gate per step.
- Specific scope, out-of-scope, and STOP conditions.
- Machine-checkable done criteria.
- Hidden assumptions that rely on this conversation.
- UI interaction contract quality when relevant.

Patch the plan only if the user asked for direct improvement.
