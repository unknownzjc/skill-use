# UI Interaction Contract

Use this reference when a plan changes user-facing UI, settings screens, forms, dialogs, navigation, visible state, or interaction behavior. The goal is to let the agent make high-quality UI decisions from project context while asking the user only for high-risk product or data semantics.

A UI plan should not only say which components to edit. It must describe the contract between user intent, visible controls, data/state, feedback, compatibility, and verification.

## Operating principle

Do not ask the user to fill in routine UI details. First infer them from the repo, then from project UI rules, then from general UX defaults. Ask only when a decision is both uncertain and high risk.

Decision priority:

1. Existing matching UI in the repo — follow it.
2. Project UI playbook or documented design rules — follow them.
3. Established UX default — use it and document the assumption.
4. Low-risk ambiguity — choose the safest reversible default.
5. High-risk product/data/security ambiguity — ask one focused question.

Ask the user only for decisions that can materially affect product meaning, data loss, security, privacy, irreversible behavior, or externally visible API/contract semantics.

## Recon for UI work

Before writing a UI plan, inspect enough of the repo to identify:

- Existing screens, dialogs, forms, tabs, menus, and settings surfaces near the requested change.
- Design-system components and their preferred usage.
- State management patterns: local draft, global store, URL state, server state, cache invalidation, refetch behavior.
- API client and error/loading patterns.
- Validation and save/cancel/reset patterns.
- i18n dictionaries, naming conventions, and product terminology.
- Accessibility conventions: labels, focus management, keyboard paths, disabled state explanations.
- Tests or stories that encode expected user behavior.
- Any project UI playbook, design doc, ADR, or product spec.

Prefer repo-consistent choices over generic UI advice.

## UI Interaction Contract section

For any UI-facing plan, add a `## UI Interaction Contract` section. Keep it concise, but make these decisions explicit:

### User goal and success

- What user task does this UI enable?
- What is true when the user succeeds?
- How does the user know the action worked?

### Entry and placement

- Where does the user enter this UI?
- Is this a page, dialog, tab, menu action, inline section, wizard, or advanced panel?
- Is visibility gated by permissions, feature flags, environment, user role, data availability, or another project-defined condition?

### Data and state model

- What is the source of truth: server, settings file, local storage, URL, global store, props, or derived data?
- How is initial data loaded?
- Is there local draft state distinct from persisted state?
- What counts as dirty state?
- What happens on save, cancel, reset, refetch, close, and reload?
- Which other UI areas must observe the change?

### Controls and input model

- Which controls are used and why: input, select, combobox, radio, switch, checkbox, tabs, table, tree, etc.?
- Are values finite, dynamic, searchable, custom, or free-form?
- What happens when option lists are empty?
- What happens when the currently saved value is not in the current option list?

Default control policy:

- Finite known values: Select, Radio, or Segmented Control.
- Finite but large/searchable values: Combobox.
- Known suggestions plus custom values: Combobox with custom value support.
- Truly open-ended values: Input.
- Boolean setting with explicit save: Checkbox or Switch according to project convention.
- Boolean setting that applies immediately: Switch only if immediate effect is safe and expected.

### Dependency and lifecycle rules

For dependent fields, specify parent-child behavior:

- Which fields recompute other fields or option lists?
- When a parent changes, is the child preserved, reset, cleared, disabled, or converted to a fallback?
- If a current child value becomes invalid, is it shown as an unknown/custom current value or reset to default?
- Are stale requests canceled or ignored?
- Does changing a parent selection, type, category, or workflow context remove stale state, preserve it, or require confirmation?

Default dependency policy:

- Recompute dependent options when the parent changes.
- Preserve a dependent value only if it remains valid.
- Otherwise reset to the safest explicit fallback, such as the product's no-override state or an empty draft.
- Do not silently delete persisted data until the user saves.
- If a context change makes previously saved dependent data invalid, misleading, or unsafe, specify whether to preserve, reset, migrate, or remove that stale data on save.

### Feedback states

Include behavior for:

- Initial loading.
- Empty data or empty options.
- Validation errors.
- Fetch errors.
- Saving/submitting.
- Save success.
- Save failure.
- Disabled/read-only states.
- Long-running or optimistic updates, if relevant.

Use a small state table when the behavior is non-trivial.

### Existing data compatibility

- How are missing fields handled?
- How are unknown old values shown?
- Are legacy fields migrated, preserved, ignored, or cleaned on save?
- Are sensitive values or credentials masked?
- Can masked values be resubmitted, or only new user-entered values?
- What prevents accidental data loss?

Default compatibility policy:

- Preserve unknown values unless the user explicitly replaces them.
- Show unknown current values rather than silently dropping them.
- Masked sensitive values must never be sent back as real values.
- Clearing a sensitive value should be explicit.
- Context changes that make old dependent data invalid, misleading, or unsafe must preserve, reset, migrate, or remove that data according to an explicit plan rule.

### Copy, terminology, and i18n

- Which labels, option names, helper text, empty/error messages, and success messages are user-visible?
- Are strings added to the project’s i18n system?
- Are labels product terms rather than internal field names?
- Are errors actionable?

Default copy policy:

- Prefer concise product terms over implementation names.
- Use a concise, domain-appropriate label for “no explicit override” or “system chosen value”; prefer the existing project term when one exists.
- Avoid showing internal key names as user-facing labels unless this is a developer tool and existing UI does so.

### Accessibility and keyboard behavior

- Every input/control has a visible label or equivalent accessible name.
- Errors are associated with fields where possible.
- Dialogs preserve existing focus management.
- Keyboard users can reach and operate the main path.
- Disabled controls have visible explanation when the reason is not obvious.

### Manual smoke checklist

Add concrete steps a reviewer can perform without reading this conversation:

- Open the UI from the entry point.
- Confirm initial persisted values load correctly.
- Exercise the primary happy path.
- Exercise dependency changes and invalid/empty option behavior.
- Exercise save success and reload persistence.
- Exercise validation or save failure if feasible.
- Confirm i18n/copy and keyboard basics for the touched UI.

## Open decision policy

Do not ask a large multi-part UI questionnaire. Instead, list only unresolved decisions that are both important and risky.

Use this format in the plan when decisions remain but are not blocking:

```markdown
## UI decision log

| Decision | Chosen default | Confidence | Risk | Reason |
|---|---|---|---|---|
| <decision> | <default> | high/medium/low | low/medium/high | <repo evidence or UX rule> |
```

Ask the user only when `risk=high` and `confidence` is not high. Ask exactly one focused question, provide 2–4 options, and recommend the safest default.

High-risk UI decisions include:

- Behavior that may delete, overwrite, leak, or misapply user data.
- Sensitive value or credential handling.
- Parent selection, context, mode, or type changes that alter saved data semantics or externally visible behavior.
- Public API or saved data shape changes.
- Irreversible actions or actions users reasonably expect to be reversible.
- Product terminology where the wrong label changes meaning.
- Permission, privacy, billing, or security visibility.

Low-risk UI decisions should be decided by repo convention or default policy, documented as assumptions, and covered by smoke checks.

## Plan integration checklist

Before finishing a UI plan, verify:

- The plan includes `## UI Interaction Contract` or explains why the UI change is trivial.
- Controls are justified by data shape and existing project patterns.
- Parent-child field dependencies are explicit.
- Loading, empty, error, disabled, saving, and success states are covered when relevant.
- Existing/legacy data behavior is explicit.
- User-visible copy and i18n are accounted for.
- Accessibility basics are included.
- Manual smoke checks cover the core interaction and at least one edge state.
- Any remaining product-level uncertainty is either asked, documented as a non-blocking assumption, or converted into a STOP condition.
