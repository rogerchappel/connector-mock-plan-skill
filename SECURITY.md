# Security Policy

## Supported Versions

The current `0.1.x` release-candidate line receives security fixes.

## Reporting a Vulnerability

Please report suspected vulnerabilities privately through GitHub security
advisories for this repository. Include the connector manifest fixture and exact
CLI command needed to reproduce the issue when possible.

## Safety Model

`connector-mock-plan-skill` reads local connector manifests and writes generated
plans to stdout. It does not call connector APIs, approve actions, publish data,
or mutate external systems. Review generated plans before using them in any
workflow that can trigger external side effects.
