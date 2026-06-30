# Codex prompt — calculator-suite design pass

You are redesigning a suite of calculators in this repo. Apply this philosophy consistently:

> Match design complexity to operation complexity.
> - A simple operation deserves a simple UI: one or two inputs, one primary result, no chart.
> - A sophisticated operation — anything whose output evolves over a variable like time, rate, or iteration count — deserves a graph, because the curve is the answer.
> - A graph is a cost, not a freebie. It adds visual load, render time, and a legend the user has to parse. Only add one if it makes the finding *easier* to read than a single number or a small table.

Do not write code until you have finished the ranking and design pass below.

## Step 1 — enumerate

List every calculator in the repo. For each, record:
- name
- inputs (count and type)
- primary output (single scalar, list, or trajectory)
- whether the answer has a natural independent variable (time, rate, principal, iteration) the user would want to sweep

## Step 2 — rank by sophistication

Score each calculator 1–5 on sophistication:

1. Pure arithmetic on 1–2 inputs, single scalar output. (e.g. tip, percentage, unit conversion, BMI)
2. Arithmetic on 3–5 inputs, single scalar output. (e.g. loan monthly payment, sales tax, markup)
3. Multi-input formula that produces a small breakdown — 2–8 related numbers. (e.g. paycheck take-home with tax brackets, macro split)
4. Output evolves over an independent variable and a trajectory is meaningful. (e.g. compound interest over years, mortgage amortization, retirement drawdown, cooling curve)
5. Output is a multi-series trajectory or responds nonlinearly to inputs such that comparison across scenarios is the point. (e.g. 15-vs-30 yr mortgage side-by-side, Monte Carlo retirement, portfolio glidepath)

Report the full list sorted by score.

## Step 3 — decide graph / no graph per calculator

For each calculator, answer these in order and stop at the first NO:

1. Does the output have a natural independent variable with more than ~4 meaningful data points?
2. Does reading the shape of the curve change what the user would do (vs. reading the endpoint number)?
3. Is the curve nontrivial — i.e. not a straight line the user could infer from the endpoint?

All three YES → add a graph. Otherwise → no graph. Show the number, or a small table of 2–6 rows. Do not add a chart "for polish."

Also flag the anti-patterns and reject them:
- A pie chart for two categories. (Use two numbers.)
- A bar chart for one value. (Use the number.)
- A line chart with 2–3 points. (Use a table row.)
- A dual-axis chart where both axes represent the same unit. (Use one axis.)

## Step 4 — per-calculator design spec

For every calculator, output a short design spec in this exact shape:

```
### <calculator name>
Sophistication: <1–5>
Graph: <none | line | stacked area | small multiples | other, name it>
Graph justification: <one sentence, or "n/a — single number answer">
Layout:
  - Inputs: <list>
  - Primary result: <the one number or headline the user came for>
  - Secondary: <optional breakdown table, 2–6 rows>
  - Chart area: <only if Graph ≠ none; describe x, y, series>
Mobile rule: <what collapses or stacks on <640px>
```

Keep the spec tight. Do not design controls, colors, or copy — only layout and whether a graph belongs.

## Step 5 — flag inconsistencies

Before finishing, list any calculator where the current implementation violates the philosophy (has a graph when it shouldn't, or lacks one when the user would benefit). Name the file path for each. Do not fix them in this pass — just list.

## Deliverable

A single markdown document with:
1. The ranked table from Step 2.
2. One design-spec block per calculator from Step 4.
3. The inconsistency list from Step 5.

Do not modify any calculator code in this pass. Implementation happens in a follow-up once the design passes review.
