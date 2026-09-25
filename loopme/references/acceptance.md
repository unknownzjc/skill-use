# Acceptance contracts and evidence

Outer uses this guide before freezing the task and during review. Goal uses the
frozen requirements to choose methods and record proof. Keep the contract, evidence
mapping and review in the existing four sections of task.md; this guide adds no
roles, intermediate approvals, companion status files or runtime schema. Its examples
are writing aids, not additional requirements for an already-frozen task.

## Make the contract ready before dispatch

Acceptance describes task-specific results that can be accepted or rejected against
stated criteria. Give each required outcome a stable ID such as A1 and explicit
Given / When / Then fields. Record a credible verification path separately as Required
proof: minimum boundary, decision rule and evidence to retain. Automate objective
checks when practical; reserve judgment for what cannot be adequately decided that
way and state its criteria. A human can review automated evidence; an automated
business assertion can establish acceptance.

Common quality gates (G1, G2, ...) belong under Constraints / Required Gates, not in
place of task outcomes. Record their applicability, expected result and any agreed
baseline allowances; explicitly say none with a reason when none apply. Both outcomes
and applicable gates matter to PASS. Classify by the subject, not the command name:
"all tests/lint/tsc pass" is normally a gate, but a type-declaration repair can require
that a concrete downstream consumer compiles and an invalid call is rejected.

Before dispatch, fix missing Given / When / Then fields, vague outcomes, pure-gate
substitutes and missing credible proof paths. Freeze the Given / When / Then meaning
and minimum proof requirements, not every command or fixture path. Goal may refine methods without weakening the required boundary or
changing the result. A later contract correction is Outer-owned: record the delta and
reason, retain prior history, invalidate affected evidence, and respect user authority
over scope or risk acceptance. It does not reset review/attempt counts or retroactively
turn a newly added requirement into an implementation defect.

## Complete the rest of Frozen Task

Use the draft's named fields, not one catch-all goal paragraph. Replace placeholders
before dispatch; explicitly state none where applicable instead of leaving blanks.
These fields describe the current increment, not an exhaustive design document.

| Area | What to record | Boundary |
| --- | --- | --- |
| Goal and Scope | Intended result, covered behaviors/objects/boundaries and explicit non-goals. | Steps and predicted file edits belong in Execution, not the goal. |
| Shared Context and Unknowns | Authoritative references to requirements/decisions; Established facts with sources and applicable versions/conditions; Uncertain questions or assumptions with impact and resolution owner/authority. | Do not turn assumptions into facts. Unknowns live here once, not in a duplicate register. |
| Frozen Decisions | Confirmed decision, source/authority, rationale and scope; explicitly none if there are no confirmed decisions. | Candidate approaches remain revisable. Sourced technical constraints and authorized write limits may be frozen; a predicted edit list is not a write limit. |
| Deliverables | Artifact or result, required location or consumer entry when constrained, and relevant A IDs. | State the consumer-visible obligation through those ACs; do not substitute predicted internal edits for outputs or duplicate acceptance. |
| Peer Runtime | Ordered candidates/argv and fallback from resolved config, absolute role path, supported startup and session recovery. | Complete the handoff even when Peer use is optional; do not guess runtime support. |

Resolve scope, authority and risk-acceptance decisions before dependent work. A technical
unknown that Goal can investigate within the authorized scope does not block dispatch:
name that investigation and its owner. Record known decision-relevant unknowns, not
an impossible inventory of everything unknown. `None identified` is not proof that
no uncertainty exists.

Frozen context is the sourced starting state, not a claim that facts never change.
Goal records discoveries, resolutions and new questions in Execution and Current
Evidence, referring to the initial items; contradictions affecting the contract return
to Outer under the existing change rule. Do not silently rewrite the starting context.

Keep required outcome invariants in Acceptance/Constraints and their proof methods
in Execution. For example, preserving public CLI compatibility can be a sourced
constraint; choosing which helper to rewrite is a method. Authoritative context can
reference that constraint or a confirmed decision rather than repeat its text.
Fill-in structure helps expose omissions; it is not a semantic validator or another
approval stage. Outer still checks meaning before dispatch and evidence at review.

## Required Given / When / Then structure

Every acceptance item must state these fields in order, including artifact, invariant
and metric outcomes. Use plain text in the task contract:

- **Given:** the preconditions, input and relevant starting state.
- **When:** the action, event or review operation under those conditions.
- **Then:** the observable behavior or inspectable artifact result that decides acceptance.

Keep **Required proof** separate: it names how and at what boundary to establish the
Then result. A command or evidence path does not replace the expected result. The
structure is mandatory even when verification uses inspection rather than execution;
clear wording and a discriminating result still matter beyond the field labels.
Add concrete inputs/results where they resolve ambiguity; examples illustrate the
rule rather than exhaust its scope.

| Outcome | Given | When | Then | Required proof |
| --- | --- | --- | --- | --- |
| Behavior | A fixed dataset whose filtered IDs are r1 and r3. | The user exports through the real export entry. | The CSV is parseable and contains exactly r1 and r3, with no duplicate IDs. | Actual exported file plus parsed record comparison at that entry. |
| Artifact | The delivered diff and current verification record are available. | Outer compares the risk note against those records. | The note names unverified platforms, affected behavior, completed checks and reproduction steps consistently with those records. | Document path/version and content findings; existence alone is insufficient. |
| Invariant | A request is in flight and its completion can be delayed. | Cancellation is acknowledged before the delayed completion is delivered. | No result is published after the cancellation acknowledgment. | Controlled event order and correlated observations at the public boundary; helper-only evidence does not prove that boundary. |

For performance metrics, also freeze the workload, environment, measurement window
and threshold. Do not substitute an adjective such as "fast" or "robust". Split
independently decidable outcomes, but keep related assertions needed to describe one
coherent result together.

## Executable behavior specifications

For critical, objective behavior whose execution boundary is reachable, require an
executable acceptance check before readiness, using the project's existing test stack.
Express the contract in Given / When / Then and implement its checks with available
project tools. Artifact judgment remains valid where execution cannot adequately
decide the result. Record infeasibility and the remaining proof gap rather than calling
a written scenario executed or adding an approval gate.

Keep four responsibilities explicit:

- **Execution coverage:** map A ID -> named scenario/test -> assertion code ->
  actual run result and observed artifact. Confirm the required case ran and passed;
  zero selected cases, skipped or unimplemented checks and unrelated smoke tests do
  not establish it, even when the overall command exits zero.
- **Expected-result authority:** derive expected values from the frozen requirement,
  not by copying the implementation's current output. Outer inspects changes to the
  scenario, assertions, snapshots, fixtures and skip/filter configuration. Semantic
  corrections follow the existing contract-change rule; equivalent refactoring of
  test code is allowed. Do not freeze test implementation merely to protect meaning.
- **Discriminating assertions:** apply the positive/violation checks below to critical
  test assertions and private checkers. Logging success or computing a boolean that the
  runner ignores is not an assertion. Use canonical observations derived independently
  of the candidate oracle; a checker and fixtures rewritten to agree can both be wrong.
- **Required boundary:** bind the behavior to its frozen entry/build requirement.
  Helper-only success and checker-only fixture success remain local evidence, not
  proof that the public entry actually produced the required artifact.

The worked example below distinguishes all filtered rows from the current page.
Execute its actual export operation and compare the parsed output, not only request
arguments or a success log. Writing Given / When / Then states the requirement;
performing the check and recording its observations supplies evidence.

Keep reusable behavior/regression tests in the target project,
maintained alongside approved behavior changes. The private task.md is the current
run's coordination/evidence record, not a second copy of that regression specification.
The one-task-file rule forbids companion status records, not legitimate test artifacts.
None of this makes LoopMe a non-bypassable acceptance gate: its helpers record evidence;
Outer still judges coverage, meaning and sufficiency.

## Execution slicing and engineering checkpoints

A frozen task is not automatically one implementation batch. Before broad implementation,
Goal decides whether the task is already one independently verifiable end-to-end slice.
If not, derive a small ordered set of behavior-oriented execution slices in Execution and
Verification. Each slice names the A/G IDs it advances, an observable done predicate and
the proof subset that can be checked when the slice settles. Do not decompose by technical
layers such as "backend", "frontend" and "tests"; a slice should cross the necessary
layers to establish one narrow result. Keep exactly one implementation slice active so
feedback stays attributable. Investigation for later slices is allowed when it resolves a
named dependency, but do not bulk-implement later behavior ahead of the active checkpoint.

Before editing an active slice, record a concise engineering checkpoint in task.md:

- the invariant the slice must preserve or establish,
- the relevant state/data shape and ownership when they matter,
- the current observation, reproduction or falsifiable hypothesis,
- why the next change is the smallest move justified by that evidence,
- the observable delta expected if the move is correct.

This is not another approval stage or a design document. A trivial local change can say
that no new model is warranted. For a bug, a green patch is not enough when the failure
mechanism is still guessed: eliminate competing causes with the cheapest discriminating
evidence practical and retain the supported mechanism in Execution. If a speculative
change does not advance an acceptance/gate predicate, diagnostic hypothesis or required
intermediate invariant, remove it before handoff.

Verify a settled slice before activating the next one. The slice checkpoint is development
feedback, not a substitute for final proof at the frozen required boundary.

## Map each outcome to evidence

In Frozen Task, define what would establish the result. In Execution and Verification,
map proof obligations to A/G IDs and choose methods. In Current Evidence, link actual
records to those IDs with the observed result, tested boundary, source/build (including
dirty inputs) and status. Several records may support one item; one record may support
several items only when its observations actually cover each one.

Do not collapse the verification boundary, method, evidence medium and decision rule
into a single "evidence type". The table is a selection aid, not a closed enumeration
or a claim that the helpers capture screenshots/DOM themselves.

| Outcome | Required boundary | Method / decision rule | Evidence to retain | Violation versus proof gap |
| --- | --- | --- | --- | --- |
| CSV export | Actual export entry and delivered build | Execute via `run`; parse and compare exact record IDs/counts. | Exported file, comparison output and run metadata; relevant source/build fingerprints. | Wrong/missing/duplicate records violate the outcome; a helper fixture alone leaves the entry unverified. |
| API ownership | Public API with controlled identities/data | Request as owner and non-owner; compare status and returned data to the contract. Validate a private checker with `check` when used. | Correlated requests/responses, run records, checker summary and fixtures where applicable. | Unauthorized disclosure violates the outcome; a checker tested only on fabricated responses does not establish API behavior. |
| Risk note | Delivered document and actual changes | Outer reads and compares required content to the diff and verification record. | Path/version, inspected sections and evidence-backed findings in task.md. | Missing or contradictory content violates the outcome; an uninspected file path is only a proof gap. |
| UI error state | Actual UI in the required browser/build/state | Trigger the error; compare visible message and interaction behavior to the stated expectation. | Screenshot/DOM and interaction observations from suitable external tools, with state and build identified. | Wrong state/behavior violates the outcome; a screenshot of a different state or build does not prove it. |

`run` records execution, not correctness. `--fingerprint` covers only explicitly
selected files; unchanged hashes do not establish the right build, full dependency
coverage or business correctness. Record the actual artifact and why the observations
meet the requirement. Invalidate the affected rows after changes, not automatically
every unrelated baseline; never reuse old-build evidence as proof of edited sources.

### Keep the two kinds of negative example separate

A product negative scenario may be a successful result: an unauthorized request is
correctly denied. A checker negative is a well-formed observation of a violation:
a response that exposes another user's data must be rejected by the checker for
the intended assertion. Correct denial observations should be accepted by that checker.

For critical executable checks, demonstrate valid success and a meaningful violation
that fails for the intended reason. Crashes before fault injection, malformed inputs
and unrelated errors do not count. A `check` manifest requires accepted and rejected
cases across the suite; it does not enforce per-AC coverage or exercise the real product
unless the supplied checker actually does so. Goal and Outer must assess both.
For document judgment or low-risk static artifacts, state a clear rejection rule;
do not manufacture executable bad artifacts merely to satisfy a fixture quota.

## Worked example: export repair

This example shows the acceptance-related parts of a hypothetical task, not a
ready-to-dispatch Goal Package. Add its goal, runtime, context and other required
Frozen Task fields before dispatch. The named files/commands belong to that example,
not to LoopMe itself.

```markdown
# Frozen Task

## Acceptance

A1 — Export exactly the filtered records.
Given: The filter selects IDs r1, r3 and r5; the current page displays only r1 and r3.
When: The user exports all filtered records through the actual export entry.
Then: The CSV is parseable and contains exactly r1, r3 and r5, each occurring once.
Required proof: Actual exported file and parsed comparison against the delivered build.

## Constraints / Required Gates

G1 — Existing export regression suite passes: node --test test/export.test.mjs.
Baseline allowances: none.

# Execution and Verification

P1 -> A1: Reproduce the omitted row on the old build. Export through the real entry
on the corrected build; retain the CSV and compare IDs/counts. Record the build/inputs.
P2 -> A1: If a private checker is used, the correct CSV is accepted; a parseable CSV
missing r5 is rejected with assertion missing_record, not a parser/setup error.
G1: Capture the regression-suite command and result separately from the A1 proof.

# Current Evidence

| ID | Status | Evidence / observed result | Tested boundary / source / build |
| --- | --- | --- | --- |
| A1 | unverified | none | not tested |
| G1 | unverified | none | not tested |

# Outer Review

Not reviewed. No acceptance decision.
```

After execution, replace `none` with actual evidence references and observations, not
merely the plan or a self-reported success. Record every required item's status:
`unverified` for missing/inadequate proof; `failed` for an observed outcome/gate
violation; `needs recheck` for invalidated prior proof; `verified` only for sufficient
current proof. Explain unavailable boundaries and invalid setup explicitly. A proof
gap blocks PASS but does not by itself prove the implementation wrong.

## Bad -> why -> rewrite

| Bad acceptance or evidence claim | Why it is weak | Rewrite |
| --- | --- | --- |
| Error handling is robust. | No condition or observable result. | Given the named dependency is unavailable, When the public operation is invoked, Then it returns the agreed error and leaves no partial output. |
| Lint, tests and build are green. | Common gates replace the requested result. | Record these as applicable G items; define the task behavior separately. For a build/type-tool task, name the concrete consumer behavior being delivered. |
| Add a retry helper and call it. | An implementation step is not the result. | Given the specified transient failure, When the operation runs, Then it retries according to the frozen policy. Add a separate permanent-failure scenario whose Then requires no retry. |
| The mock export is correct, so export works. | The claimed boundary exceeds the evidence. | Retain the real-entry export and compare its records; label mock evidence as local only. |
| The negative command failed, so rejection works. | A crash may precede the target condition. | Show that the well-formed violation reached the assertion and was rejected for that exact semantic reason. |
| The risk document exists. | Presence is not content adequacy. | Given the actual diff and verification record, When Outer compares the risk note against them, Then its risks, affected scope and reproduction steps are complete and consistent with those records. |
| The Given / When / Then scenario is written and the suite is green. | The required check may be unimplemented, skipped or excluded. | Link its A ID, assertion and actual passed result; inspect the test selection. |
| Regenerate expected output until the test passes. | Implementation and oracle can drift together away from the contract. | Restore the frozen expectation or obtain an explicit contract correction; challenge the checker with independent valid and violating observations. |
| A screenshot proves the entire workflow. | A still image does not show all interactions or persistence. | Name the visible state it proves and add interaction/persistence observations for the remaining claims. |
| The old build passed and fingerprints did not change. | The selected files may omit the edited input or delivered artifact. | Identify the tested source/build, include relevant dirty inputs, and rerun affected proof on the delivered result. |

## READY preflight and repairable review

Before Goal returns `READY_FOR_OUTER_REVIEW`, it performs an adversarial preflight and
records the result in Execution and Verification. The preflight must check that every
required A/G item has sufficient current evidence, no helper/mock result is standing in
for required real-boundary proof, critical negative cases fail for the intended semantic
reason, and no speculative/unused change, unexplained legacy path, duplicate state source
or hidden design concern remains. A known gap produces BLOCKED/STALLED or continued work,
not READY.

Outer should make rejection easy to repair rather than maximize finding count. Cluster
related symptoms under the root cause they demonstrate, name the implicated A/G IDs and
required outcome, then classify the revision batch:

- **REPAIR** — the current model and execution slicing remain sound; local implementation
  or evidence corrections should converge.
- **REPLAN** — a data/ownership/API shape, task decomposition or shared premise is wrong
  enough that symptom-by-symptom patching is likely to repeat the defect.

A REPLAN requires Goal to revise its model/checkpoint and slices before more implementation.
If the same underlying root cause survives one completed revision, require a premise audit
before another patch: state the shared assumption, evidence for and against it, and the
revised model or slicing decision. Do not consume another review round on an equivalent
patch merely because it changes different lines.

## Outer review checklist

Before PASS, check each A item's Given / When / Then against the observed conditions,
action and result. Independently check that each required A/G ID has sufficient current
evidence at its required boundary, the observations meet the decision rule, and
constraints are satisfied. Gate success does not cover a missing outcome, and outcome
success does not waive an applicable gate. Inspect critical failure reasons and checker
coverage; do not infer them from a suite's exit code or the presence of a report.

Distinguish observed violations, proof gaps and contract defects in the existing
Outer Review. Return one complete evidence-backed revision batch under the existing
review limits. Missing external proof remains visible through the existing blocker
handling; do not silently mark it verified or add an intermediate approval loop.
