# Repository Map

This map names the maintained paths and the dependency direction between them.

## Start Here

1. `README.md`: product purpose, local setup, routes, and validation.
2. `apps/web/src/modules/README.md`: the four domain boundaries.
3. `docs/data-flow.md`: how source evidence becomes a rendered belief update.
4. `docs/versioning.md`: branch, changelog, release, and public API rules.

## Maintained Surfaces

| Path | Owner | May depend on |
| --- | --- | --- |
| `apps/web/src/app` | routes and API handlers | features, services, public modules |
| `apps/web/src/features` | user workflows | components, services, public modules |
| `apps/web/src/components` | reusable UI | public modules, shared utilities |
| `apps/web/src/lib/api` | TypeScript composition root | modules, adapters, repositories |
| `apps/web/src/modules` | domain behavior | shared types, fixtures, utilities |
| `apps/web/src/lib` | infrastructure and shared code | modules only where composition requires it |
| `signalos` | Python intelligence runtime | Python providers and domain utilities |
| `tests` | contract and behavior verification | public APIs whenever possible |

## TypeScript Domain Modules

### Belief

Owns probability priors, evidence updates, confidence, weight profiles, and
human-readable driver explanations.

### Markets

Owns market-family definitions, deadlines, family registries, and time-safe
replay series. It may consume the Belief public API.

### Intelligence

Owns source URLs, coverage normalization, event clustering, summaries, and
brief generation. It does not own probability updates.

### Thesis

Owns evidence quality, feature extraction, hypotheses, scenarios, narrative,
and trade-decision construction. It does not fetch sources or render UI.

## Dependency Rule

```text
app / features / components
            |
        services
            |
 public module entry points
            |
 shared types / fixtures / utilities
```

Deep imports such as `@/modules/belief/confidence` are prohibited outside the
module. Add a deliberate export to that module's `index.ts` when a capability is
part of its public contract.

## Generated And Local State

Do not treat `.next`, `.vercel`, `node_modules`, local `.env` files,
`.projectzero` polling state, temporary screenshots, or downloaded article pages
as source modules. Version a generated artifact only when an issue explicitly
defines it as a fixture or research deliverable.
