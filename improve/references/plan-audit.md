# Plan Audit — pre-delivery consistency gate

Read this before delivering a new or updated plan and when reviewing an existing plan. Run it independently just before delivery. Patch every mismatch when artifact edits are allowed; for critique-only review, report each mismatch and do not represent the plan as ready.

This audit checks that the plan you wrote is internally self-consistent and executable by a zero-context reader. It is **not** the finding-discovery audit (scanning a codebase for problems) — that is a different activity. Here the subject under review is your own plan artifacts.

Two required outputs, every time:

1. A **per-step verdict list** from the step-body sweep below (one line per step, across every plan). A blanket "all steps clean" does not satisfy this.
2. **Evidence-backed audit notes** naming the objects you checked (steps, identifiers, contracts, commands, dependency edges, state transitions, call chains, mismatches fixed, remaining assumptions). An unsupported "resolved every ambiguity" claim is itself an audit failure.

---

## Part A — Step-body sweep (run first, on its own)

Do this as a standalone pass before the consistency checks in Part B. Keeping it separate is the point: when it is one bullet among contracts, topology, and async chains it gets applied unevenly, and step-level deliberation slips through.

Read only the implementation-step bodies and any step-level instruction the executor follows literally. Go step by step and answer one binary question per step:

> Besides the final action(s) to take, does this step contain anything else — reasoning, a comparison of alternatives, self-correction, a parenthetical "or do X instead / simplest: / choose:", or a choice the reader still has to settle?

- **No** → the step passes.
- **Yes** → move the reasoning and rejected alternatives into the plan's "Design rationale / rejected alternatives" section, leaving only the chosen action in the step; or, if the choice genuinely cannot be settled now, replace it with an explicit STOP/ask-user/deferred marker at that step.

Judge by the artifact's shape, not by vocabulary. A step can fail with no "or" in it; a normal sentence containing "or" (`INSERT OR IGNORE`, `string | null`, "add or update tests") does not fail. A step that eventually lands on a concrete instruction still fails if it walks through the rejected options first — the step keeps the conclusion, the working-out goes to rationale.

Record the result as a per-step list:

```
Step 1: clean
Step 2: moved error-code deliberation to rationale
Step 3: clean
Step 4: marked deferred (needs operator product call)
```

For a multi-plan set, run the sweep per step across every plan, not only the new or changed ones.

---

## Part B — Single-plan consistency

Run on every plan (whether or not it is part of a set):

- **Step-body sweep confirmed.** Every step has a recorded verdict from Part A; carry those verdicts into the audit notes. Do not collapse them into a single summary judgment.
- **Internal identifier/signature consistency.** Any symbol, function/method signature, type, route, schema field, config key, or filename defined in one step must match exactly everywhere else it appears in the plan (other steps, call sites, scope list, contracts table, done criteria). Trace each defined identifier to its uses and name the mismatches you fixed.
- No implementation step contradicts the stated scope, dependencies, contracts, or done criteria.
- Every referenced file, command, symbol, endpoint, config key, schema field, event, or public type is defined or explicitly required from repo state.
- Every final verification command can pass after only the plan's in-scope changes; if it covers out-of-scope consumers, the plan preserves compatibility or narrows/defers the command explicitly.
- Async/effectful call chains are consistent: method signatures, caller behavior, error propagation, cancellation, and cleanup match the planned implementation.
- Any lifecycle/concurrency risk triggered by the change has an explicit guard, verification, or STOP condition, including relevant state transitions for long-lived resources or workflows.
- Dependency topology is classified honestly: no cycle, construction-time acyclic with runtime back-reference, intentional guarded cycle, or unacceptable cycle requiring redesign.
- The plan does not leave unresolved implementation choices for the executor, judged by the Part A sweep rather than by scanning for specific words. A choice phrased without the word "or" is still a choice; a sentence containing "or" is not.
- Audit notes include concrete evidence (checked objects and findings), not bare pass/fail assertions. Do not assert a lint or check "passed" without naming the steps/identifiers you traced.

---

## Part C — Cross-plan consistency (backlog / multi-plan sets only)

Run only when the delivery is more than one plan, and update the index (`README.md`) with the results:

- Build a contract matrix for all produced/consumed contracts: API routes, CLI commands, function signatures, database fields, config keys, event payloads, file formats, public types, generated artifacts, and dependency-injection seams.
- Confirm every consumer depends on the plan that produces the contract and that no consumer relies on a missing or deferred capability.
- Confirm final verification commands are scope-closed for each plan and for the plan set.
- Build or describe the construction/dependency topology for new services/managers/registries/workers/clients and classify any cycle/back-reference explicitly.
- For stateful or long-lived workflows, list the critical state transitions and verify producer/consumer timing paths are covered.
- For async/effectful work, trace completion/error/cancellation/cleanup through the caller chain.
- Track intentionally deferred capabilities in the index, including who deferred them and which later plans are allowed to rely on them.
- **Reconcile the index against the plan bodies.** Any decision recorded or resolved in the index (which plan owns a route, a chosen name, a resolved "where does X live") must be written back into the affected plan bodies. A resolution in the index plus a still-open "or here" / "pick one" in a plan body is a desync; patch the body, do not leave the executor with the open phrasing.
- Confirm the Part A step-body sweep was run per step across every plan in the set (not only the new or changed ones) and that each step has a recorded verdict.
- Write evidence-backed audit notes naming checked contracts, commands, dependency edges, state transitions, call chains, index/body reconciliations, mismatches fixed, and remaining assumptions.

---

## Done when

- Part A produced a per-step verdict list covering every step of every plan.
- Part B passed for each authored or updated plan, with mismatches patched; a critique-only review instead records every mismatch and marks the plan not ready.
- Part C passed for authored or updated multi-plan sets, with the index updated and reconciled against plan bodies; a critique-only review reports any failure without editing.
- Audit notes are evidence-backed and recorded in the plan or index when edits are allowed, or in the critique report otherwise.
