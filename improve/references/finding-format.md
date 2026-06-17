# Finding Format

Use this only when a plan starts from an observed problem, audit result, refactor opportunity, migration concern, or product direction suggestion.

A finding is only useful if it has evidence. Avoid vibes-only findings.

## Format

```markdown
### [CATEGORY-NN] <Short imperative title>

- **Evidence**: 2–5 strongest `path:line` facts. Include what is present there, not speculation.
- **Impact**: What breaks, slows down, becomes risky, or costs maintenance time.
- **Effort**: S | M | L — implementation and tests included.
- **Risk**: LOW | MED | HIGH — what the fix could break.
- **Confidence**: HIGH | MED | LOW — why the evidence is strong or uncertain.
- **Fix sketch**: 1–3 sentences. Not the full plan; enough to judge approach and effort.
```

## Vetting Rules

Before turning a finding into a plan:

1. Re-open cited files yourself.
2. Confirm evidence and line references.
3. Remove duplicates.
4. Distinguish true issues from deliberate documented tradeoffs.
5. Use LOW-confidence items for investigation plans, not direct fix plans.
6. If credentials are found, record only location and credential type; never copy values.

## Prioritization

Order by leverage: impact divided by effort, adjusted by confidence and fix risk.

Tiebreakers:

1. Security or data correctness impact.
2. Verification baselines or characterization tests that unblock other work.
3. Clear verification story for the executor.
4. Lower implementation risk.

"Not worth doing" is a valid outcome. Record rejected findings with a one-line rationale so they are not repeatedly rediscovered.
