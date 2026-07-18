# SignalOS Modules

SignalOS domain behavior is organized into four modules. Application routes, UI
features, and services should import from each module's `index.ts`, not from its
internal files.

| Module | Owns | Public import |
| --- | --- | --- |
| `belief` | priors, confidence, evidence updates, explanations | `@/modules/belief` |
| `markets` | market-family definitions and deterministic replay | `@/modules/markets` |
| `intelligence` | source normalization, clustering, and briefings | `@/modules/intelligence` |
| `thesis` | evidence ledger, scenarios, scoring, and decisions | `@/modules/thesis` |

Dependencies flow toward domain modules:

```text
routes / UI -> services -> modules -> shared types and utilities
```

Modules may use shared types and utilities. They must not import routes,
components, React features, or service composition code.
