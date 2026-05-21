## PR playbook

### Scope

- Create or reuse a PR from existing commits.
- Do not create a commit.
- Ignore uncommitted local changes unless they block the requested PR work.

### The Process

```dot
digraph process {
    rankdir=TB;

    "Resolve base branch, fetch it, and check gh auth" [shape=box];
    "Commits ahead of origin/<base>?" [shape=diamond];
    "Report nothing to open a PR for" [shape=box];
    "Derive ideal branch name" [shape=box];
    "Rename branch before push?" [shape=diamond];
    "Rename branch" [shape=box];
    "Keep current branch name" [shape=box];
    "Push final branch" [shape=box];
    "Push blocked?" [shape=diamond];
    "Ask one clarifying question" [shape=box];
    "Open PR for branch already exists?" [shape=diamond];
    "Return existing PR URL" [shape=box];
    "Discover PR template" [shape=box];
    "Need template clarification?" [shape=diamond];
    "Ask one clarifying question about template choice" [shape=box];
    "Draft PR body from template" [shape=box];
    "Create PR against base branch" [shape=box];

    "Resolve base branch, fetch it, and check gh auth" -> "Commits ahead of origin/<base>?";
    "Commits ahead of origin/<base>?" -> "Report nothing to open a PR for" [label="no"];
    "Commits ahead of origin/<base>?" -> "Derive ideal branch name" [label="yes"];
    "Derive ideal branch name" -> "Rename branch before push?";
    "Rename branch before push?" -> "Rename branch" [label="yes"];
    "Rename branch before push?" -> "Keep current branch name" [label="no"];
    "Rename branch" -> "Push final branch";
    "Keep current branch name" -> "Push final branch";
    "Push final branch" -> "Push blocked?";
    "Push blocked?" -> "Ask one clarifying question" [label="yes"];
    "Push blocked?" -> "Open PR for branch already exists?" [label="no"];
    "Open PR for branch already exists?" -> "Return existing PR URL" [label="yes"];
    "Open PR for branch already exists?" -> "Discover PR template" [label="no"];
    "Discover PR template" -> "Need template clarification?";
    "Need template clarification?" -> "Ask one clarifying question about template choice" [label="yes"];
    "Need template clarification?" -> "Draft PR body from template" [label="no"];
    "Draft PR body from template" -> "Create PR against base branch";
}```

### Steps

1. Resolve the target base branch from existing PR metadata, the upstream default branch, or repo instructions.
2. Run `git fetch origin <base>`.
3. Run `gh auth status`. If auth is missing, ask the user to authenticate, then continue.
4. Run `git log origin/<base>..HEAD --oneline`.
5. If `origin/<current-branch>` exists, also run `git log origin/<current-branch>..HEAD --oneline` and `git diff --stat origin/<current-branch>..HEAD` to see what is not pushed yet.
6. If there are no commits ahead of `origin/<base>`, stop and tell the user there is nothing to open a PR for.
7. Derive an ideal branch name from the commits in `origin/<base>..HEAD`.
8. Explicitly decide whether the branch should be renamed before push. Do not skip this decision.
9. Rename only if the current branch name is generic or misleading, such as `test-*`, `tmp-*`, `dev-*`, or `misc-*`.
10. Skip renaming only if the current branch name already matches the commits and accurately describes the PR.
11. If the user explicitly asks to rename, perform the rename even when it would otherwise be optional.
12. If the user asks to rename without a target name, derive one from the commits and use it.
13. If the branch already exists on `origin`, do not rename automatically unless the user asks. Ask before deleting the old remote branch.
14. Only after the rename decision is complete, push with tracking using the final branch name.
15. If the branch is already up to date on remote, continue.
16. If push fails because the remote branch was renamed or diverged, explain why and ask one clarifying question.
17. Check whether an open PR for the current branch against `<base>` already exists. If one exists, return its URL instead of creating a duplicate.
18. Use `origin/<base>..HEAD` as the source of truth for PR scope. Use `origin/<current-branch>..HEAD` only to understand what still needs to be pushed.
19. Run `git diff --stat origin/<base>..HEAD`.
20. Discover the project PR template before drafting the PR body.
21. Check these locations in order: `.github/pull_request_template.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `docs/pull_request_template.md`, `docs/PULL_REQUEST_TEMPLATE.md`, `PULL_REQUEST_TEMPLATE.md`, `pull_request_template.md`, then `.github/pull_request_template/*.md`.
22. Read the matched template file before writing the PR body.
23. If multiple template files exist and the correct one is not obvious, ask one clarifying question about template choice.
24. If no template exists, continue with a minimal PR body, but only after confirming that no project template was found.
25. Fill in the PR template:
    - Set `Closes #` only if the user provided an issue number or the branch or commits clearly reference one.
    - Check exactly one matching `Type of change` checkbox.
    - Write `What does this PR do?` in concise Chinese with concrete changes.
    - Set `How did you verify your code works?` to `本地验证功能正常`, unless the user provided more specific verification details.
    - Mark the checklist truthfully.
    - If this is a UI change and screenshots are unavailable, say so explicitly.
26. Preserve the template structure and headings. Fill the template; do not replace it with an ad-hoc PR body.
27. Create the PR against `<base>` with `gh pr create`.
28. Return the PR URL.

### Output

- Report the selected mode: `PR only`.
- Report the target base branch.
- Report the final branch name.
- Report whether the branch was renamed.
- Report the rename decision and reason.
- Report the push result.
- Report the PR URL.