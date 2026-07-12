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

Use Herdr's detected agent metadata first:

```bash
herdr agent get "$HERDR_PANE_ID"
```

Parse `.result.agent.agent` and accept it only when it is exactly `omp`, `codex`, or `pi`.

If metadata is absent or unsupported, inspect the foreground process as a fallback:

```bash
herdr pane process-info --current
```

Inspect every foreground process's name and full `argv`, not only `argv[0]`. A script-installed CLI may appear behind `node`, `bun`, or a shell wrapper. Accept only an explicit CLI basename or a CLI-specific entrypoint path that unambiguously identifies `omp`, `codex`, or `pi`; never infer a CLI from a generic interpreter process.

If metadata and process evidence identify different supported CLIs, or the fallback yields multiple candidates, stop and ask one focused question listing the candidates.

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
- Do not execute an unrecognized process name or entrypoint. If neither detection source identifies one supported CLI, ask one focused question. Never silently fall back to `pi`.

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
