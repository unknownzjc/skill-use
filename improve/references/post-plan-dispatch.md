# Post-plan Dispatch

Use this reference only after planning mode has written concrete executable plan artifact(s) and the user explicitly selected `Execute in new herdr tab` from the post-plan `ask_user` decision.

This is a dispatcher workflow. The current pane must not edit implementation files.

## Preconditions

All must be true before dispatching:

- A concrete single-plan path exists, or a backlog/index exists that execute mode can use to select the next executable plan.
- The user explicitly selected `Execute in new herdr tab` after seeing the plan summary.
- You are still in planning mode in the current pane.
- You will start a separate pi executor; you will not execute the plan yourself in this pane.

## Required herdr skill handoff

Before running herdr commands, load and follow the `herdr` skill instructions. Treat that skill as the source of truth for current herdr behavior, command syntax, environment checks, and output interpretation.

Important: do **not** assume herdr JSON structure details are stable. Do not hardcode field paths or infer workspace/tab/pane relationships from id shapes unless the current herdr skill and live command output support that interpretation. Inspect live herdr output first, parse only fields that are actually present, and stop if the output shape does not expose the information needed to dispatch safely.

## Environment check

Follow the `herdr` skill's first rule: check whether this session is inside herdr.

```bash
test "${HERDR_ENV:-}" = "1"
```

If this fails, report:

- the plan path or backlog index is ready;
- this pane is not running inside herdr;
- the user can manually run `pi "/skill:improve execute <plan-path>"` for a single plan, or `pi "/skill:improve execute"` for a backlog/index, from the repo root.

Then stop. Do not try to control herdr from outside herdr.

## Inspect live herdr state

Use herdr directly, following the loaded `herdr` skill.

Start by inspecting the current state rather than guessing ids or JSON paths:

```bash
herdr pane list
herdr workspace list
```

From the live output, identify:

- the focused/current pane;
- the workspace that owns the current pane;
- a safe workspace id to pass to `herdr tab create`.

If the current workspace cannot be identified confidently from the live output and the herdr skill's documented behavior, stop and report that dispatch is blocked because the current workspace could not be determined safely.

## Create a new executor tab

Create a new tab in the current workspace without moving focus away from the planner pane. Prefer a short label derived from the plan filename, such as `execute: 001-short-slug`.

Use `--no-focus` so the planner can finish reporting the dispatch result before the user chooses whether to switch to the executor tab.

Example shape only; adapt parsing to the actual live output and current herdr skill documentation:

```bash
herdr tab create --workspace "<workspace-id>" --label "execute: <plan-slug>" --no-focus
```

Read the command output and extract the new root pane id from fields that are actually present. Do not assume a fixed JSON path if the live output differs from the herdr skill documentation. If the new pane id cannot be identified confidently, stop and report the created tab output instead of continuing blindly.

## Choose the execute prompt

Choose the prompt for the new pi executor based on what planning produced:

- Single executable plan: `/skill:improve execute <plan-path>`
- Backlog or multiple plans with an index: `/skill:improve execute`

For backlog/multiple-plan output, prefer omitting the plan argument so `execute-mode.md` can select the next executable plan from the index and respect dependency ordering.

## Start pi executor

Run a standalone pi execution command in the new pane from the repo root. The command must not rely on prior chat context.

Do not hand-concatenate shell strings. Generate shell-safe quoting for both the repo root and the full pi prompt using a robust mechanism such as Python `shlex.quote` or shell `printf %q`, then pass the resulting command to `herdr pane run`.

Example shape only; adapt paths, prompt, and quoting to the live situation:

```bash
EXEC_PROMPT="/skill:improve execute <plan-path>"  # or: /skill:improve execute
RUN_CMD=$(python3 -c 'import shlex,sys; print("cd " + shlex.quote(sys.argv[1]) + " && pi " + shlex.quote(sys.argv[2]))' "<repo-root>" "$EXEC_PROMPT")
herdr pane run "<new-pane-id>" "$RUN_CMD"
```

This avoids breakage when paths or prompts contain spaces, quotes, `$`, backticks, backslashes, or other shell metacharacters.

## Report and stop

After dispatching, report:

- the dispatched plan path, or the backlog/index used for next-plan selection;
- the workspace/tab/pane information you identified from live herdr output;
- the command dispatched, with sensitive values omitted if any;
- that execution is happening in the separate herdr-managed pi session.

Then stop. Do not monitor or implement unless the user asks for a separate coordination task.
