# Changelog

## [Unreleased]

- Reject malformed JSON-shaped manifests while preserving plain-text input,
  and recognize exact structured `permission denied` review values.
- Warn when JSON manifests omit connector, capability/action, or limit evidence.
- Analyze JSON manifests structurally and avoid warnings from incidental prose.
- Analyze action-shaped manifest entries for hazardous names, effects,
  permissions, and explicit side effects while reporting action names.
- Validate CLI options and support explicit Markdown or JSON format values.
- Add release-readiness checks for package metadata, pack contents, and CI verification.
## 0.1.0

- Initial public release candidate with local CLI, fixtures, tests, and skill documentation.
