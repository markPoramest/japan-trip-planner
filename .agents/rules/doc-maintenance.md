# Documentation Maintenance Enforcement

## Mandatory Rule
Every time any code is fixed, refactored, created, or modified in this repository:
1. **Always Update Root Documentation**: Check and update [AGENTS.md](../../AGENTS.md) and [GEMINI.md](../../GEMINI.md) to keep architecture, routes, components, and server actions documented accurately.
2. **Always Update References**: If modifying the Substitute Plans system, Hotel Dates engine, i18n dictionaries, export logic, or database schema, update the corresponding document under [.agents/skills/japan-trip-planner/references/](../skills/japan-trip-planner/references/).
3. **No Code Without Docs**: Never complete a turn that modified code without confirming that the markdown documentation is in sync.
4. **Portability Rule**: Always use relative paths for markdown links. Never hardcode machine-specific absolute paths.
