---
name: ship
description: "Selects and runs the correct shipping playbook—`commit only`, `PR only`, or `full`—while preserving in-session state."
when_to_use: "ship it, 提交, 提交一下, 保存改动, commit, commit only, 发 PR, 创建 PR, open PR, pull request, push, 推送, 提交并发 PR, 提交并创建 PR, commit and PR"
dispatch_intent: "Commit local changes, push existing commits, open a PR, complete commit-to-PR shipping flow, resume blocked shipping flow"
disable-model-invocation: true
metadata:
  version: 1.0.0
---

## Role

- This skill is a router for feature-branch shipping.
- Recover context first, infer one mode, and read only the matching playbook.
- Resume an in-flight shipping flow from current state unless the user explicitly changes scope.

## When to use

````dot
digraph when_to_use {
    "Need to submit work from the current branch?" [shape=diamond];
    "On a feature branch targeting the base branch?" [shape=diamond];
    "Which shipping outcome is needed?" [shape=diamond];
    "ship: commit only" [shape=box];
    "ship: PR only" [shape=box];
    "ship: full" [shape=box];
    "Do not use ship" [shape=box];

    "Need to submit work from the current branch?" -> "On a feature branch targeting the base branch?" [label="yes"];
    "Need to submit work from the current branch?" -> "Do not use ship" [label="no"];
    "On a feature branch targeting the base branch?" -> "Which shipping outcome is needed?" [label="yes"];
    "On a feature branch targeting the base branch?" -> "Do not use ship" [label="no - switch branches first"];
    "Which shipping outcome is needed?" -> "ship: commit only" [label="save local changes only"];
    "Which shipping outcome is needed?" -> "ship: PR only" [label="push/open PR from existing commits"];
    "Which shipping outcome is needed?" -> "ship: full" [label="commit, push, and open PR"];
}```

- Use this skill for shipping work that already exists on the current feature branch.
- The branch should target the repository's base branch. Resolve it from existing PR metadata, the upstream default branch, or repo instructions.
- If you are on the base branch or a protected trunk branch such as `main`, `master`, or a configured release branch, stop and tell the user to switch first.
- If the latest exchange is already inside a blocked shipping flow, resume that flow instead of starting over.
- Do not use this skill for implementation, debugging, or code-review requests that are not about committing, pushing, renaming the branch, or opening a PR.

## The Process

```dot
digraph process {
    rankdir=TB;

    "Read latest exchange and current git state" [shape=box];
    "Blocked shipping flow?" [shape=diamond];
    "Resume from blocked step" [shape=box];
    "Infer one mode" [shape=box];
    "On base or protected trunk branch?" [shape=diamond];
    "Stop and tell user to switch branches" [shape=box];
    "Selected mode?" [shape=diamond];
    "Read commit.md" [shape=box];
    "Read pr.md" [shape=box];
    "Read full.md" [shape=box];
    "Need one clarifying question?" [shape=diamond];
    "Ask one clarifying question and wait" [shape=box];
    "Run remaining steps" [shape=box];

    "Read latest exchange and current git state" -> "Blocked shipping flow?";
    "Blocked shipping flow?" -> "Resume from blocked step" [label="yes"];
    "Blocked shipping flow?" -> "Infer one mode" [label="no"];
    "Resume from blocked step" -> "On base or protected trunk branch?";
    "Infer one mode" -> "On base or protected trunk branch?";
    "On base or protected trunk branch?" -> "Stop and tell user to switch branches" [label="yes"];
    "On base or protected trunk branch?" -> "Selected mode?" [label="no"];
    "Selected mode?" -> "Read commit.md" [label="commit only"];
    "Selected mode?" -> "Read pr.md" [label="PR only"];
    "Selected mode?" -> "Read full.md" [label="full"];
    "Read commit.md" -> "Need one clarifying question?";
    "Read pr.md" -> "Need one clarifying question?";
    "Read full.md" -> "Need one clarifying question?";
    "Need one clarifying question?" -> "Ask one clarifying question and wait" [label="yes"];
    "Need one clarifying question?" -> "Run remaining steps" [label="no"];
}```

## Core rules

- Resolve intent in this order:
  1. Pending question in the latest exchange
  2. Explicit user intent in the new reply
  3. Current repo state
  4. One clarifying question only if still ambiguous
- Complete all non-blocked steps in one run.
- Never operate directly on the base branch or protected trunk branches such as `main`, `master`, or configured release branches.
- Do not expand scope. `commit only` must not create a PR. `PR only` must not create a commit.
- In `full` mode, completing the commit phase, including after a blocking staging question, does not end the session. Proceed directly to the PR flow without asking for permission to continue.
- In `PR only` and `full`, explicitly evaluate branch rename before push; do not skip that decision.
- Reuse existing state when possible.

## Mode inference

- If the last assistant turn asked a shipping or staging question, treat the next user reply as the answer and resume from the blocked step. If the active mode is `full` and the blocked commit step resolves, immediately run the PR flow.
- Prefer explicit intent:
  - `commit only` for requests that only save local changes.
  - `PR only` for requests that only push or open a PR from existing commits.
  - `full` for `ship it`, `发PR`, `提交并发PR`, `提交并创建PR`, or any request to both submit changes and open a PR.
- If intent is implicit:
  - Local changes present and request implies submission: choose `full`.
  - No local changes, but commits exist ahead of the upstream base branch, such as `origin/<base>`: choose `PR only`.
  - Local changes present and request focuses on saving work, without PR language: choose `commit only`.
- If the user says `更名`, `推送`, `发 PR`, or `继续` after a blocked step, resume from that step instead of restarting inference.
- If the user explicitly changes scope, switch mode from the current state without repeating completed steps.

## Dispatch

- For `commit only`, read `commit.md` and run only that playbook.
- For `PR only`, read `pr.md` and run only that playbook.
- For `full`, read `full.md` and run only that playbook.
- Do not read the other playbooks unless the user explicitly changes scope.
````
