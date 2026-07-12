# Herdr Dispatch

Use this integration only after a plan is complete and audited and the user explicitly asks to dispatch its execution through Herdr. Dispatch is an execution launch method, not permission to bypass Improve's execute boundary.

The execution agent must use the same CLI family as the planning session. Never default to `pi` merely because it is installed.

## Preconditions

Before dispatch:

1. Confirm the user explicitly requested Herdr dispatch for one existing plan.
2. Confirm the plan passed `references/plan-audit.md` and is executable under `references/execute.md`.
3. Confirm the session is inside Herdr using `HERDR_ENV`, `HERDR_PANE_ID`, `HERDR_TAB_ID`, and `HERDR_WORKSPACE_ID`.
4. Resolve the repository root and plan path. Launch from the repository root, not from `HERDR_STARTUP_CWD` unless they are the same directory.
5. Confirm `herdr` is available. Stop and report if any prerequisite is missing.

## Detect the planning CLI

Run:

```bash
herdr pane process-info --current
```

Parse the JSON result and inspect the current pane's foreground process `argv[0]` and process name. Match the executable basename against this adapter table:

| Detected planning CLI | Execution CLI | Interactive invocation |
|---|---|---|
| `omp` | `omp` | `omp "<prompt>"` |
| `codex` | `codex` | `codex "<prompt>"` |
| `pi` | `pi` | `pi "<prompt>"` |

Rules:

- Preserve the detected CLI family: `omp` launches `omp`, `codex` launches `codex`, and `pi` launches `pi`.
- Use the base interactive command with one initial prompt. Do not use `omp --print`, `codex exec`, or `pi --print`; Herdr should own an interactive agent pane.
- Resolve the selected executable with `command -v`. Stop if that executable is unavailable in the dispatch environment.
- Do not copy arbitrary process arguments from the planning session. They may contain session selectors, prompts, or unsafe flags.
- Do not execute an unrecognized process name. If no supported CLI is detected, or more than one supported foreground CLI is plausible, ask one focused question listing the detected candidates. Never silently fall back to `pi`.

## Start the execution agent

Build a portable initial prompt that names the reviewed plan without depending on CLI-specific slash commands:

```text
Use the improve skill's Execute action to execute the existing plan at <repo-relative-plan-path>. Read the plan fully, obey its scope, verification gates, done criteria, and stop conditions, and report the observed results. Do not commit or push.
```

Use a deterministic agent name such as `execute-<plan-slug>`. Check for an existing agent with that name before launching. If it is already executing the same plan, focus or report it instead of starting a duplicate; otherwise add a short unique suffix.

Launch in the current Herdr tab, beside the planning session:

```bash
herdr agent start "$AGENT_NAME" \
  --cwd "$REPO_ROOT" \
  --tab "$HERDR_TAB_ID" \
  --split right \
  --focus \
  -- "$CLI_PATH" "$PROMPT"
```

Pass arguments after `--` as separate quoted argv values. Never construct this command with `eval`, interpolate repository text as shell syntax, or forward credential-bearing environment variables.

## Verify and report

After launch:

1. Run `herdr agent get "$AGENT_NAME"` and confirm the agent exists in the expected tab and working directory.
2. Report the plan path, detected planning CLI, launched executable, and Herdr agent name.
3. Do not mark the plan `IN_PROGRESS`; the execution agent does that after its own dirty-worktree and drift preflight.
4. Do not wait for completion or send follow-up instructions unless the user explicitly asks.
