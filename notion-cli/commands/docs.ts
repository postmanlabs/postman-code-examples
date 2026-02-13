/**
 * docs command - display guides and workflows for using the CLI
 */

import { Command } from "commander";

const DOCS = `
NOTION CLI — DOCUMENTATION
===========================

SETUP
-----

1. Create a Notion integration at https://www.notion.so/my-integrations
2. Save your token:  notion-cli set-token
3. Share pages/databases with your integration in Notion

Your integration can only access pages that have been explicitly shared
with it. Share a top-level page to give access to all its children.

The token is stored in ~/.notion-cli/config.json. You can also set the
NOTION_TOKEN environment variable, which takes precedence.

MAPPING A WORKSPACE
-------------------

The Notion API doesn't have a "list all pages" endpoint. To build a
complete picture of a workspace, start from the roots and traverse down:

  Step 1 — Find root pages:
    $ notion-cli integration pages

  Step 2 — Read each root page:
    $ notion-cli page get <page-id>
    Look for child pages (📄) and child databases (🗃️) in the output.

  Step 3 — For each child database, view its schema then list entries:
    $ notion-cli database get <database-id>
    $ notion-cli database list <database-id>

  Step 4 — Read child pages and database entries:
    $ notion-cli page get <page-id>

  Repeat steps 2–4 to traverse the full tree.

Key points:
  • Start from roots — integration pages finds all entry points
  • One page at a time — page get shows children but doesn't recurse into them
  • Databases have two views — schema (get) and entries (list)
  • IDs are in the output — every child shows its ID for navigation

OUTPUT & PERFORMANCE
--------------------

All commands output human-readable text by default. Use --raw on most
commands for JSON output (useful for piping or programmatic access).

  • Block fetching uses parallel API calls for speed
  • Large pages (100+ blocks) may take 5–15 seconds
  • Database list queries are fast (single API call)
  • integration pages paginates internally (may take a few seconds)

AGENT USAGE
-----------

This CLI is designed to work well with AI coding agents. An agent can:

  1. Run "notion-cli docs" to understand available workflows
  2. Use "notion-cli integration pages" to discover entry points
  3. Navigate the workspace tree using page get and database list
  4. Use search to find specific content by keyword
  5. Use --raw for structured JSON when parsing output programmatically
`.trimStart();

export const docsCommand = new Command("docs")
  .description("Show guides and workflows for using the CLI")
  .action(() => {
    process.stdout.write(DOCS);
  });
