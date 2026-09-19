# Executable acceptance: mechanism ablation

This is a **deterministic mechanism experiment**, not an LLM/prompt ablation and not
an old-versus-new LoopMe success-rate measurement. The evaluator is handwritten from
the acceptance guidance; it does not ask an Agent to read or follow that guidance.
It is an evaluation fixture, not a new production gate or mandatory task schema.

## Reproduce

From the repository root, with Node.js >=22 and no extra dependencies:

```bash
node --test loopme/scripts/loopme.test.mjs
node loopme/evals/executable-acceptance.mjs
# Optionally supply an existing parent directory for retained evidence:
node loopme/evals/executable-acceptance.mjs /tmp
```

Each invocation creates a fresh private directory and prints the report path. It
retains the design, fixture sources, expectations, actual CSVs, native Node test/TAP
results and `loopme run` / `loopme check` metadata. Nothing is dispatched to Herdr.
The script exits nonzero if the full evaluator misclassifies a seeded submission or
the weak control cannot reproduce false success. Evidence is saved before asserting.
Archive that directory for durable raw evidence; no existing directory is overwritten.

## Controlled design

One CSV-export task has 13 fixed submission variants on two fixed datasets: **8 valid
controls and 18 unacceptable submissions**. Unacceptable includes missing proof as
well as incorrect behavior; these are not 18 distinct product bugs or independent
real-world tasks. Cases and labels are stored before execution. The judgment function
receives observations and the frozen requirement, never the acceptability label.

The fixture actually runs a native Node test binding, launches an exporter and invokes
a private checker. Canonical good/missing/duplicate observations come from the frozen
requirement, independently of the candidate expectation. The fixture's miniature CSV
format and ignored-boolean adapter are deliberately limited; no Cucumber engine is
installed or tested. `export.feature` is illustrative, not an executable binding.

Every arm receives the **same captured executions, inputs and evidence**. Only the
selected review guard is omitted. The exit-only arm is an intentionally weak control,
**not a model of the existing skill**, which already requires meaningful evidence.

| Guard | Observation inspected | Failure it targets |
| --- | --- | --- |
| Execution | Required A1 case actually executed and passed | Unbound, skipped or unrelated green tests |
| Frozen expectation | Candidate expected record set equals the frozen requirement | Changing expected output to match a defect |
| Checker challenge | Real `check` results on independent good/missing/duplicate CSVs | Empty assertions and ignored boolean returns |
| Real entry | Actual command used the required CLI, not its helper | Correct helper hiding a defective public entry |

Equivalent output reordering and checker refactoring are valid controls. A correct
native-test submission without a `.feature` file must also pass. That last control
establishes fixture compatibility with native tests, **not** a finding that Gherkin
has no value to an Agent; this evaluator never interprets Gherkin in either condition.

## Recorded result

The [result snapshot](executable-acceptance.results.json) includes runtime and source
hashes and the exact escaped case IDs. Two fresh runs produced identical decisions;
this is a reproducibility check, not independent stochastic sampling.

| Arm | False acceptance / 18 unacceptable | False rejection / 8 valid |
| --- | --- | --- |
| Exit-only weak control | 16 | 0 |
| Full | 0 | 0 |
| Minus execution coverage | 2 | 0 |
| Minus frozen expectation | 0 | 0 |
| Minus checker challenge | 4 | 0 |
| Minus real entry | 2 | 0 |
| Minus expectation and checker challenge | 6 | 0 |

Removing execution coverage admits the unrelated scenario; removing checker challenge
admits both empty assertions and ignored returns; removing entry verification admits
the helper substitution. Some missing-execution cases remain rejected by the entry
guard, illustrating overlap rather than a clean one-failure/one-rule mapping.

Removing frozen-expectation comparison alone has **no measured marginal effect** here:
the independent checker fixtures also expose the weakened oracle. Removing both
protections admits the weakened expectation as well as the two broken-checker cases.
Do not conclude that expectation authority is unnecessary or claim every addition
has demonstrated an independent gain. Neither specification persistence nor prompt
wording effects are measured by this single-run fixture.

A separate negative control temporarily disabled the real-entry guard even in the
full arm: the harness exited 1 at its known-defect assertion and identified exactly
the two helper substitutions. The source was restored. The unchanged 5-test helper
suite passed both before and after the documentation enhancement.

## Behavioral ablation remains unrun

No Herdr/model execution environment was available for this experiment. These results
do not demonstrate that an Agent will obey the prose, that the PR improves completion
rates, or that adversarially forged evidence is prevented. Raw records here are
produced by controlled fixture code; this is not a trust boundary for arbitrary code.
Native Windows, UI workflows and long-lived regression maintenance are also untested.

A real skill ablation should pin the pre-enhancement PR commit
`4e786f6dce2618109fe73e928b966650f3290f1a` and the enhanced revision, freeze task inputs
and an independent scoring oracle, and compare the baseline, full guidance and
leave-one-rule-out variants. Remove a rule consistently from SKILL, Goal and the
reference to avoid leaking it through another copy. Keep model/version, tool budget
and environment fixed; use fresh sessions, counterbalanced ordering, repeated runs
and blind scoring. Include equivalent plain-text/Gherkin conditions and non-code
artifact controls. Retain transcripts, patches, commands and source identity, and
report false PASS, false rejection, proof gaps, time and token/tool cost separately.
Do not replace this missing experiment with keyword checks on the skill text.
