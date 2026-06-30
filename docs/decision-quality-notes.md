# Decision Quality Notes

## Operation Probability Variables

The dashboard now includes a heuristic force-entry indicator panel. It looks for public/fixture observations related to:

- officer or senior-command concentration
- tanker bridge / aerial refueling tempo
- carrier or amphibious readiness posture
- dependent departure or embassy posture
- ISR orbit / surveillance tempo
- strategic command-aircraft movement
- munitions and logistics surge

These variables are intentionally caveated. They can indicate planning pressure or escalation readiness, but they can also reflect routine rotations, exercises, deterrence, or precautionary posture. They should influence attention and scenario analysis, not act as standalone proof.

## Source Provenance

Signal Hit-Rate Tracking now exposes the source IDs behind each family metric. This makes the descriptive hit-rate table easier to audit and prevents the UI from implying a source-free alpha score.

## What is inspectable
- TradeScore components
- EV per unit
- Wording risk flags
- Regime state rationale
- Portfolio concentration warnings
- Calibration data quality

## Remaining calibration gap
The app cannot yet prove edge. It can rank and explain decisions, but real edge requires storing historical decisions, market prices at decision time, outcomes, and realized PnL.

## Guardrails
- Simulated outputs are labeled.
- Source coverage links are clickable where available.
- Confidence is not treated as certainty.
