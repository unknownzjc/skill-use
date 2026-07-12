# Execute an Existing Plan

Use this reference only after the user explicitly asks to execute an existing improve plan. Execution happens on the current branch and working tree; do not create an isolated worktree.

## Activation boundary

- Planning, finding, backlog, and review requests cannot modify implementation files.
- An initial request to "plan and implement" still stops after planning. Execution requires a later confirmation after the user has seen the plan, `/improve execute`, or an equivalent request naming an existing plan.
- Implementation changes are limited to the selected plan's Scope. The plan and index may change only for execution status.
- Never commit, merge, push, rebase, or reset unless the user separately requests that git operation.

## Select exactly one plan

1. Resolve a user-supplied path, number, or slug to one plan.
2. Otherwise read the active `plans/README.md`, or `handoff-plans/README.md`, and choose the first dependency-ready `TODO` plan in its recommended order.
3. Use only canonical status values: `TODO | IN_PROGRESS | DONE | BLOCKED | REJECTED`. Skip every status except `TODO`.
4. If candidates tie, ordering is absent, or dependencies conflict, ask one focused question and recommend the lowest-numbered candidate.
5. If no executable plan exists, report that fact; do not invent work.

## Preflight

Before editing implementation files:

1. Read the selected plan fully and read its index when present.
2. Confirm dependencies are `DONE` and the plan is `TODO`.
3. In a git repository, inspect `git status --short`.
   - Stop and ask if existing changes overlap an in-scope file; direct execution could overwrite user work.
   - Record unrelated changes and avoid touching them.
4. Re-open the plan's cited current-state locations and compare them with the live repository.
5. When the plan has a git commit snapshot, inspect changes since that commit for in-scope paths.
6. Stop before source edits if current behavior, interfaces, commands, or assumptions have drifted. The plan must be reconciled first.
7. Mark the plan `IN_PROGRESS` in its status field and index row, when present.

## Execute within scope

- Follow the plan in order. Before every write, confirm the target is an in-scope implementation file or the selected plan/index status artifact.
- Run each step's verification gate and confirm the expected result before continuing.
- Prefer targeted checks during steps; run every final verification and done criterion afterward.
- If a gate fails, make one reasonable in-scope correction. Stop if it still fails, the cause is outside scope, or another attempt would be speculative.
- If required work touches an out-of-scope file or changes an undeclared public API, data shape, migration, security posture, or product behavior, stop instead of improvising.
- Keep changes minimal and traceable to the stated outcome. Never suppress or weaken a check to make it pass.

Before completion, confirm every changed file is in scope or is the selected plan/index status artifact.

## Complete, block, or stop

- `DONE`: every done criterion and verification gate passed. Mark the plan and index `DONE`.
- `BLOCKED`: implementation started, but a stop condition or persistent verification failure prevents completion. Mark the plan and index `BLOCKED` with a concise reason.
- `STOPPED`: preflight stopped before implementation because of dirty overlap, drift, ambiguity, or another safety boundary. Leave implementation and status unchanged.

Always report:

```text
PLAN: <path>
STATUS: DONE | BLOCKED | STOPPED
CHANGES: <files grouped by purpose>
VERIFICATION: <commands or scenarios run, with observed results>
NOTES: <pre-existing changes, deviations, unavailable checks, or stop reason>
```

When git-backed, include the observed final `git status --short`. Do not commit unless explicitly requested.
