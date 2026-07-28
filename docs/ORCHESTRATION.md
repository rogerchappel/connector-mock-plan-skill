# Orchestration

## Inputs

- Local fixture path.
- Optional `--format <markdown|json>` flag.

## Steps

1. Read the fixture from disk.
2. Parse JSON object manifests structurally, or use deterministic label
   extraction for non-JSON text.
3. Flag exact hazardous capability/effect values in JSON, or whole warning
   terms in the text fallback.
4. Emit Markdown or JSON to stdout.

## Failure Modes

- Missing file: CLI exits non-zero.
- Invalid options or formats: CLI exits with status 2.
- Missing fields: report uses `Not found`.
- Warning terms: report sets review/high risk but does not block output.
