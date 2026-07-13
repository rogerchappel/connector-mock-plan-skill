# Connector Mock Plan Skill

Generate local mock plans from connector capability manifests.

This is a local-first agent skill package. It reads local fixtures, produces reviewable Markdown or JSON, and keeps all external side effects out of scope.

## Quickstart

```bash
npm install
npm test
npm run smoke
node bin/cli.js fixtures/connector-manifest.json --format=json
```

## Verification

Run the same checks used for release-readiness before publishing or opening a release PR:

```bash
npm run check
npm test
npm run smoke
npm run release:check
npm pack --dry-run
```

## CLI

```bash
connector-mock-plan <file> [--format=json]
```

## Examples

```bash
node bin/cli.js fixtures/connector-manifest.json
node bin/cli.js fixtures/connector-manifest.json --format=json
```

## Release Verification

Run the full release gate before opening a release-facing pull request:

```bash
npm run release:check
```

The release gate runs the static checker, Node test suite, fixture-backed CLI
smoke, and `npm pack --dry-run` so the published package contents stay
reviewable. The package smoke step also verifies the skill file, release
candidate notes, sample output, contribution guide, security policy, changelog,
license, and README are present in the publishable tarball.

## Safety Notes

- Reads local files only.
- Does not call external services.
- Does not approve, publish, send, or write outside stdout.
- Treat warnings as review prompts, not perfect policy enforcement.

## Limitations

- V1 uses deterministic fixture parsing and conservative warning terms.
- It is designed for small local plans and run notes, not full transcript warehouses.
- Human review is still required before public reuse or external action.
## Development checks

Run the same local gates that CI runs before opening a PR:

```bash
npm run check --if-present
npm run build --if-present
npm test --if-present
npm run smoke --if-present
```
