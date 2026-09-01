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

## Agent Configuration

Use the following agents for the inner loop:

```yaml
goal_agent:
  kind: pi
  model: kimi-coding/k3

peer_agent:
  kind: pi
  model: glm-5.3
```

`kind` identifies the agent/runtime supported by Herdr.

`model` identifies the model used by that agent. For the configured `pi`
runtime, pass it after Herdr's `--` separator as `--model <model>`.

Do not hard-code model behavior into the role definitions. Model assignment
belongs here.

## Roles

Before starting a Goal Agent, read
[references/goal-agent.md](references/goal-agent.md) and resolve its absolute
path. Load it into the new process with Pi's `--append-system-prompt` option;
reading the role in the Outer Loop is not a substitute for giving it to the
Goal Agent.

Before delegating peer creation, read
[references/peer-agent.md](references/peer-agent.md) and resolve its absolute
path. Give that path and the configured `peer_agent` values to the Goal Agent
in the Peer Runtime portion of its Goal Package.

The role reference defines behavior. The Agent Configuration defines which
model performs that role.

## Herdr Lifecycle

Default to a sibling pane in the current tab and the requested repository or
working directory. Preserve the user's focus. Parse pane and agent identifiers
from Herdr's JSON responses rather than predicting them.

For the configured Goal Agent, the startup shape is:

```bash
herdr pane split --current --direction right --cwd <working-directory> --no-focus
herdr agent start <goal-name> --kind pi --pane <pane-id> -- \
  --model kimi-coding/k3 \
  --append-system-prompt <absolute-goal-role-path>
```

Choose the split direction from the current layout as directed by the `herdr`
skill. After the agent becomes ready, send the Goal Package with
`herdr agent prompt <goal-name> <package> --wait`.

`prompt --wait` and `agent wait` report lifecycle state, not the semantic
`READY_FOR_OUTER_REVIEW` marker. After the agent settles:

1. inspect it with `herdr agent get`,
2. read its response with `herdr agent read --source recent-unwrapped`,
3. review only after the response contains `READY_FOR_OUTER_REVIEW`.

If the agent is `blocked`, inspect the UI and preserve approval and authority
boundaries before sending input. If alternate-screen history truncates the
handoff, use the `herdr` skill's file-output fallback.

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

Its main responsibilities are:

- delegation,
- review,
- acceptance,
- rejection.

The Outer Loop has final authority over whether the goal is complete.

## Goal Package

When starting the Goal Agent, provide a concise package containing:

- Goal
- Acceptance Criteria
- Constraints
- Relevant Context
- Repository or working directory
- Peer Runtime:
  - the configured `peer_agent` kind and model,
  - the absolute path to `references/peer-agent.md`,
  - the instruction to load that role with `--append-system-prompt` when
    starting a Peer Agent.

Do not send unnecessary conversation history. Preserve the user's original
intent.

## Inner Loop

Start the Goal Agent using the configured `goal_agent`.

The Goal Agent owns execution of the task. It may:

- inspect the repository,
- plan,
- implement,
- test,
- fix failures,
- create Peer Agents,
- integrate useful Peer results.

The Goal Agent should continue working autonomously until it believes the
goal is ready for external review.

When ready, it reports:

`READY_FOR_OUTER_REVIEW`

The Goal Agent's readiness is not final acceptance.

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

Start Peer Agents using the configured `peer_agent`.

Prefer focused assignments over delegating the entire goal.

The Goal Agent starts each Peer in a separate Herdr pane, loads the supplied
Peer role at process startup, prompts it with a bounded assignment, waits for a
settled state, and reads the result. Peer use is optional, but the Peer Runtime
must always be included in the Goal Package so the Goal Agent can make that
choice without rediscovering configuration.

## Outer Review

When the Goal Agent reports `READY_FOR_OUTER_REVIEW`, independently inspect
the result.

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

## Loop

The normal lifecycle is:

```text
Outer Loop
    |
    | delegate goal
    v
Goal Agent
    |
    | plan / implement / test / fix
    |
    +---- Peer Agent
    |
    +---- Peer Agent
    |
    v
READY_FOR_OUTER_REVIEW
    |
    v
Outer Loop
    |
    +---- PASS ----> Done
    |
    +---- REJECT
            |
            v
        Goal Agent
```

Repeat review and revision until:

- the Outer Loop returns PASS, or
- the task is genuinely blocked.

A genuine blocker requires missing user authority or input, an unavailable
external dependency, or exhaustion of safe in-scope approaches with evidence.
Do not repeat an unchanged revision cycle without a new actionable hypothesis.

## Principles

Keep the system simple.

The Outer Loop judges. The Goal Agent executes. Peer Agents assist.

Herdr provides runtime and communication.

Do not introduce additional agent roles unless there is a demonstrated need.
