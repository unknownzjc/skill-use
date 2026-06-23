## Commit playbook

### Scope

- Create a commit only.
- Do not push.
- Do not create a PR.

### The Process

```dot
digraph process {
    rankdir=TB;

    "Inspect staged and unstaged changes" [shape=box];
    "Anything to commit?" [shape=diamond];
    "Report nothing to commit" [shape=box];
    "Staged changes already exist?" [shape=diamond];
    "Commit staged changes" [shape=box];
    "Ask one clarifying question about staging" [shape=box];
    "Stage all safe files" [shape=box];
    "Stage only chosen files" [shape=box];
    "Inspect exact diff" [shape=box];
    "Write conventional commit" [shape=box];

    "Inspect staged and unstaged changes" -> "Anything to commit?";
    "Anything to commit?" -> "Report nothing to commit" [label="no"];
    "Anything to commit?" -> "Staged changes already exist?" [label="yes"];
    "Staged changes already exist?" -> "Commit staged changes" [label="yes"];
    "Staged changes already exist?" -> "Ask one clarifying question about staging" [label="no"];
    "Ask one clarifying question about staging" -> "Stage all safe files" [label="stage all safe changed files"];
    "Ask one clarifying question about staging" -> "Stage only chosen files" [label="stage only specific files"];
    "Commit staged changes" -> "Inspect exact diff";
    "Stage all safe files" -> "Inspect exact diff";
    "Stage only chosen files" -> "Inspect exact diff";
    "Inspect exact diff" -> "Write conventional commit";
}```

### Steps

1. Inspect staged and unstaged changes separately.
2. If nothing is staged or unstaged, report that there is nothing to commit.
3. If staged changes exist, commit only the staged changes.
4. If no staged changes exist but unstaged changes exist, ask one clarifying question:
   - `Stage all safe changed files`
   - `Stage only specific files`
   - `Do not create a commit`
5. Never stage `.env`, `.env.*`, private keys, tokens, credential files, or other obvious secrets.
6. If the user chooses specific files, ask for explicit file paths and stage only those paths.
7. Run `git diff --staged` to inspect the exact staged diff before committing. Do not use plain `git diff` for this check, and do not treat `git diff --staged --stat` as a substitute for the exact diff.
8. Do not edit files to clean up the staged diff during shipping. If the exact staged diff contains suspicious, accidental, dead, or unrelated code, ask one clarifying question about whether to continue as-is, stop for the user to fix it, or explicitly allow the assistant to fix it.
9. Write a commit message following these rules:
   - Format: `<type>: <description>`
   - Allowed types: `fix`, `feat`, `build`, `chore`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`
   - Use English for the description
   - Use imperative mood (e.g., "add feature" not "added feature")
   - Do not exceed 72 characters
   - Do not capitalize the first letter of the description
   - Do not end with a period
10. Never use emoji in commit messages.
11. Do not add co-author metadata such as `Co-authored-by:` trailers.

### Output

- If this playbook was invoked as part of the `full` flow, suppress this output report and return control to `full.md` immediately after commit succeeds.
- Report the selected mode: `commit only`.
- Report the commit SHA and message, or that there was nothing to commit.