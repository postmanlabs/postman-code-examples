# Agent Guidelines for notion-cli

## Notion API Version

Always use `2025-09-03` when making direct Notion API calls. This is the version the CLI uses (defined in `src/postman/notion-api/shared/variables.ts`). When writing scripts, tests, or debugging with `fetch()`, use `Notion-Version: 2025-09-03` — not the older `2022-06-28`.

Before making changes, verify the version in `src/postman/notion-api/shared/variables.ts` matches `2025-09-03`.
