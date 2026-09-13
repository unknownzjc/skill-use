# One Shot Runtime

Use Herdr panes and agent CLIs for Designer and Reviewer, as in LoopMe. Native
child-agent tools are not the default or an automatic fallback. Resolve each role
independently from the user's supported role-specific choices and
[`../config.json`](../config.json), as defined below. Do not implicitly install a
runtime or create user-visible sidebar tasks.

Use the task directory resolved by SKILL.md: `<project-root>/.one-shot/<task-id>/`
unless the user chose another location. Pass its absolute paths to every child.
Persist root/ID once, reuse on resume, and do not redirect artifacts to temporary
storage when startup fails. Local retention is not permission to commit or publish.

## Per-role configuration

Before creating a pane, read `../config.json`. Require version `1` and exactly one
`agents.designer` and one `agents.reviewer` mapping. Each mapping has:

- `kind`: the Herdr agent kind;
- `model`: one provider-qualified `<provider>/<model>` identifier, passed unchanged
  as the single value of the child CLI's `--model` option;
- `args`: an array of native child-CLI arguments.

Require nonempty NUL-free strings, a nonempty provider and model segment, and string
arguments. Reject unknown or missing fields and reject a model selector in `args`;
`model` is the sole model/provider source. Structural validation does not establish
provider authentication, quota, catalog availability or model access.

An explicit supported user setting for Designer or Reviewer overrides the corresponding
field for only that role. Never copy one role's provider, model or arguments to the
other role, and never infer a provider from an unqualified model name. Record each
role's effective `kind`, provider-qualified model and arguments in `task.md` before
startup. Reuse those recorded values on resume; a later configuration-file change
does not silently replace a live or resumable child.

## Herdr agent startup

Before dispatch, read the available Herdr skill and require `HERDR_ENV=1` in the
actual execution shell. Discover supported kinds and flags from installed CLI help.
If Herdr is unavailable or outside a managed pane, preserve the package and report
the missing prerequisite; do not inspect/control a focused session or silently use
native children. A different transport requires an explicit user request.

Coordinator alone owns one persistent Designer and a separate Reviewer. Use sibling
panes in the current tab/cwd, split according to the Herdr layout with `--no-focus`.
Parse returned IDs and use names prefixed with the stable task ID from `task.md`;
do not create a workspace, tab or worktree unless requested. Prepare assignments first.

Use the resolved role-specific kind and provider-qualified model; report missing or
invalid runtime configuration rather than guessing. Inject the absolute role file
through the CLI's documented native system-prompt option. Reading a role only in
Coordinator or merely mentioning its path is not role injection.

Start Reviewer in a general-purpose interactive agent CLI session with the one-shot
Reviewer role, not a built-in code/patch-review mode or preset chosen merely because
it is named “reviewer”. Check launch configuration for inherited roles and output
schemas: diff-only findings, `overall_correctness`, and numeric confidence conflict
with this workflow. Appending the role cannot override a higher-priority conflicting
contract. Remove that preset before dispatch or report the runtime incompatibility;
do not ask the child to ignore its higher-priority instructions.

Accept only the one-shot verdict/version and decision-oriented report defined in
reviewer.md. A patch verdict buried around or instead of that report is a contract
failure, not a passed review. Correct role/schema configuration and use the existing
recovery/replacement bounds before retrying; never translate `correct` into approval.

The LoopMe startup shape is:

```bash
herdr pane split --current --direction <right-or-down> --cwd <cwd> --no-focus
herdr agent start <name> --kind <kind> --pane <pane-id> -- [--model <model>] <candidate-args...> --append-system-prompt <absolute-role-path>
herdr agent prompt <name> "<assignment-with-absolute-package-paths>" --wait
```

Verify options against installed help. Pass native args as separate argv, not eval;
pass the role's provider-qualified `model` as one argument after `--model`. For OMP
use persistent interactive mode, not print/RPC or `--no-session`;
`--append-system-prompt` loads the role file. Other CLIs use their documented
equivalents, not assumed OMP flags.

Prompt immediately after startup readiness. Continue question answers and revisions
in the same Designer session. Designer is idle and does not write during review.
Start each review in a fresh Reviewer context with the exact proposal version and
the review inputs defined in SKILL.md; retire the previous Reviewer before starting
the next. Never reuse Designer's session as Reviewer.

Use one outstanding lifecycle wait per owned agent. After settlement, read once
and classify the semantic handoff. `idle` or `done` is not proof of a proposal or
review verdict. Record agent names, pane IDs, exact resumable session handles, roles
and states in `task.md` at handoffs. An actual approval UI follows Herdr's rules,
not proxy design answers. For truncated results use Herdr's documented file-output
fallback in the run directory and retain complete review evidence in `task.md`.

## Human document display

Before human review, verify and open `review.md` plus the canonical spec in `drafts/`;
link any domain drafts. The guide distinguishes pending choices without changing the
documents' project format. After approval, open the delivered spec and domain docs,
not the decision guide or internal ledger.
Prefer the host's rendered Markdown/document preview. In Codex, when available,
call `open_in_codex` with the relevant absolute file path in the current task using
the actual tool schema. Do not open the internal task ledger as the reading surface.

Otherwise use an available local document viewer. Coordinator opens the document,
not a child terminal. Do not upload, publish, install software or start a web server
merely to show a draft.

Check the result; queued requests or launched commands do not prove visibility.
Report the actual state without polling, explicitly noting failed/unavailable display.
Always provide a clickable absolute link to the appropriate reading surface and an
accurate summary. Reuse the preview for revisions; preserve it during child cleanup.

## Delivery, recovery and cleanup

Do not poll files/diffs while a child works, overlap prompts or repeatedly query an
unchanged session. Give progress updates from known information; waits should allow
those updates. After a timeout, inspect only as needed to determine liveness; observed
progress calls for continued waiting, not replacement.

For missing or out-of-stage markers or ambiguous delivery, inspect the settled result
and allow one recovery prompt per session. Check acceptance before retrying an uncertain
prompt. For session loss, prefer exact-session resume when supported. Otherwise retire
the old child before replacement and restore its role, assigned stage, selected
skill/mode, package, existing proposal and recorded per-role runtime configuration.
Reload required skills after context loss; recovery does not itself advance a workflow
stage or make stale gates valid. Allow one failure-driven replacement per role per
run; fresh reviews of new versions are not replacements. Report quota, authentication,
provider or model failures without silently changing the configured selection.
Recovery never resets discussion or review counters.

At handoff, reconcile the single current-state block in `task.md`: stage, exact
artifact version, active assignment (or none), approval/review status, and role
handles and delivery manifest/status. Clear completed assignments and record actual
child states; keep old states only in transition history. Match the guide's review
version to the manifest and frozen draft files; drafts carry no runtime headers.
Coordinator applies those files without a cleanup/synthesis round. After settlement,
Coordinator may update guide dispositions; Designer must not write concurrently.
Stop/close only owned children and panes on final human handoff, block or limit,
using supported operations. Preserve artifacts and resumable handles. Do not
interrupt active writers before they save unless stopping unwanted work. If close
is unavailable, record idle; never claim closed or send further work after handoff.

After context loss, read `task.md`, `review.md` and the mapped canonical drafts.
Use the current-state block for lifecycle state and the drafts for document content.
Reconcile conflicting versions/assignments from history and preserved results
before dispatch; do not reset counters or infer approval. Inspect recorded live
handles before creating replacements. Missing state or review evidence must be
reconstructed from evidence or reported unavailable, never invented.
For interrupted approved delivery, reconcile existing destinations with the manifest
before writing again; resume only pending work at `approved`, not discovery. Never
duplicate an already-created ADR/spec or call partially written docs fully delivered.
