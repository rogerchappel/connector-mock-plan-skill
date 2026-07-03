# Connector Mock Plan Skill

## When To Use

Use this skill when an agent or connector developer has a local capability manifest and needs a fixture-backed mock coverage plan before touching a live account.

## Required Inputs

- A local Markdown, JSON, or text fixture.
- A clear intended output: Markdown report or JSON summary.
- Permission to read the local fixture.

## Side-Effect Boundaries

The CLI plans local mocks only. It must not call real connectors, create accounts, or perform live API requests.

## Approval Requirements

- No approval is needed for local fixture analysis.
- Human approval is required before copying generated material into public docs when the input may contain private context.
- Separate approval is required before any external send, publish, account write, or live connector call.

## Workflow

1. Run `connector-mock-plan <file>`.
2. Review warnings and missing fields.
3. Update the source fixture or plan if important evidence is absent.
4. Save or paste the report only after redaction review.
5. Run `npm test` and `npm run smoke` when changing the skill package.

## Examples

```bash
node bin/cli.js fixtures/connector-manifest.json
node bin/cli.js fixtures/connector-manifest.json --format=json
```

## Validation

- `npm test`
- `npm run check`
- `npm run smoke`
