# Connector Mock Plan Skill Sample Output

Run the smoke command to produce the current fixture report:

```bash
npm run smoke
```

```markdown
# Connector Mock Plan

Risk: review

## Findings
- Connector: example-crm
- Capabilities: search_contacts, create_note
- Actions: Not found
- Limits: Present

## Warnings
- Review term: write
- Review term: sideEffect

## Next Steps
- Review warnings before reuse
- Confirm fixture coverage
- Keep external side effects behind approval
```
