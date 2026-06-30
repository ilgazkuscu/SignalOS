# Wording Risk

## Purpose

This market is resolution-language sensitive. Wording risk captures the chance that reality does not convert into qualifying settlement language.

## Logic

The current wording model checks for:

- ambiguous pause / ceasefire language
- readiness / retaliation language
- explicit operations-concluded language
- missing operations-specific wording

## Formulas

\[
\text{WordingDowngrade}
=
\text{WordingRiskScore}
\times 0.35
\]

## Limitations

- Keyword and pattern based
- No legal-resolution precedent database yet

## Next improvements

- add human-labeled statement examples
- add precedent library
- add speaker/officialness attribution
