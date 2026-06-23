## PR playbook

### Scope

- Create or reuse a PR from existing commits.
- Do not create a commit.
- Ignore uncommitted local changes unless they block the requested PR work.

### The Process

```dot
digraph process {
    rankdir=TB;

    "Run PR preflight block" [shape=box];
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

    "Run PR preflight block" -> "Commits ahead of origin/<base>?";
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
2. Run one PR preflight shell block that performs these checks in order and prints fixed fields or JSON:
   - current branch and resolved base branch
   - `gh auth status`
   - `git fetch origin <base>` before any ahead-count or PR-scope calculation
   - commits in `origin/<base>..HEAD`
   - diff stat in `origin/<base>..HEAD`
   - whether `origin/<current-branch>` exists
   - if the remote branch exists, commits and diff stat in `origin/<current-branch>..HEAD`
   - whether an open PR already exists for `<current-branch>` against `<base>`
   - PR template candidates
3. Treat `origin/<base>..HEAD` after `git fetch origin <base>` as the only PR-scope source of truth. Do not use local `<base>..HEAD` for ahead counts, diff stats, rename decisions, or PR body scope.
4. Do not split the preflight into repeated exploratory commands unless state changes after a rename, push, or user answer.
5. Classify preflight failures once:
   - Auth/token failures: stop and ask the user to authenticate.
   - Missing or invalid base branch: ask one clarifying question.
   - Network/TLS/EOF/RPC/timeout failures: stop with the failing command and concise error context.
   - No PR template found: continue without treating it as an error.
6. If there are no commits ahead of `origin/<base>`, stop and tell the user there is nothing to open a PR for.
7. Derive an ideal branch name from the commits in `origin/<base>..HEAD`.
8. Explicitly decide whether the branch should be renamed before push. Do not skip this decision.
9. Rename only if the current branch name is generic or misleading, such as `test-*`, `tmp-*`, `dev-*`, or `misc-*`.
10. Skip renaming only if the current branch name already matches the commits and accurately describes the PR.
11. If the user explicitly asks to rename, perform the rename even when it would otherwise be optional.
12. If the user asks to rename without a target name, derive one from the commits and use it.
13. If the branch already exists on `origin`, do not rename automatically unless the user asks. Ask before deleting the old remote branch.
14. Only after the rename decision is complete, push with tracking using the final branch name.
15. If `git push` fails, stop immediately for auth, permission, non-fast-forward, branch protection, or network failures and report the concise error context.
16. If the branch is already up to date on remote, continue.
17. If push fails because the remote branch was renamed or diverged, explain why and ask one clarifying question.
18. Use the preflight open-PR result when possible. If an open PR for the current branch against `<base>` already exists, return its URL instead of creating a duplicate.
19. If a rename or push changes the branch state, run only the minimal PR lookup needed to refresh the existing-PR result.
20. Use `origin/<base>..HEAD` as the source of truth for PR scope. Use `origin/<current-branch>..HEAD` only to understand what still needs to be pushed.
21. Do not re-run `git diff --stat origin/<base>..HEAD` if the preflight already captured it.
22. Discover the project PR template before drafting the PR body.
23. Check these locations in order: `.github/pull_request_template.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `docs/pull_request_template.md`, `docs/PULL_REQUEST_TEMPLATE.md`, `PULL_REQUEST_TEMPLATE.md`, `pull_request_template.md`, then `.github/pull_request_template/*.md`.
24. Make template discovery non-fatal: use `|| true` or equivalent for file/template probes so missing templates do not produce command failures.
25. Read the matched template file before writing the PR body.
26. If multiple template files exist and the correct one is not obvious, ask one clarifying question about template choice.
27. If no template exists, continue with a minimal PR body, but only after confirming that no project template was found.
28. Fill in the PR template:
    - Set `Closes #` only if the user provided an issue number or the branch or commits clearly reference one.
    - Check exactly one matching `Type of change` checkbox.
    - Write `What does this PR do?` in concise Chinese with concrete changes.
    - Set `How did you verify your code works?` to `本地验证功能正常`, unless the user provided more specific verification details.
    - Mark the checklist truthfully.
    - If this is a UI change and screenshots are unavailable, say so explicitly.
29. Preserve the template structure and headings. Fill the template; do not replace it with an ad-hoc PR body.
30. For a minimal PR body with no template, use the fetched PR-scope commits, diff stat, commit message, changeset content, and already-inspected staged diff first. Read extra source diffs only when those fields are insufficient to explain the change accurately.
31. Create the PR against `<base>` with `gh pr create`.
32. If `gh pr create`, `gh pr edit`, `gh pr list`, or equivalent `gh api` calls fail, stop immediately for auth/token or network failures and report the concise error context.
33. Return the PR URL.

### Output

- Report the selected mode: `PR only`.
- Report the target base branch.
- Report the final branch name.
- Report whether the branch was renamed.
- Report the rename decision and reason.
- Report the push result.
- Report the PR URL.