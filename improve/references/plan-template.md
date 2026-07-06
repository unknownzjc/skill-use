# Handoff Plan Template

Every plan is written for an executor that has **zero context** from the advisor session. The executor may be another agent, a smaller model, or a human developer. Assume the executor can follow precise instructions but should not be expected to fill in missing context or make broad product decisions.

A strong plan has three properties:

1. **Self-contained context** — file paths, current behavior, relevant excerpts, repo conventions, and commands are included in the plan.
2. **Verification gates** — every implementation step has a command or concrete check with expected result.
3. **Boundaries and escape hatches** — in-scope files, out-of-scope areas, and STOP conditions are explicit.

Suggested filename: `plans/NNN-short-slug.md`.

---

## Template

```markdown
# Plan NNN: <Imperative title — what will be true after this plan>

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. Touch only the files listed as in scope. If any STOP condition occurs, stop and report instead of improvising. When done, update the status row for this plan in `plans/README.md` if an index exists.
>
> **Drift check (run first)**: `git diff --stat <planned-at SHA>..HEAD -- <in-scope paths>`
> If any in-scope file changed since this plan was written, compare the Current state excerpts against the live code before proceeding; on a mismatch, stop and report.

## Status

- **Priority**: P1 | P2 | P3
- **Effort**: S | M | L
- **Risk**: LOW | MED | HIGH
- **Depends on**: none | `plans/NNN-*.md`
- **Category**: feature | bug | security | perf | tests | tech-debt | migration | dx | docs | investigation
- **Planned at**: commit `<short SHA>`, <YYYY-MM-DD>

## Why this matters

<2–5 sentences explaining the concrete problem or opportunity, the user/developer impact, and what improves when this lands.>

## Current state

Relevant files:

- `<path>` — <role of this file and why it matters>
- `<path>` — <role of this file and why it matters>

Current behavior / code shape:

- `<path>:<line>` — <short factual description or excerpt>
- `<path>:<line>` — <short factual description or excerpt>

Repo conventions to follow:

- <Naming, layout, error handling, state management, styling, or test pattern.>
- Use `<path>:<line>` as the closest existing example.

Documented intent/design constraints to honor:

- <Relevant ADR, `CONTEXT.md`, `DESIGN.md`, product spec, or roadmap detail, if present.>
- Quote or summarize the specific lines the executor needs; do not assume they will read the source doc.

Important constraints:

- <API compatibility, data compatibility, product, design, security, or migration constraint.>
- <Any assumption the executor must preserve.>

Decision notes, only when a non-obvious naming/shape/boundary choice affects execution:

- <decision>: choose <default> because <repo docs/code/tests/callers or convention>; confidence <high/medium/low>; revisit if <condition>.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Install | `<command or not available>` | exit 0 |
| Typecheck | `<command or not available>` | exit 0, no errors |
| Test | `<command or not available>` | all targeted tests pass |
| Lint | `<command or not available>` | exit 0, no errors |

Only include commands verified from this repo. If a command is unavailable, write `not available` and explain the fallback.

## Scope

In scope — the only files you should modify:

- `<path>`
- `<path>`

Out of scope — do not touch unless the operator approves:

- `<path or area>` — <why excluded>
- `<behavior/API>` — <compatibility or risk reason>

## UI Interaction Contract

Include this section only when the plan changes user-facing UI, forms, settings screens, dialogs, navigation, visible state, or interaction behavior. If the UI change is trivial, write one sentence explaining why a full contract is unnecessary.

User goal and success:

- <What task the user is trying to complete.>
- <What is true when the user succeeds and how success is visible.>

Entry and placement:

- <Where the UI is entered from and where it lives: page/dialog/tab/menu/inline/etc.>
- <Visibility gates: permissions, feature flags, user role, data availability, environment.>

Data and state model:

- <Source of truth: server/settings/store/URL/local storage/props/derived data.>
- <Initial load, draft vs persisted state, dirty state, save/cancel/reset/refetch/close/reload behavior.>
- <Other UI or application areas that must observe the change.>

Controls and input model:

- <Controls to use and why: input/select/combobox/radio/switch/table/etc.>
- <Finite vs dynamic vs custom values; behavior for empty option lists and saved values not in the list.>

Dependency and lifecycle rules:

- <Parent-child field dependencies and recomputation rules.>
- <Whether dependent values are preserved, reset, cleared, disabled, or shown as unknown/custom.>
- <Stale request handling, parent selection/context/type changes, cleanup rules, and data-loss protections.>

Feedback states:

| State | Trigger | UI behavior | User action |
|---|---|---|---|
| Loading | <trigger> | <behavior> | <action or none> |
| Empty | <trigger> | <behavior> | <action or none> |
| Error | <trigger> | <behavior> | <retry/fix/etc.> |
| Saving | <trigger> | <behavior> | <action or none> |
| Saved | <trigger> | <behavior> | <action or none> |
| Disabled | <trigger> | <behavior/explanation> | <action or none> |

Existing data compatibility:

- <Missing/legacy/unknown values: preserve, migrate, ignore, clean, or show as current unknown/custom.>
- <Sensitive value or credential masking, clearing, and overwrite semantics if relevant.>
- <What prevents accidental data loss.>

Copy, terminology, and i18n:

- <User-visible labels, option names, helper text, empty/error/success copy.>
- <Which i18n files or copy conventions to follow.>
- <Product terms to use instead of internal field names.>

Accessibility and keyboard behavior:

- <Labels, error association, focus behavior, keyboard path, disabled explanation.>

UI decision log:

| Decision | Chosen default | Confidence | Risk | Reason |
|---|---|---|---|---|
| <decision> | <default> | high/medium/low | low/medium/high | <repo evidence or UX rule> |

Manual smoke checklist:

- [ ] Open the UI from `<entry point>`.
- [ ] Confirm initial persisted values load correctly.
- [ ] Exercise the primary happy path.
- [ ] Exercise dependency changes and invalid/empty option behavior.
- [ ] Exercise save success and reload persistence.
- [ ] Exercise validation or save failure if feasible.
- [ ] Confirm i18n/copy and keyboard basics for the touched UI.

## Implementation steps

### Step 1: <imperative step title>

Do this:

- <Precise instruction naming files, functions, routes, components, or symbols.>
- <Mention target code shape when load-bearing.>

Verify:

- Run `<command>`.
- Expected: <specific success output, exit code, test count, or behavior>.

### Step 2: <imperative step title>

Do this:

- <Precise instruction.>

Verify:

- Run `<command>`.
- Expected: <specific expected result>.

### Step 3: <imperative step title>

Do this:

- <Precise instruction.>

Verify:

- Run `<command>`.
- Expected: <specific expected result>.

## Test plan

Add or update tests:

- `<test path>` — covers <happy path / regression / edge case>.
- `<test path>` — covers <error path / boundary case>.

Use as pattern:

- `<existing test path>:<line>` — <what pattern to copy>.

Verification:

- Run `<test command>`.
- Expected: all targeted tests pass, including <N> new or updated test cases.

## Done criteria

All must be true:

- [ ] Current-state check completed and no unresolved mismatch remains.
- [ ] Only in-scope files are modified.
- [ ] `<typecheck command>` exits 0, if available.
- [ ] `<lint command>` exits 0, if available.
- [ ] `<test command>` exits 0 and includes the new/updated tests.
- [ ] The behavior described in Why this matters is satisfied.
- [ ] No public API, data shape, or compatibility behavior changed unless explicitly in scope.
- [ ] Plan status is updated to `DONE` in `plans/README.md` if an index exists.

## STOP conditions

Stop and report instead of continuing if:

- Current code no longer matches the Current state section.
- A verification command fails twice after reasonable local fixes.
- The implementation requires touching an out-of-scope file.
- A required command, dependency, service, or test fixture is missing.
- A key assumption in this plan turns out false: `<name assumption>`.
- The fix requires changing public API, data shape, migrations, auth/security posture, or user-visible behavior not explicitly listed as in scope.
- A non-obvious plan decision turns out to conflict with clear repo conventions or observed behavior in the affected surface.
- The change appears to expose or require handling secrets, credentials, or sensitive data not described in this plan.

## Maintenance notes

- Reviewers should focus on <risk area, behavior, API compatibility, or test quality>.
- Future changes to <module/feature> should revisit <constraint or follow-up>.
- Deferred follow-up: <optional, explicitly out-of-scope future work>.
```

---

## Index file: `plans/README.md`

Create this when writing multiple plans:

```markdown
# Implementation Plans

Generated on <date>. Execute in the order below unless dependencies say otherwise.

## Execution order & status

| Plan | Title | Priority | Effort | Depends on | Status |
|------|-------|----------|--------|------------|--------|
| 001  | ...   | P1       | S      | —          | TODO   |
| 002  | ...   | P1       | M      | 001        | TODO   |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (add one-line reason) | REJECTED (add one-line rationale)

## Dependency notes

- 002 requires 001 because <reason>.

## Findings considered and rejected

- <finding>: not worth doing because <one line>.
```

---

## Quality Bar

Before finishing a plan, verify:

- A person or agent with no conversation context can execute it.
- Every step names exact files, symbols, commands, or expected behavior.
- Every verification has a command and expected result.
- Scope and out-of-scope sections are specific.
- UI-facing plans include a UI Interaction Contract, or explicitly explain why the UI change is trivial.
- UI-facing plans make data/state, dependency behavior, feedback states, copy/i18n, accessibility basics, existing-data compatibility, and manual smoke checks explicit.
- Plans with non-obvious naming, shape, or boundary choices record evidence instead of relying on local implementation wording alone.
- STOP conditions are relevant to this plan, not generic boilerplate only.
- Done criteria are machine-checkable.
- Could a weaker executor follow the plan without making product or architecture decisions.
- No secret values are copied into the plan.
