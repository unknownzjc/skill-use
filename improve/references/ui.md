# UI Interaction Contract

Read this only when a plan changes user-facing UI, settings, forms, dialogs, navigation, visible state, or interaction behavior.

Use this decision order:

1. Existing matching repository pattern.
2. Project design system, UI playbook, and documented product rules.
3. Safe, reversible UX default.
4. One focused user question only when semantics remain uncertain and the choice risks data loss, security/privacy, irreversible behavior, billing/permissions, or product meaning.

For non-trivial UI work, add a concise `## UI interaction contract` section covering the six areas below. A trivial copy or presentation-only change may omit the section if the plan states why no interaction contract changes.

## 1. Entry

- User goal and observable success.
- Entry point and placement: page, dialog, tab, menu, inline area, or workflow step.
- Visibility gates: permissions, feature flags, environment, role, or required data.

## 2. State

- Source of truth and initial load behavior.
- Draft versus persisted state, including what marks the UI dirty.
- Save, cancel, reset, close, reload, refetch, and cache-invalidation behavior.
- Dependent-field rules: recompute options, preserve valid values, and explicitly reset, migrate, or confirm invalid values.
- Stale request, optimistic update, cancellation, and cross-view synchronization behavior when applicable.

Never silently delete persisted data before save. If a context change makes stored data invalid or unsafe, choose and document one migration, reset, preservation, or confirmation rule.

## 3. Inputs

- Controls and options, following the nearest repository pattern and design-system component.
- Finite, dynamic, searchable, custom, free-form, boolean, and sensitive-value behavior.
- Validation timing, error placement, allowed empty values, and dependent inputs.
- Empty option lists and saved values absent from the current option list.

Do not prescribe a new control convention when the repository already has one. Preserve an unknown current value unless the product contract explicitly replaces or migrates it.

## 4. Feedback

Specify applicable states and transitions:

- Loading and empty.
- Validation and fetch failure.
- Disabled or read-only, including an explanation when the reason is not obvious.
- Saving or submitting.
- Success, failure, long-running, and optimistic-update rollback.

Use a small state table only when transitions are non-trivial.

## 5. Compatibility

- Missing, legacy, and unknown values: preserve, migrate, ignore, or clean on save.
- Data-loss prevention when changing context, type, parent selection, or workflow state.
- Sensitive values: masking, explicit clearing, and whether unchanged secrets are omitted or represented by a repository-defined sentinel.
- Public API, persisted-data, permission, and rollout compatibility.

Masked display text must never be resubmitted as a real secret.

## 6. UX quality and verification

- Product terminology, labels, helper text, and actionable errors.
- i18n location and keys for every new user-visible string.
- Accessible names, field-error association, focus management, keyboard operation, and disabled-state explanation.
- Existing component, test, story, or screen used as the implementation pattern.
- Automated behavior tests where the repository supports them.
- Manual smoke path: enter the UI, load persisted state, complete the primary flow, exercise one relevant edge/error state, save, reload, and confirm persistence plus keyboard/focus basics.

## Plan quality check

Before delivery, confirm the plan:

- Covers all applicable areas above without copying irrelevant boilerplate.
- Resolves dependent-state and compatibility behavior rather than leaving choices to the executor.
- Uses repository evidence for controls, state management, copy, i18n, and accessibility.
- Includes observable automated or manual verification.
- Converts any unresolved high-risk product or data decision into a focused question or project-specific stop condition.
