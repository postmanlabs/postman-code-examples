/**
 * docs command - display guides and workflows for using the CLI
 */

import { Command } from "commander";

const DOCS = `
NOTION CLI — DOCUMENTATION
===========================

AUTHENTICATION
--------------

Two auth methods are supported:

  Internal integration (recommended for personal use):
    1. Create an integration at https://www.notion.so/my-integrations
    2. Choose "Internal", enable "Read content" capability
    3. Copy the "Internal Integration Secret"
    4. Run: notion-cli auth-internal set

  Public integration (OAuth — for multi-user apps):
    1. Create a "Public" integration at https://www.notion.so/my-integrations
    2. Set redirect URI to http://localhost:8787/callback
    3. Run: notion-cli auth-public setup   (saves client ID + secret)
    4. Run: notion-cli auth-public login   (opens browser for authorization)

  After authenticating, share pages with your integration in Notion:
    Open a page → ••• menu → Add connections → select your integration.
    Share a top-level page to give access to all its children.

  Token is stored in ~/.notion-cli/config.json. The NOTION_TOKEN
  environment variable takes precedence over the stored token.

MAPPING A WORKSPACE
-------------------

The Notion API doesn't have a "list all pages" endpoint. To map a
workspace, start from the roots and traverse down:

  Step 1 — Find root pages:
    $ notion-cli integration pages

  Step 2 — Read each root page:
    $ notion-cli page get <page-id>
    Look for child pages (📄) and child databases (🗃️) in the output.

  Step 3 — For each child database, view its schema then query entries:
    $ notion-cli database get <database-id>
    Use the data source ID from the output:
    $ notion-cli datasource query <datasource-id>

  Step 4 — Read child pages and database entries:
    $ notion-cli page get <page-id>

  Repeat steps 2–4 to traverse the full tree.

Key points:
  • Start from roots — integration pages finds all entry points
  • One page at a time — page get shows children but doesn't recurse into them
  • Databases have two layers — database (metadata) and data source (schema + entries)
  • IDs are in the output — every child shows its ID for navigation

WRITING CONTENT
---------------

  Create pages:       page create <parent-id> --title "My Page"
  Update pages:       page update <id> --title "New" -s "Status:select:Done"
  Append blocks:      block append <page-id> "text" --type heading_2
  Update blocks:      block update <block-id> "new text" --color blue
  Delete blocks:      block delete <block-id>
  Add comments:       comment add <page-id> "comment text"
  Reply to threads:   comment reply <discussion-id> "reply text"
  Upload files:       file upload ./file.pdf
  Move pages:         page move <id> --parent <new-parent-id>
  Archive pages:      page archive <id>
  Create databases:   database create <parent-id> --title "Tracker"
  Manage schema:      datasource update <id> -p "Column:type"

  page update --set accepts "Name:type:value" properties:
    rich_text, number, select, multi_select, date, checkbox,
    url, email, phone_number

  block append --type supports:
    paragraph, heading_1, heading_2, heading_3, callout, quote, divider,
    code, bookmark, to_do, bulleted_list_item, numbered_list_item,
    table_of_contents

  Use --json for complex structures (tables, toggles with children, columns).

COMMENTS — LIMITATIONS
----------------------

  • The Notion API only returns unresolved comments
  • comment add creates top-level page comments only
  • comment reply can respond to existing threads (including inline)
  • "Read comments" and "Insert comments" capabilities must be enabled
    in the integration dashboard — they are off by default

OUTPUT & PERFORMANCE
--------------------

All commands output human-readable, token-efficient text by default.
Use --raw (-r) on most commands for full JSON output — only use this
when you need fields not shown in the default view.

When more results are available, pagination hints appear in the output
with the --cursor value for the next page.

Run "notion-cli <command> --help" for detailed usage and examples on
any subcommand.

  • Block fetching uses parallel API calls for speed
  • Large pages (100+ blocks) may take 5–15 seconds
  • Data source queries are fast (single API call)
  • integration pages paginates internally (may take a few seconds)
`.trimStart();

export const docsCommand = new Command("docs")
  .description("Show guides and workflows for using the CLI")
  .action(() => {
    process.stdout.write(DOCS);
  });
