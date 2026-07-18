# Versioning And Change Control

SignalOS uses Semantic Versioning for product releases:

- `MAJOR`: incompatible model contracts, stored data, or public API behavior.
- `MINOR`: a new source, market family, analyst capability, or public module API.
- `PATCH`: compatible fixes, copy corrections, tests, and operational hardening.

The root `package.json` is the canonical current version. Release tags use the
same number with a `v` prefix, for example `v0.2.0`.

## Change Workflow

1. Open a scoped issue with acceptance criteria and module ownership.
2. Create a branch named `type/short-description` (`feat/`, `fix/`, `docs/`,
   `refactor/`, or `chore/`). Agent branches may use the `codex/` or `claude/`
   prefix required by their environment.
3. Keep commits single-purpose and use Conventional Commit subjects, such as
   `feat(intelligence): add source clustering`.
4. Add a short entry under `Unreleased` in `CHANGELOG.md` for product behavior,
   public contracts, data assumptions, or operator workflow changes.
5. Open a pull request. CI must pass `npm run validate` before merge.
6. For a release, move `Unreleased` entries into a dated version section, bump
   the package version, merge, and create the matching Git tag.

## Stability Contract

The public TypeScript contracts are the four `apps/web/src/modules/*/index.ts`
files. Internal files may change without a release-level API promise. Changes to
an exported name or its meaning must be called out in the changelog.

Runtime data and generated artifacts are not source modules. Keep local state,
build output, screenshots, downloaded pages, and model output out of commits
unless a scoped issue explicitly treats them as versioned fixtures.
