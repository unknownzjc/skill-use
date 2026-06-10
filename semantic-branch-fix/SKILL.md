---
name: semantic-branch-fix
description: Given a natural-language task, bug, feature, refactor, or improvement description, create a concise semantic git branch from it, switch to that branch, then start implementing or fixing the described work. Use when the user wants to begin work from a description and expects automatic branch creation before code changes.
metadata:
  version: 1.0.0
---

# Semantic Branch Fix

## Goal

Turn a user's descriptive text into a safe, semantic Git branch, create/switch to it, and then begin the requested implementation or fix.

**Language:** Communicate with the user in Chinese unless they ask otherwise.

## When to use

Use this skill when the user provides a natural-language description and asks to start work, fix a bug, implement a feature, improve code, or otherwise expects a new branch to be created first.

Example triggers:

- `修复用户登录后偶发跳回登录页的问题`
- `创建分支并实现导出用户资料`
- `根据这段描述开一个语义化分支然后开始改`
- `/skill:semantic-branch-fix 支付成功后订单状态没有及时刷新`

Do **not** use this skill for pure discussion, design-only work, code review only, or shipping/PR tasks after the work is already done.

## Core rules

- Create/switch branches **before** editing code.
- Create the new branch from current `HEAD` unless the user explicitly specifies a start point or asks to use the default/base/trunk/mainline branch.
- Before creating the branch, fetch the latest remote refs when the repository has remotes. Fetch only; do not pull, merge, rebase, or change the working tree.
- Do not switch to `main`, `master`, trunk, or base branches just to choose a start point unless the user explicitly asks.
- Do not commit, push, or open PRs unless the user explicitly asks.
- If the working tree has uncommitted changes, stop and ask the user whether to continue, because those changes would follow to the new branch.
- If the user explicitly provides a branch name, validate and preserve it; record that it was explicitly provided. Do not auto-mutate explicit branch names on collision.
- Branch names must be lowercase and use exactly one `/` in the form `<prefix>/<semantic-slug>`.
- Branch names must match this project-level policy regex: `^[a-z0-9]+/[a-z0-9][a-z0-9-]*$`.
- Branch names must also pass Git's own ref validation via `git check-ref-format --branch`.
- Prefer short, readable English branch names, translating non-English descriptions when needed.
- After creating the branch, proceed with the requested implementation/fix using normal coding-agent behavior.

## Branch naming

Infer a branch type from the user's description:

| Intent | Prefix |
| --- | --- |
| Bug/error/regression/修复/报错/异常/问题 | `fix` |
| New capability/新增/实现/支持 | `feature` |
| Refactor/重构/整理内部结构 | `refactor` |
| Tests/测试/补充测试 | `test` |
| Documentation/文档/README | `docs` |
| Build/config/dependency/tooling/CI | `chore` |
| Performance/性能/优化速度 | `perf` |
| UI/visual polish/样式/交互优化 | `ui` |

Generate a slug from the semantic meaning:

- 3-6 words preferred.
- Use kebab-case.
- Remove filler words such as `issue`, `problem`, `bug`, `fix`, `implement` unless necessary for meaning.
- Keep important domain words such as `login`, `session`, `payment`, `order-status`.
- Maximum full branch name length: prefer under 60 characters.

Examples:

- `修复用户登录后偶发跳回登录页的问题` → `fix/login-session-redirect`
- `支付成功后订单状态没有及时刷新` → `fix/order-status-refresh-after-payment`
- `新增用户资料导出功能` → `feature/user-profile-export`
- `重构支付服务里的回调处理逻辑` → `refactor/payment-callback-handling`
- `补充订单取消流程的单元测试` → `test/order-cancellation-flow`

## Branch start point policy

Choose the new branch start point using this priority:

1. **Explicit start point**
   - If the user explicitly specifies a source branch, base branch name, remote branch, tag, commit, or other Git ref, create the new branch from that ref after validation.
   - This includes release fixes, hotfixes, version maintenance, and sub-task branches based on an existing feature branch.
   - Validate the ref before use:

     ```bash
     git rev-parse --verify --quiet '<start-point>^{commit}'
     ```

   - If validation fails, ask one concise clarification question instead of guessing.

2. **Default/base branch concept**
   - If the user asks to use the default branch, base branch, trunk, or mainline but does not provide the exact branch name, try to detect the remote default branch such as `origin/HEAD`:

     ```bash
     git symbolic-ref --quiet --short refs/remotes/origin/HEAD
     ```

   - If detection is ambiguous or unavailable, ask one concise clarification question.

3. **Current HEAD**
   - If the user does not specify any start point, create the new branch from the current `HEAD`.
   - Do not switch to another branch or infer `main`/`master` before branch creation unless the user explicitly requested that start point.
   - Fetching remote refs before branch creation is allowed and required by this skill, but fetching must not change the chosen start point unless the user requested a remote/default/base start point.

## Workflow

### 1. Capture task description

Treat the latest user request as the task description. If the description is too vague to name a branch or implement the task, ask **one** concise clarification question and wait.

### 2. Inspect Git state

Run:

```bash
git rev-parse --is-inside-work-tree
git status --short --branch
git status --porcelain=v1
```

If not inside a Git repository, tell the user and stop.

Use `git status --short --branch` only for human-readable branch/context information.

When deciding whether uncommitted changes exist, look only at:

```bash
git status --porcelain=v1
```

If this command has any output, treat it as staged, unstaged, or untracked changes. Ask the user whether to continue creating the new branch with those changes present. Do not create the branch until the user confirms.

### 3. Fetch latest remote refs

Before creating the branch, update remote refs without changing the working tree.

First check whether the repository has remotes:

```bash
git remote
```

If at least one remote exists, run:

```bash
git fetch --all --prune
```

Rules:

- `git fetch` is required before branch creation when remotes exist.
- Do not run `git pull`, `git merge`, or `git rebase` as part of this step.
- Do not switch branches as part of this step.
- If there are no remotes, skip fetch and continue with local-only refs.
- If fetch fails because of network, authentication, permission, or remote access errors, tell the user and ask whether to continue using existing local refs or stop.

### 4. Determine branch start point

Apply the [Branch start point policy](#branch-start-point-policy) and resolve a concrete start point:

- explicit validated Git ref,
- detected default/base branch ref, or
- current `HEAD`.

Keep the resolved start point for the create/switch command.

### 5. Generate and validate branch name

Create the branch name as:

```text
<prefix>/<semantic-slug>
```

Validate it against the skill naming policy first:

```bash
branch_name='<branch-name>'
printf '%s\n' "$branch_name" | grep -Eq '^[a-z0-9]+/[a-z0-9][a-z0-9-]*$'
```

Then validate it with Git's ref rules:

```bash
git check-ref-format --branch '<branch-name>'
```

The regex check enforces this skill's naming policy, including lowercase-only names and the single-level `<prefix>/<semantic-slug>` shape. `git check-ref-format` is still required because it catches Git-specific invalid ref syntax.

If invalid, simplify the slug and validate again. If the branch name was explicitly provided by the user and fails validation, ask for a corrected branch name instead of silently rewriting it.

### 6. Avoid branch collisions

Check whether the branch already exists locally:

```bash
git show-ref --verify --quiet refs/heads/<branch-name>
```

Check the remote branch only when `origin` exists:

```bash
git remote get-url origin
```

If `origin` exists, check the remote branch:

```bash
git ls-remote --exit-code --heads origin <branch-name>
```

Interpret remote checks carefully:

- If `origin` does not exist, skip remote branch collision checks and rely on local checks.
- If `git ls-remote --exit-code --heads origin <branch-name>` reports that the branch exists, treat it as a collision.
- If `git ls-remote` fails because of network, authentication, permission, or remote access errors, do **not** assume the branch is available. Tell the user the remote check failed and ask whether to continue with local-only validation or choose another branch name.

Resolve collisions based on how the branch name was chosen:

- If the user explicitly provided the branch name and it already exists locally or remotely, ask whether to switch to the existing branch, choose a different branch name, or cancel.
- If the branch name was automatically generated and it already exists locally or remotely, append a short suffix such as `-2`, `-3`, or a date suffix like `-20260610`, then validate again.

### 7. Create and switch

Create and switch to the branch from the resolved start point:

```bash
git switch -c <branch-name> <start-point>
```

If the resolved start point is current `HEAD`, this is also acceptable:

```bash
git switch -c <branch-name>
```

If `git switch` is unavailable, use:

```bash
git checkout -b <branch-name> <start-point>
```

After switching, confirm with:

```bash
git branch --show-current
```

Tell the user the created branch name in Chinese.

### 8. Start implementation/fix if requested

If the user only asked to create/switch the branch and did not ask to implement, fix, refactor, or otherwise change files, stop after branch creation and report the created branch name.

Otherwise, proceed immediately with the requested work:

1. Inspect relevant files using search/read tools.
2. Understand the existing behavior and likely root cause.
3. Make minimal, focused edits.
4. Run relevant tests, linters, type checks, or targeted commands when available.
5. Summarize:
   - branch created,
   - files changed,
   - tests/checks run,
   - any remaining risks or next steps.

## Failure handling

- If branch creation fails due to permissions, invalid repository state, or Git errors, show the exact failure summary and ask how to proceed.
- If the generated branch name is uncertain, present one suggested branch name and ask for confirmation.
- If tests cannot be run, explain why and mention what should be run manually.
