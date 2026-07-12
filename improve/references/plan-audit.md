# Plan Audit

Run this independent consistency pass before delivering any new, updated, or reviewed plan. It audits the plan artifact, not the repository for new findings.

## Plan checks

- **Decisive steps** — Read every implementation step. Each must contain one chosen action, not deliberation or alternatives. Move useful reasoning to the rationale section; represent a genuinely unresolved decision as a local `STOP`, ask-user, or deferred condition.
- **Exact references** — Trace identifiers, signatures, types, routes, schema fields, config keys, filenames, and contract shapes from definition to every use. Every cited file, symbol, command, or external requirement must resolve to current repository evidence or be explicitly required by the plan.
- **Artifact coherence** — Reconcile steps with Scope, dependencies, contracts, done criteria, and current-state claims. A verification gate must be achievable through in-scope changes, preserved compatibility, an explicitly narrower check, or a project-specific stop condition.
- **Load-bearing chains** — When applicable, reconcile producer/consumer behavior, ownership and dependency topology, lifecycle and state transitions, and completion/error/cancellation/cleanup propagation across steps and callers. Every material risk needs a guard, verification, or stop condition.

## Connected-set checks

Run these checks whenever the audited plan belongs to an index, has a plan dependency, or produces or consumes a contract shared with another plan. Audit the affected dependency and contract closure; do not re-audit unrelated plans.

- Each shared contract has one clear producer, matching consumers, correct dependency edges, and no consumer relying on a missing or deferred capability.
- Verification remains scope-closed across the affected plans, and cross-plan topology, state transitions, and effectful call chains remain coherent where applicable.
- Index status, ordering, ownership, dependency, contract, and deferred decisions agree with every affected plan body.

## Readiness

When artifact edits are allowed, patch every mismatch before delivery and encode any real remaining assumption or deferred decision in the plan's normal context, contract, or stop section. For critique-only review, report concrete mismatches and do not mark the plan ready while any unresolved inconsistency remains.
