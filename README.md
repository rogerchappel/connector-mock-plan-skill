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
connector-mock-plan <file> [--format <markdown|json>]
```

Markdown is the default. `--format=json` and the `--json` shorthand are also
supported. Unknown options, missing option values, and unsupported formats
produce an error and exit status 2.

Markdown findings always occupy one line per field. Line breaks in connector,
capability, and action values are rendered as spaces; JSON output preserves the
original string values.

## Examples

```bash
node bin/cli.js fixtures/connector-manifest.json
node bin/cli.js fixtures/connector-manifest.json --format json
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

## Input handling

- JSON object manifests are analyzed by structure. Connector, capability,
  action, and limit findings come from their corresponding fields. Capability
  and action arrays may contain strings or objects with `name` fields.
- A complete JSON plan has a non-empty connector, at least one named capability
  or action, and non-empty limits. Missing or empty required evidence (including
  an empty object manifest) produces explicit completeness warnings and cannot
  receive an unqualified `low` risk. JSON output exposes these messages in
  `warnings`; Markdown labels them `Incomplete manifest`.
- Warnings are limited to exact hazardous values in top-level `effects` and in
  capability/action `name`, `effect`, `permission`, `permissions`, or boolean
  `sideEffect` fields. Recognized values include `write`, `delete`, and
  `sideEffect`, including scoped names and permissions such as `contacts.delete`
  and `notes:write`. Descriptions, documentation, metadata, and incidental
  substrings such as `overwrite` do not create warnings.
- Non-JSON Markdown and text remain supported through a deterministic fallback.
  The fallback extracts known labels and matches warning terms on word
  boundaries, so incidental substrings such as `overwrite` are not warnings.

## Limitations

- The text fallback does not infer document structure beyond known labels.
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

## Release notes

Before tagging a release, confirm the smoke fixture still represents the intended workflow and summarize any changed output, limitations, or operator steps in the PR.
