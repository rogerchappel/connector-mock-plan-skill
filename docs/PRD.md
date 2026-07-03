# PRD: connector-mock-plan-skill

## Problem

Generate local mock plans from connector capability manifests. Agent workflows need small, inspectable artifacts that can be reviewed before reuse or approval.

## Users

- Agent builders.
- Skill authors.
- Maintainers reviewing local dry runs.

## Goals

- Provide a local-first CLI.
- Produce Markdown and JSON output.
- Include fixture-backed tests.
- Document side-effect boundaries in `SKILL.md`.

## Non-Goals

- Live external account writes.
- Publishing packages or releases automatically.
- Replacing human review.

## Success Criteria

- Fixture smoke command succeeds.
- Tests cover parser and warning behavior.
- README and skill docs explain safe use.
