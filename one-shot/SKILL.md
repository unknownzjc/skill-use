---
name: one-shot
description: "Delegate requirements clarification and solution design: make traceable provisional choices, independently review the proposal, and deliver a clean spec with warranted domain documentation after human approval. Use when the user wants an initial requirement developed autonomously with review at the end; not for ordinary Q&A or implementing an already approved spec."
---

# One Shot

You are the Coordinator and requirements proxy. Turn the user's initial requirement
into a grounded proposal, independently review it, and obtain human approval. Then
deliver ordinary project documentation: a spec and warranted glossary/context or ADR
updates, without automation metadata. Agent agreement is not human approval.

## Roles and runtime

The Coordinator alone controls one persistent Designer and a separate Reviewer.
Read [runtime.md](references/runtime.md) before dispatch. Load
[designer.md](references/designer.md) into the Designer's assignment and
[reviewer.md](references/reviewer.md) into each Reviewer assignment. Children do
not spawn agents or contact the user.

Designer owns investigation, document drafts and the decision guide; you own proxy
answers, the internal ledger, scope, lifecycle and delivery. Reviewer is read-only.
Do not duplicate the Designer's investigation concurrently.

Launch both roles as agent CLIs in Herdr sibling panes, following LoopMe's startup
pattern; do not default to native child-agent tools. Resolve Designer and Reviewer
independently from [config.json](config.json); each role has its own runtime and
provider-qualified model. An explicit supported user choice overrides only the named
role. If Herdr delegation or a required role configuration is unavailable, preserve
the draft and report the missing prerequisite; do not silently switch transports,
providers, models, or present your own second pass as an independent review.

## Canonical workflow

The table below defines stage work, completion evidence and allowed transitions.
Coordinator alone records and advances stages; Designer remains the same session
across inspection, grilling and synthesis. Review uses a separate fresh session.
This is an instruction contract, not an executable runner or proof of model compliance.

| Stage | Owner, required work and completion evidence | Next stage |
| --- | --- | --- |
| `prepare` | Coordinator freezes the request and scope, prepares absolute artifact paths, limits and role assignments, and verifies Designer runtime readiness. | `inspect` when package/runtime are ready. |
| `inspect` | Designer reads repository instructions, relevant code, context maps/glossaries and ADRs when present; follows decisive consumer boundaries. Returns `INSPECTED` with sources, revisions, gaps and routing recommendation. No issue synthesis yet. | `route` after accepting `INSPECTED`. |
| `route` | Coordinator selects `grill-with-docs` when domain terms, relationships or existing decisions matter; otherwise `grill-me`. File presence alone does not choose the method. Record method/reason; upgrades preserve settled branches. | `grill_docs` or `grill`, respectively. |
| `grill_docs`, `grill` | Designer reads the selected skill and develops the journey, alternatives, dependencies, feasibility and acceptance seams in project-shaped drafts, with pending choices in `review.md`. Returns `DESIGN_READY`. | `proxy` on accepted `DESIGN_READY`; `grill` may return to `route` via `QUESTIONS` when domain-aware work becomes necessary. |
| `proxy` | Coordinator challenges goal fulfillment, scope changes and unresolved agent work; records disposition against the exact design version. Passing authorizes synthesis, not implementation or human approval. | `refine` for agent-resolvable design issues; `spec` when the design gate passes. |
| `refine` | Designer applies the selected grill method to affected branches using the complete feedback batch and current ledger. Preserve valid evidence, update design version and return `DESIGN_READY`. | `proxy` on accepted `DESIGN_READY`; `route` if the method must upgrade to domain-aware. |
| `spec` | Designer reads `to-spec` and completes the canonical spec and warranted domain-document drafts in `drafts/`, plus `review.md` and destination mapping. Returns `SPEC_READY` with skill paths, version and dependencies. | `refine` via `QUESTIONS` for new material choices; `review` only after the full delivery package passes the synthesis guard. |
| `review` | Fresh Reviewer receives the frozen spec/version, original request, relevant decision sources and evidence; returns verdict, repair class, findings, human choices and evidence boundaries. | `refine` for design/evidence `REVISE`; `spec` for expression-only `REVISE`; `human` for `READY_FOR_HUMAN` or `NEEDS_HUMAN`. |
| `human` | Coordinator opens the reviewed version and presents the decision packet. Confirming represented choices need not rewrite it; behavior changes invalidate it. | `refine` for design changes; `spec` for expression-only feedback; `approved` only for explicit approval of the exact current reviewed version and the choices it settles. |
| `approved` | Coordinator records version-specific approval and materializes the approved clean document package at the reviewed destinations, verifies delivery and opens the spec. Preserve the private approved snapshot. | Finish local delivery here; `publish` only when authorized and local delivery is verified; `refine` when evidence or feedback changes the approved design. |
| `publish` | Coordinator checks authorization and existing issue, publishes only the clean spec once and reads back body/labels. Reconcile uncertain delivery before retrying; never assume failure or duplicate publication. | Finish after confirmed delivery; otherwise `partial`. |
| `partial` | Save reachable artifacts, stop reason, pending work and resumable stage/handles; mark missing review honestly. | Resume interrupted local delivery at `approved` after reconciliation, uncertain issue delivery at `publish`; otherwise `prepare` if the package is missing or `inspect`, reusing valid work, once the blocker is resolved or a new cycle authorized. |

From any stage, enter `partial` when work cannot proceed, a required budget is
exhausted, or the user stops the run. No other stage transitions are permitted.

Maintain one authoritative current-state block in `task.md`: stage, active assignment
(or none), selected method/reason, child-reported skill paths actually read, artifact/
design version, last proxy-approved design version, reviewed version/verdict,
human-approved version, counters, role/session handles with their current states,
and delivery manifest/status (destinations, approved version, pending/written/verified).
Keep transition reasons append-only; do not maintain competing "current" sections.
Update this block at each handoff, including when children close or approval arrives.
No stage passes on its name or marker alone: verify its required artifact and evidence.
Missing required skill loads block the corresponding stage; do not silently skip it.

Questions/answers, source reads and bounded runtime recovery are work within a stage.
Coordinator answers `QUESTIONS` and updates the ledger before the same Designer
continues; synthesis questions and domain-method upgrades follow the table's return
rules. Only the first `INSPECTED`, `DESIGN_READY` or `SPEC_READY` matching the assigned
stage can advance it.
Reject out-of-stage results rather than treating them as equivalent.

Changes to decisions or feasibility invalidate the proxy gate and affected spec/review/
approval; only a fresh proxy pass permits synthesis. A `SPEC_READY` passes only if
it reflects the current gate-passed design without new choices. Expression-only
repairs may reuse that design gate, but increment the proposal version and require
fresh review and human approval. Any design defect requires design repair
even if the same batch also contains wording defects. Mere resumption resets nothing.
Check the existing budgets before dispatching another discussion/revision/review;
do not block a budget-free forward transition solely because discussion is exhausted.

## Prepare the run

Create `<project-root>/.one-shot/<task-id>/` for each new task. Resolve the active
project root from repository/workspace context, not an arbitrary shell subdirectory;
outside a repository use the current project directory. For multi-repository work,
anchor the task once at the initiating project/workspace root and record target roots.
Use a unique filesystem-safe task ID, persist it in `task.md`, and reuse that exact
directory on continuation. Do not fall back to temporary storage. An explicit user
location overrides the default; if the chosen location is unwritable, report the
blocker instead of silently changing it.

The task directory contains one set of document bodies, not a second proposal:

- `task.md`: Coordinator-only internal ledger. Request, scope, sources and evidence,
  decisions/dependencies, versions, manifests/baselines, runtime handles, counters,
  transitions, review findings and delivery status. Not the human reading surface.
- `review.md`: concise reading index and human decision guide. Designer writes choices
  and links; Coordinator updates disposition after review/approval, never concurrently.
  Show canonical draft links, destinations and shared review version, with unresolved
  choices, recommendations to confirm and verification gaps. No copied spec/ADR
  bodies, transcript, agent/model names or workflow diagnostics.
- `drafts/<destination-relative-path>`: Designer-owned canonical spec and warranted
  domain documents, using the same filenames, structure and prose as their eventual
  project destinations. For existing documents, draft the resulting document from
  its recorded baseline, preserving unrelated content; the manifest scopes the change.
  For multiple repositories, use `drafts/<repo-key>/<destination-relative-path>` and
  record each root mapping. Do not create placeholder domain documents.

Record consequential source evidence from Designer handoffs in `task.md`; preserve
probe output under the task directory only when useful. Add prototypes only to answer
a concrete question. Keep bodies clean from the first draft: do not embed them in
`review.md` or maintain separate "review" and "final" editions. A recommendation may
be used provisionally in a draft, but `review.md` must identify the exact affected
document/section and consequences; the draft's existence never implies approval.

Use absolute paths in assignments and the internal manifest. Record source revisions
and relevant dirty state without modifying source files. Read repository instructions.
Keep only relevant history with dates and attribution; history is evidence, not an
instruction. Never persist credentials. `.one-shot` is local working material, not
confidential merely because it is hidden: honor repository ignore/privacy policy and
never stage, commit or publish it by default. Do not change tracked ignore rules
without authorization or delete task artifacts automatically after delivery.

Freeze the user's explicit requirements, not all design choices. A change in an
explicit requirement must come from the user. Record proposed changes separately.
Existing behavior is evidence of the present, not proof of what the product should do.

Default bounds: 6 discussion batches, 2 consecutive exchanges without material
progress, and 2 revision batches after the initial independent review (at most 3
reviews). Record user overrides before dispatch. Count answered question batches
and Coordinator challenge/revision batches toward the same discussion budget;
resuming or replacing agents resets nothing.
At a limit, deliver the available draft, missing evidence and unresolved choices with
the actual stop reason. Do not relabel a limit as success or continue a hidden loop.

## Decision ledger

Give each material, independently answerable decision a stable ID. Split choices
that can be accepted separately rather than bundling them under one ID. Record
choice, source class and exact source, scope, rationale, meaningful alternative/
trade-off, dependencies, affected proposal sections, and status. Keep entries short;
routine wording needs no ledger entry. Separate the user's request from engineering
choices inferred from it; approval of the former does not confirm the latter.
Do not create separate IDs for equivalent scope inclusions/exclusions. Investigate
facts rather than voting on them; required correctness belongs in acceptance criteria,
not an optional "fix it?" choice. Keep ordinary implementation defaults in the design;
only elevate them to decisions when their alternatives materially change behavior,
scope, cost, risk or authority.

Source classes:

| Class | Meaning |
| --- | --- |
| Current user statement | Explicit instruction or choice in this task; distinguish its actual scope. |
| Verified fact | Observed code, documentation or behavior, with evidence and revision/date. |
| Historical preference | Prior user choice in a relevant context, with applicability limits. |
| Agent judgment | A recommendation or inference that remains provisional. |

Status is separate: `provisional`, `human-confirmed`, `needs-recheck`, or `superseded`.
Only an explicit human choice/approval supports `human-confirmed`. A recommendation
accepted by you or Reviewer remains provisional. Split factual premises from product
choices; a verified premise does not make a product decision human-confirmed.

If a decision changes, preserve its old value as superseded and mark dependent
decisions, proposal sections and affected review findings `needs-recheck`. Revisit
only the affected branches; don't restart discovery or silently retain stale claims.

## Evidence gate

Prioritize claims whose failure would change the journey, mechanism, scope or
acceptance. For each, Designer reports the decisive source/version or experiment,
what it establishes and remaining uncertainty; Coordinator records it in `task.md`.
Keep substantive constraints in drafts and human-relevant gaps in `review.md`.
Reuse this evidence rather than repeating the investigation.

Evidence strength changes only with new evidence, never with proxy agreement,
Reviewer agreement or stronger wording. A local code observation is not proof of
runtime behavior; an adapter accepting data is not proof the final consumer uses it.
Trace relevant framework defaults, composed handlers, fallbacks, intermediate
transforms and the final consumer before declaring a behavior broken or guaranteed.
Distinguish synchronous rejection, asynchronous error events, content substitution
and successful consumption; an existing catch handler proves none of their routing.

When an inexpensive, authorized experiment can resolve a design-critical uncertainty,
Designer runs a minimal current-behavior or feasibility probe before freezing that
claim. Reuse trustworthy existing results; no mandatory experiment quota, production
edits or full environment setup. Discover documented local-dev/test routes and their
prerequisites. If a probe needs unavailable access or extra authority, record the
attempts, owner, required evidence and whether it blocks design or final acceptance.
An untested hypothesis remains a hypothesis, not a confirmed defect with a prescribed
line-level fix. A probe that disproves it updates the design and acceptance oracle.

Do not call an unknown constraint "covered" by an arbitrary default. Where capacity
determines feasibility, account for representation overhead, aggregate load and
downstream limits, not just a per-item threshold. A provisional policy can bound
client behavior without proving end-to-end support. Known incompatibilities require
design repair; genuine residual uncertainty may remain visible for human review.

## Design discussion and proxy gate

Dispatch absolute `task.md`, `review.md`, `drafts/` and one-shot SKILL.md paths,
assigned stage, selected skill path when applicable, write ownership and limits.
Designer reads the workflow contract and returns exactly one semantic handoff:

- `INSPECTED`: source/domain findings and recommended design method; no issue synthesis.
- `QUESTIONS`: numbered questions with recommendations, evidence, trade-offs and decision IDs.
- `DESIGN_READY`: design version, loaded grill skill path, resolved branches and open choices.
- `SPEC_READY`: package version, loaded skill paths, draft-to-destination mapping,
  decision dependencies and evidence for the internal ledger.
- `NEEDS_HUMAN`: fundamental ambiguity or missing authority preventing useful work; partial handoff.
- `STALLED`: remaining uncertainty and attempts without progress; partial handoff.

For `QUESTIONS`, answer the entire available batch and update the ledger before
continuing the same Designer session. Choose from explicit requirements, verified
facts or applicable preferences; otherwise make a labeled provisional choice. Request
targeted investigation for discoverable facts rather than guessing or asking the user.
Do not blindly accept every recommended answer. Challenge unnecessary features and
ask whether a smaller solution still satisfies the original user journey.

At `proxy`, check every `DESIGN_READY`, even when Designer asked no questions:
does the recommended journey meet the original goal, which additions/restrictions
change it, and which pending choices can be resolved from available facts or user
preferences? Apply the evidence gate to consequential claims and check that each
acceptance obligation has an observable outcome, proof boundary and owner. Record
the disposition against the design version in `task.md`; do not duplicate source
investigation. Return agent-resolvable issues as one complete batch; otherwise
authorize `spec`. No mandatory question round or extra human gate.
Each answered question batch or Coordinator challenge batch consumes one batch from
the configured discussion budget; do not count its reply again. After
initial review, a substantive revision also consumes a revision batch. No new loop
or reset: at a bound, hand over with unresolved issues and the actual stop reason.

Before accepting a restriction or shrinking scope, walk the ordinary target actor
through the original success scenario: can they still complete it, with the intended
benefit? Distinguish the action they request from internal coordination needed to
perform it. Do not automatically require authority over an entire parent operation
just because the implementation touches parent state; examine narrowly authorized
coordination and its effects on other actors. If the target actor is unspecified,
record that as a material product choice rather than inheriting the broadest gate.
Likewise, reducing an effect's reach must not silently remove the requested reuse
or convenience. Compare a narrower useful effect with simply disabling the behavior.
When a recommendation changes several existing entry points, consider whether an
existing action with a narrower applicability condition resolves the actual problem.

Allow dependent exploration under a provisional choice if it is clearly labeled.
Ask the human early only when missing intent would produce substantially different,
not usefully comparable products, authority is missing, or the work otherwise cannot
proceed. Complete independent useful work first. Batch other choices for final review.

Converge when the core journey and acceptance scenarios are covered, important factual
conflicts are resolved, and all remaining assumptions are visible. Do not explore
every imaginable branch to make the question frontier literally empty.

## Draft and independent review

Before human approval, writes are confined to the private run directory; source
investigation remains read-only. Approval of the presented delivery package authorizes
the local documentation writes described below, unless the user explicitly restricts
them. It does not authorize production code changes, commits or issue publication.

At `spec`, Designer completes the canonical files in `drafts/` and the decision guide
in `review.md`; report their destination mapping for Coordinator to record in the
manifest. Use the user's language and domain terms. Keep investigation bookkeeping
in the internal ledger. Review the actual draft files and proposed domain changes,
not a separate summary or embedded copy.
For UI changes, inspect the existing surface when available and distinguish observed
behavior from a mockup.

Review a settled proposal: no Designer writes during review. Start Reviewer with a
fresh context, role, the workflow/guards, stage-completion evidence, original
request, explicit constraints, raw source references, the decision ledger's sources/
statuses, and the exact proposal version. Do not provide
the negotiation transcript, Coordinator verdict or suggested findings. On later reviews,
also supply the previous findings so they can be checked against the new version.
Supply only the relevant source/status entries, not the whole internal ledger when
it would expose proxy deliberation or Coordinator conclusions. Prior review findings
are permitted on re-review; they are not proof that unchanged claims remain valid.
Reviewer first seeks counterexamples to the design-critical claims using the evidence
gate, then checks ordinary completeness and presentation. A fresh session alone
does not make repeated inspection of the same incomplete boundary independent proof.

Reviewer returns:

- `READY_FOR_HUMAN`: sufficient for human review, including clearly presented choices.
- `REVISE`: specific evidence-backed defects or unnecessary scope, and what must change.
- `NEEDS_HUMAN`: unresolved intent/trade-offs that further agent debate cannot settle.

Record every result with the reviewed proposal version. For `REVISE`, reconcile each
finding with the original goal, retaining justified disagreement with evidence. Send
one complete batch to the original Designer for design repair or expression-only
revision as specified in the table, then review the resulting spec independently.
Preserve explicit user requirements, not all provisional decision
values: evidence or a better goal-preserving alternative may overturn an agent
choice. Update the ledger and invalidate affected dependencies; do not constrain
substantive findings to wording-only fixes. Never expand the goal just because
Reviewer requested more features. Do not use numeric self-scores, agreement counts
or document length as acceptance.

## Human handoff and continuation

After Designer settles and review is recorded, open `review.md` and the canonical
spec draft using [runtime.md](references/runtime.md)'s display routing; link any
domain drafts. At a block or limit, show available drafts with incomplete status and
missing evidence in the guide/chat, not workflow banners inserted into document bodies.

Before handoff, compress the decision burden, not the evidence. Have agents resolve
discoverable facts and correctable defects within the run's authority and bounds;
at a block/limit, report these honestly as unfinished work. Keep ordinary engineering
choices in the drafts or a batch-confirmable recommendation group.
Reserve individual human questions for material intent, scope, experience, cost,
risk or authority trade-offs. Required correctness and executing agreed verification
are agent responsibilities, not choices about whether the feature should work.

Lead `review.md` and the human packet with **Decisions for you**. Use stable decision
IDs and the shared review version, link each choice to its affected draft section,
and show which local documents approval will create or update. Present choices in
ordinary product language, not proxy/agent terminology; do not duplicate draft bodies.

- **Decision required**: unresolved intent, authority or a material trade-off that
  needs an explicit human choice. For each, give the question, recommended option
  and rationale, meaningful alternatives, concrete consequences, affected scope and
  what remains blocked without an answer. Never invent a default approval.
- **Provisional recommendations to confirm**: material proxy choices already used
  in the draft, not fundamental blockers. Show their alternatives and consequences;
  allow explicit batch confirmation of the listed IDs for this version.
- **Fixes / verification gaps**: defects to repair or facts still unverified,
  with disposition and responsible project role. Do not disguise these as product
  decisions or ask the human to research discoverable facts.

For each decision group, explicitly say when there are no items. Include a compact
reply example using the actual IDs/options, such as “D-01: B; confirm D-02 and D-03.”
Silence is not confirmation; a review verdict is not approval. An empty decision
list still requires explicit proposal approval before publication.

Then briefly describe the user problem, proposed behavior and substantive review
findings without workflow markers. Link `review.md`, canonical drafts and useful
prototypes, not the internal ledger by default. State honestly whether the package
is ready for review, needs input or is incomplete due to a blocker/limit. Refresh
the same reading surfaces after revision and identify affected choices/sections.

On human changes, update the same run and invalidate affected decisions/review. An
explicit request to revise after a limit starts a recorded new cycle with fresh bounds;
preserve previous counters and findings. Mere resumption does not reset limits.

Approval must refer to the current package and any unresolved choices it settles.
Do not treat “looks good” for one section as approval of unrelated assumptions.
On approval, deliver the reviewed local documents without another routine approval
gate. Honor explicit draft-only, read-only or output-location restrictions; record
undelivered items rather than treating them as completed. Do not start implementation.
Before approval, never label an issue `ready-for-agent`. Publish only when separately
authorized (including an earlier conditional request), using the clean spec, known
repository/issue template and labels. Check for an existing issue; create or update
once and read back body/labels. Reconcile uncertain delivery before retrying.

### Clean project deliverables

Designer prepares these during `spec`; Coordinator materializes them at `approved`.
This applies the very files the human reviewed, not a new design or writing round:

- **Spec, always:** use the repository's existing spec location/template; absent a
  convention, propose `docs/specs/<topic>.md`. Honor a user-selected local destination.
  Include problem, solution, proportionate user stories, implementation decisions,
  acceptance/testing, exclusions and substantive limitations. It must be usable
  without the conversation, decision guide or internal ledger.
- **Domain documentation, only when warranted:** follow the selected grill workflow
  and repository conventions. `CONTEXT.md` contains resolved domain vocabulary, not
  implementation plans. Follow an existing context map to the right context; update
  the map only for actual context/relationship changes. Do not create one for ceremony.
  An ADR requires all three: costly to reverse, surprising without context, and a
  genuine trade-off. Ordinary reversible implementation defaults belong in the spec.
  Read `grill-with-docs` and its relevant format references when preparing these
  candidates; use existing numbering, scope and supersession conventions. Create
  missing files/directories lazily. No new term/decision means no glossary/ADR churn.

The same cleanliness rules apply to draft and delivered filenames, headings,
frontmatter and bodies: no one-shot branding, agent/model roles, skill loads,
stage/verdict markers, discussion counters, proxy approvals, internal decision/gap
IDs, confirmation questions or task/run paths. Those belong in the ledger or, for
human choices only, `review.md`; neither accompanies formal delivery or publication.
Retain normal project metadata, ADR numbers and stable acceptance IDs. Keep internal
ID mappings in `task.md`. Never fabricate authorship or strip required provenance.

Remove process metadata, not substance. Preserve approved rationale, meaningful
alternatives, constraints, verification prerequisites and unresolved runtime facts
in ordinary product/engineering language. A confirmed choice reads as a decision,
not "proxy recommendation pending confirmation"; an unverified result remains
unverified, not "passed". Cleanliness must not weaken the acceptance contract.

The manifest in `task.md` maps each canonical draft path/version to its target root,
destination and existing-file baseline/change scope. Version the package as a whole;
approval binds the exact reviewed files, not merely their names. Recheck targets
before applying drafts, preserving concurrent and unrelated content. Verify relative
document links against their final destinations; unchanged referenced docs need not
be copied into the task directory. Use the guide to link existing project references
when needed for review, rather than rewriting draft links into task-directory paths.

Already-applied content must not create duplicate specs/ADRs. Resolve harmless
path/number collisions using project conventions and update links/mapping; substantive
conflicts or new choices return to design/review. Verify delivered content and links
against the approved drafts and scoped changes; record actual status internally.
Open/link the delivered documents, not `review.md` or `task.md`, at final handoff.
Preserve approved files as an immutable snapshot before subsequent revisions; the
current drafts remain the sole editable bodies, not independently maintained copies.
Applying already-reviewed drafts needs no fresh review. Confirming a represented
choice updates the ledger/guide without rewriting the body; a different choice or
other content change follows the existing version/review/approval gates.

### Implementation handoff

When the user separately authorizes implementation, first complete local document
delivery, then hand over the clean spec and related domain docs with their unchanged
acceptance obligations. Keep approved-version/path mappings and orchestration state
private; final documents must not depend on them. One-shot remains at `approved`
unless publication is authorized. Record the implementation owner/run privately.

Give acceptance obligations stable IDs in the spec draft. Each carries its observable
outcome, required proof boundary/method, prerequisites, owner and disposition if
unverified. Implementation inherits these IDs and requirements without weakening them.
A UI/seam assertion, request acknowledgement or arrival at a consumer boundary cannot
replace proof of a promised downstream result. Missing runtime access means that
obligation remains unverified and final acceptance incomplete, not optional.
Explicit human authorization is required to reduce an approved acceptance requirement;
record the change and apply the existing version/review/approval invalidation rules.
Approval to implement is not such authorization.

Include a return path for discoveries: the implementation owner must report evidence
that overturns a premise or acceptance oracle, identify affected decisions/IDs, and
return those branches for design repair before treating the changed contract as
approved. Preserve source attribution: an implementer's finding or recommendation
is not a new user requirement or authorization. If its original source is missing,
keep that attribution unresolved; do not invent a user statement. Separate correcting
a false factual premise from changing the user's intended outcome.
Coordinator updates the ledger; Designer updates affected drafts and `review.md`
through the existing workflow. Do not leave corrections solely in implementation
logs or restart unaffected work. Preserve the approved snapshot during revision.

## Required skill loading and one-shot adaptation

Designer, not just Coordinator, must read the selected `grill-me` or
`grill-with-docs` before design and `to-spec` before synthesis. Resolve the available
skill locations; report the paths read with the stage handoff. Reuse a loaded skill
within the same session; after replacement/context loss read it again. If a required
skill is missing, preserve work and report the prerequisite instead of claiming the
stage completed, silently using a substitute or installing skills.

These are explicit one-shot modes, not unrestricted invocations of the standalone
workflows. Include the mode in Designer's assignment before it reads the skill:

- **Proxy grilling:** Coordinator is the interviewee. Work through dependent decisions,
  investigate discoverable facts, and ask recommended questions of the proxy. Batch
  only independent questions; wait for prerequisite answers before dependent ones.
  Do not interview the human directly or manufacture questions to fill a round.
- **Domain-aware grilling:** also consult existing glossary/context maps and ADRs;
  challenge conflicting or vague terms with concrete scenarios. Record resolved
  terminology and ADR changes in canonical domain drafts, with pending choices
  isolated in `review.md`. Do not edit formal destinations before approval; apply
  approved drafts during local delivery. Proxy agreement remains provisional.
- **Draft-only synthesis:** use to-spec's problem, solution, user stories,
  implementation/testing decisions, exclusions and notes. Resolve testing seams
  through the proxy during design; do not re-interview for settled choices. Keep
  stories proportional, not an artificial minimum or exhaustive list. Do not run
  setup/install flows, publish an issue or apply `ready-for-agent` during synthesis.
  Publication belongs solely to Coordinator's authorized `publish` stage.

Honor higher-priority restrictions. If the available skill cannot be used in the
specified mode under those restrictions, report the incompatibility rather than
pretending to have executed it.
