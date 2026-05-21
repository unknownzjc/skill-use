## Full playbook

### Scope

- Complete the full flow: commit, then push, then create or reuse a PR.

### The Process

```dot
digraph process {
    rankdir=TB;

    "Run commit flow" [shape=box];
    "Commit flow blocked by question?" [shape=diamond];
    "Wait for answer and resume commit flow" [shape=box];
    "Commit phase resolved?" [shape=diamond];
    "Commit already complete?" [shape=diamond];
    "Skip to PR flow" [shape=box];
    "Run PR flow" [shape=box];
    "User changes scope after commit?" [shape=diamond];
    "Resume from current state with new scope" [shape=box];

    "Run commit flow" -> "Commit flow blocked by question?";
    "Commit flow blocked by question?" -> "Wait for answer and resume commit flow" [label="yes"];
    "Commit flow blocked by question?" -> "Commit already complete?" [label="no"];
    "Wait for answer and resume commit flow" -> "Commit phase resolved?";
    "Commit phase resolved?" -> "Run PR flow" [label="yes"];
    "Commit already complete?" -> "Skip to PR flow" [label="yes"];
    "Commit already complete?" -> "Run PR flow" [label="no - after commit succeeds"];
    "Skip to PR flow" -> "Run PR flow";
    "Run PR flow" -> "User changes scope after commit?";
    "User changes scope after commit?" -> "Resume from current state with new scope" [label="yes"];
}```

### Steps

1. Run the `commit only` flow from `commit.md`.
2. If commit work is blocked by a question, wait for the answer and resume the commit flow there first.
3. After the staging question is answered and commit succeeds, do not stop and do not output final results yet. Immediately proceed to the PR flow from `pr.md`. The user's file selection is an answer to the commit sub-question, not completion of the full workflow.
4. After commit succeeds without a blocking question, continue with the PR flow from `pr.md`.
5. Do not re-run commit if it is already complete.
6. If the user changes scope after commit, resume from the current state without repeating completed steps.

### Output

- Report the selected mode: `full`.
- Report the commit SHA and message, or that there was nothing to commit.
- Report the final branch name.
- Report whether the branch was renamed.
- Report the push result.
- Report the PR URL.