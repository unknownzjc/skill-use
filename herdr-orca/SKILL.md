---
name: herdr-orca
description: Orchestrate Herdr implementation and multi-model code-review gates from declarative YAML. Use for isolated worktree development, review of existing changes, configurable reviewer dispatch, P1/P2 consolidation, and reviewed finalization.
---

# Herdr Orca

Act as the control plane: interpret the workflow, move it through its lifecycle, and delegate all data-plane work. The implementation agent writes code, runs tests, fixes findings, and creates the final commit; reviewer and summary agents only inspect. The Lead edits no product code.

## Contract

Load `references/herdr-orca.yml`, or a user-supplied full-schema replacement. YAML owns routes, models, native arguments, prompts, selection policy, retry bounds, and cleanup intent. This Skill owns lifecycle, isolation, evidence, ownership, and failure semantics.

Select exactly one route:

- `review-existing`: review the current checkout and return a report without mutation.
- `implement-and-review`: create a worktree, automatically dispatch implementation, review and fix it, commit after PASS, then remove the worktree.

Keep an in-memory run context containing the route, repository, target cwd/base, user request, anchor pane, owned resources, agents, evidence, findings, and round. Never write orchestration state into the target repository.

## Invariants

1. **Explicit identity:** address resources by returned IDs or names, never terminal focus.
2. **Ownership:** mutate or remove only resources created by this run; preserve them on failure.
3. **Isolation:** only the implementation agent may mutate the implementation worktree. Review and summary are read-only.
4. **Evidence:** each review uses a fixed snapshot covering staged, unstaged, and untracked changes.
5. **At-most-once delivery:** send each rendered job prompt once; inspect timeouts or blocked states instead of resending.
6. **Fail closed:** only a verified PASS permits commit and cleanup.
7. **Bounded orchestration:** before first dispatch, perform only required environment, repository, worktree, and agent-start operations.

Target first implementation or review dispatch within 60 seconds. Treat configuration as validated; inspect model catalogs, authentication, CLI help, or business code only after a specific failure. For Herdr failures, consult the installed `herdr` Skill before narrow CLI help.

## Lifecycle

```text
PREPARED -> IMPLEMENTING? -> REVIEWING
REVIEWING -- P1/P2 --> FIXING -> REVIEWING
REVIEWING -- PASS --> FINALIZING? -> COMPLETE
any active state -- unrecoverable failure --> BLOCKED
```

The optional states belong only to `implement-and-review`. `review-existing` completes at the review gate. If `max-review-rounds` is reached without PASS, enter `BLOCKED`, preserve the worktree and other owned resources, and return unresolved findings with manual recovery identifiers.

## Herdr execution semantics

Require `HERDR_ENV=1`. Parse JSON output for identifiers and never change focus. Start each configured agent in an empty pane:

```bash
herdr agent start "$name" --kind "$kind" --pane "$pane_id" -- --model "$model" "${args[@]}"
```

Pass native arguments as an array, without `eval`; omit `--model` when absent. Give every agent a run-unique name.

Render only placeholders present in the YAML (`TARGET_CWD`, `TARGET_BASE`, `USER_REQUEST`, artifacts, tests, reports, and findings). Substitute unavailable optional values with empty text, do not recursively expand content, and send the result as one argument:

```bash
herdr agent prompt "$name" "$prompt" --wait --timeout "$timeout"
```

Read output after completion. On failure, timeout, or `blocked`, inspect once with `herdr agent get` and `herdr agent read`; recover from the concrete cause or enter `BLOCKED`.

## Prepare

For `review-existing`, use the repository root as `TARGET_CWD`. Resolve `TARGET_BASE` from the request or repository context; ask if it remains ambiguous. If the base has no staged, unstaged, or untracked changes, return PASS without agents.

For `implement-and-review`, derive a unique branch and create its Herdr worktree workspace with `--repo`, `--branch`, `--base`, `--label`, and `--no-focus`. Parse the worktree path, workspace ID, and root pane ID. Start the implementation agent there and dispatch `jobs.implement.prompts.run`. It may edit and test, but not commit, merge, rebase, push, or clean up until finalization.

## Review gate

Create a private temporary directory outside the repository. Capture status and a standard text diff from `TARGET_BASE`. Enumerate untracked files with `git ls-files --others --exclude-standard -z` and append standard `git diff --no-index` output without `--binary`, treating exit code `1` as a normal difference; binary files contribute paths and status, not payloads. Record an evidence fingerprint before review.

Select one reviewer only when every `single-reviewer` condition passes; otherwise use the full matrix. Match risk terms at identifier boundaries in the request, changed paths, and added lines, not as arbitrary substrings inside identifiers.

Create panes with explicit geometry: one reviewer `right`; reviewer A `right` plus reviewer B `down` from A; summary `down` from the anchor only when two reports need synthesis. Start all selected reviewers before concurrently dispatching their separately rendered `jobs.review.prompt`.

Label each report with its reviewer name. Recompute the target fingerprint after review; if it changed, discard reports and enter `BLOCKED` because the evidence moved.

One report directly determines the gate. For two reports, dispatch `jobs.summary.prompt` and use its result. Retain only supported P1/P2 findings with severity, file:line, evidence, impact, required fix, and `owners`. Merge equivalent root causes and union their owners; discard style-only, P3, and unsupported claims.

Return the gate immediately for `review-existing` without changing files or Git state.

## Fix loop

For `implement-and-review`, send validated findings through `jobs.implement.prompts.fix` to the existing implementation agent, then regenerate evidence.

Recheck each finding only with its recorded owners, reusing their sessions. Compare the regenerated evidence with the prior round; use normal full-review selection if it reveals newly modified files, new risk-term matches, or an unavailable owner. A reviewer with no retained finding does not recheck. Reuse `jobs.review.prompt`; a non-empty `FINDINGS` value defines targeted scope, so no separate recheck route or prompt exists.

## Finalize

After PASS, send `jobs.finalize.prompt` to the implementation agent. Verify its commit SHA, intended committed changes, and clean worktree. Accept an already-clean committed HEAD; never create an empty commit.

Remove only the exact owned Herdr worktree workspace, keep the feature branch, leave remotes unchanged, and delete only the run's evidence directory. On verification or cleanup failure, preserve remaining resources and report their identifiers and recovery command.

Return the route, target/base, agents and models, gate result, implementation test result, validated findings and owners, round count, commit SHA when applicable, and cleanup status. Include orchestration logs only when needed to explain a failure.
