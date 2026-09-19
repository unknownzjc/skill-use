# Acceptance contracts and evidence

Outer uses this guide before freezing the task and during review. Goal uses the
frozen requirements to choose methods and record proof. Keep the contract, evidence
mapping and review in the existing four sections of task.md; this guide adds no
roles, intermediate approvals, companion status files or runtime schema. Its examples
are writing aids, not additional requirements for an already-frozen task.

## Make the contract ready before dispatch

Acceptance describes task-specific results that can be accepted or rejected against
stated criteria. Give each required outcome a stable ID such as A1, relevant context,
an expected result, and a credible verification path: minimum boundary, decision rule
and evidence to retain. Automate objective checks when practical; reserve judgment
for what cannot be adequately decided that way and state its criteria. A human can
review automated evidence; an automated business assertion can establish acceptance.

Common quality gates (G1, G2, ...) belong under Constraints / Required Gates, not in
place of task outcomes. Record their applicability, expected result and any agreed
baseline allowances; explicitly say none with a reason when none apply. Both outcomes
and applicable gates matter to PASS. Classify by the subject, not the command name:
"all tests/lint/tsc pass" is normally a gate, but a type-declaration repair can require
that a concrete downstream consumer compiles and an invalid call is rejected.

Before dispatch, fix vague outcomes, pure-gate substitutes and missing credible proof
paths. Freeze the expected result and minimum proof requirements, not every command
or fixture path. Goal may refine methods without weakening the required boundary or
changing the result. A later contract correction is Outer-owned: record the delta and
reason, retain prior history, invalidate affected evidence, and respect user authority
over scope or risk acceptance. It does not reset review/attempt counts or retroactively
turn a newly added requirement into an implementation defect.

## Choose the form that fits the result

Require clear semantics, not one mandatory sentence format. Add a concrete example
when it resolves ambiguity; examples illustrate the rule rather than exhaust its scope.

| Form | Example of a task-specific outcome | Required proof |
| --- | --- | --- |
| Behavior (Given / When / Then) | Given a fixed dataset whose filtered IDs are r1 and r3, when the user exports through the real export entry, then the CSV is parseable and contains exactly those two records, with no duplicate IDs. | Actual exported file plus parsed record comparison at that entry. |
| Artifact | The risk note names unverified platforms, their affected behavior, completed checks and reproduction steps, consistent with the delivered diff. | Document path/version and Outer inspection against those content criteria and the actual diff; existence alone is insufficient. |
| Invariant or metric | During a controlled cancellation-before-completion schedule, no result is published after cancellation is acknowledged. | Event order and correlated observations at the public boundary, including the dangerous interleaving; a helper-only result cannot prove that boundary. |

For performance metrics, also freeze the workload, environment, measurement window
and threshold. Do not substitute an adjective such as "fast" or "robust". Split
independently decidable outcomes, but keep related assertions needed to describe one
coherent result together.

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
Context: The fixed dataset's filter selects IDs r1 and r3; use the actual export entry.
Expected: Parseable CSV with exactly two data records, IDs r1 and r3, no duplicates.
Required proof: Actual exported file and parsed comparison against the delivered build.

## Constraints / Required Gates

G1 — Existing export regression suite passes: node --test test/export.test.mjs.
Baseline allowances: none.

# Execution and Verification

P1 -> A1: Reproduce the omitted row on the old build. Export through the real entry
on the corrected build; retain the CSV and compare IDs/counts. Record the build/inputs.
P2 -> A1: If a private checker is used, the correct CSV is accepted; a parseable CSV
missing r3 is rejected with assertion missing_record, not a parser/setup error.
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
| Error handling is robust. | No condition or observable result. | For the named dependency failure, the public entry returns the agreed error and leaves no partial output. |
| Lint, tests and build are green. | Common gates replace the requested result. | Record these as applicable G items; define the task behavior separately. For a build/type-tool task, name the concrete consumer behavior being delivered. |
| Add a retry helper and call it. | An implementation step is not the result. | The specified transient failure retries according to the policy; the specified permanent failure does not retry. |
| The mock export is correct, so export works. | The claimed boundary exceeds the evidence. | Retain the real-entry export and compare its records; label mock evidence as local only. |
| The negative command failed, so rejection works. | A crash may precede the target condition. | Show that the well-formed violation reached the assertion and was rejected for that exact semantic reason. |
| The risk document exists. | Presence is not content adequacy. | Inspect its required risks, affected scope and reproduction steps against the actual diff and evidence. |
| A screenshot proves the entire workflow. | A still image does not show all interactions or persistence. | Name the visible state it proves and add interaction/persistence observations for the remaining claims. |
| The old build passed and fingerprints did not change. | The selected files may omit the edited input or delivered artifact. | Identify the tested source/build, include relevant dirty inputs, and rerun affected proof on the delivered result. |

## Outer review checklist

Before PASS, independently check that each required A/G ID has sufficient current
evidence at its required boundary, the observations meet the decision rule, and
constraints are satisfied. Gate success does not cover a missing outcome, and outcome
success does not waive an applicable gate. Inspect critical failure reasons and checker
coverage; do not infer them from a suite's exit code or the presence of a report.

Distinguish observed violations, proof gaps and contract defects in the existing
Outer Review. Return one complete evidence-backed revision batch under the existing
review limits. Missing external proof remains visible through the existing blocker
handling; do not silently mark it verified or add an intermediate approval loop.
