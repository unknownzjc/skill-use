# Execute Mode — current-branch plan execution

Use this reference only for the explicit execution variant: `/improve execute`, `execute <plan>`, or an equivalent user request to execute an existing improve plan.

Unlike the upstream `improve` project, this local skill does **not** use isolated git worktrees. Execution happens directly on the current branch and current working tree.

## Activation boundary

- Execute mode is opt-in only. Planning requests, audit requests, review requests, and backlog requests remain planning-only.
- A user request that merely says "plan and implement" is not execute mode unless it explicitly references executing an existing plan or uses `/improve execute`.
- Execute mode may modify source files, tests, configs, migrations, and docs, but only as allowed by the selected plan's Scope section.
- Never merge, push, rebase, reset, or commit unless the user explicitly asks for that separate git operation.

## Select the plan

1. If the user names a plan path, number, or slug, resolve it to exactly one plan file.
2. If no plan is named, find the next unexecuted plan:
   - Prefer the index in `plans/README.md`, then `handoff-plans/README.md` if that is the active plan directory.
   - Treat `TODO`, `PENDING`, `READY`, empty status, or unchecked status as unexecuted.
   - Skip `DONE`, `COMPLETED`, `MERGED`, `REJECTED`, `SUPERSEDED`, and `BLOCKED`.
   - Respect dependency ordering. A plan is executable only when every dependency listed in the index or the plan status block is done.
   - Choose the lowest-numbered executable plan in the recommended order.
3. If multiple plans tie or no reliable ordering exists, ask one focused question listing the candidates and recommend the lowest-numbered plan.
4. If no unexecuted executable plan exists, report that and suggest `reconcile` or writing a new plan.

## Preflight on the current branch

Before editing any implementation file:

1. Confirm the plan file exists and read it fully.
2. Read `plans/README.md` if present to check status and dependencies.
3. Run `git status --short` when in a git repo.
4. If there are existing uncommitted changes outside the selected plan file/index:
   - If they overlap any in-scope file, stop and ask whether to continue, because direct current-branch execution could overwrite user work.
   - If they are unrelated, record them in the final report and avoid touching them.
5. Run the plan's current-state/drift check by re-opening the cited current-state files and comparing them to the plan.
6. If the current state no longer matches the plan, stop before editing source and either refresh the plan or ask the user whether to reconcile.
7. Mark the selected plan `IN PROGRESS` in the index if an index exists. If there is no index, do not create one solely for execution unless the user asks.

## Execute the plan

- Follow the plan step by step.
- Touch only files listed as in scope. If a required change needs an out-of-scope file, stop and report the STOP condition instead of improvising.
- Run each verification command named by the plan, unless it is unavailable in this environment; if unavailable, record exactly why.
- Prefer targeted verification during the step, then run the plan's full done criteria at the end.
- If a verification fails, make reasonable in-scope fixes and rerun. If the same gate fails twice, stop and report.
- Keep changes minimal and traceable to the plan's intent.

## Complete, block, or stop

At the end:

- If all done criteria pass and scope is clean, mark the plan `DONE` in the index if present.
- If a STOP condition occurs or verification remains failing, mark the plan `BLOCKED` in the index if present and include a concise reason.
- If you stopped before editing source because of drift or dirty overlapping files, leave implementation files unchanged and do not mark `DONE`.

Always produce a final execution report:

```text
PLAN: <path>
STATUS: DONE | BLOCKED | STOPPED
CHANGES: <files changed, grouped by purpose>
VERIFICATION: <commands run and results>
NOTES: <pre-existing dirty files, deviations, skipped checks, or follow-up>
```

If the repo is git-backed, include `git status --short` after execution. Do not commit unless explicitly requested.
