# One Shot Runtime

Select the transport before dispatch; honor the user's runtime/model choices and
otherwise use configured defaults. Do not implicitly install a runtime or create
user-visible sidebar tasks. Roles and file ownership are shared across transports.
Supply each role in the child's actual assignment or documented native role-loading
option; reading it only in Coordinator does not inject it into the child.

## Native child agents

When native child-agent tools are available and the user did not select Herdr,
use them. Inspect their actual schema; do not invent tool names or arguments.
Spawn Designer with its role and package; reuse the returned ID for follow-up turns.
Reviewer must receive a fresh context without Coordinator's deliberation transcript.

Use the tool's wait/notification mechanism for settled results. For an idle Designer,
use a follow-up operation that starts a turn; a message-only operation may not wake it.
Start a fresh Reviewer for each submitted version, with prior findings on re-review.
At most one Designer and one Reviewer are active children. Designer is idle during
review. Record returned IDs and session states in `task.md` at handoffs.

## Herdr

Use this route when the user selected Herdr for this workflow. First read the
available Herdr skill and require `HERDR_ENV=1`. If outside a managed pane, don't
inspect or control its focused session. Preserve the package and report the runtime
requirement; use another route only if consistent with the user's runtime choice.

Follow the Herdr skill for installed CLI discovery, layout, startup, blocking and
cleanup. Use sibling panes in the current tab/cwd with `--no-focus`, parsed IDs and
unique run-prefixed names; no new workspace, tab or worktree unless requested.

Prepare the assignment before opening a pane. Use the requested supported kind or
a known configured default; report missing runtime choices rather than guessing.
For OMP, use a persistent interactive session, not print/RPC mode, with flags verified
from installed help.

Prompt immediately after startup readiness. Use one outstanding lifecycle wait per
agent. After settlement, read once and classify the semantic handoff. `idle` or
`done` is not proof of a proposal or a review verdict. An actual approval UI must
be handled under the Herdr skill's rules, not auto-answered as a proxy design choice.
If a result is truncated, use Herdr's documented file-output fallback in the run
directory and retain the complete review evidence in `task.md`.

## Human document display

Before requesting human review, verify that the proposal exists and matches the
version being handed over. Prefer the host's rendered Markdown/document preview.
In Codex, when available, call `open_in_codex` with a file target and the proposal's
absolute path, in the current task. Use the actual exposed tool schema. The main
proposal is the reading surface; do not open the internal task ledger instead.

Otherwise use an available local document viewer. Coordinator opens the document,
not a child terminal. Do not upload, publish, install software or start a web server
merely to show a draft.

Check the result; queued requests or launched commands do not prove visibility.
Report the actual state without polling, explicitly noting failed/unavailable display.
Always provide a clickable absolute proposal link and review summary. Reuse the preview
for revisions; preserve it during child cleanup.

## Delivery, recovery and cleanup

Do not poll files/diffs while a child works, overlap prompts or repeatedly query an
unchanged session. Give progress updates from known information; waits should allow
those updates. After a timeout, inspect only as needed to determine liveness; observed
progress calls for continued waiting, not replacement.

For missing markers or ambiguous delivery, inspect the settled result and allow one
recovery prompt per session. Check acceptance before retrying an uncertain prompt.
For session loss, prefer exact-session resume when supported. Otherwise retire the
old child before replacement and restore its role, package and existing proposal.
Allow one failure-driven replacement per role per run; fresh reviews of new versions
are not replacements. Report quota/auth/approval failures without silently switching
accounts/providers. Recovery never resets discussion or review counters.

At a handoff, record the semantic phase and any resumable handle. Stop/close only
owned child agents and panes on final human handoff, block or limit, using the actual
runtime's supported cleanup operations. Preserve artifacts. Do not interrupt an
active writer before it can save unless required to stop unwanted work.
If the native runtime has no close operation, leave settled children idle, record
that state and do not claim they were closed or send further work after handoff.

After context loss, read `task.md` and `proposal.md` before taking action. Inspect
recorded live handles before creating replacements to avoid duplicate agents. Missing
state must be reconstructed from preserved evidence, not invented. Unavailable review
or lost evidence must remain visible in the human-facing result.
