#!/usr/bin/env node
/**
 * Notion CLI
 *
 * A CLI tool for searching and navigating a Notion workspace. Designed to be
 * used by AI agents to explore and read content from Notion.
 */

import { Command } from "commander";
import { setTokenCommand } from "./commands/set-token.js";
import { searchCommand } from "./commands/search.js";
import { pageCommand } from "./commands/page.js";
import { databaseCommand } from "./commands/database.js";

const program = new Command();

program
  .name("notion-cli")
  .description("Explore and read content from a Notion workspace")
  .version("1.0.0")
  .addHelpText(
    "after",
    `
Setup:
  1. Create a Notion integration at https://www.notion.so/my-integrations
  2. Save your token:  notion-cli set-token <your-secret>
  3. Share pages/databases with your integration in Notion

Commands:
  search                          Search for pages and databases
  page get <page-id>              Read a page's content and properties
  database get <database-id>      View a database's metadata and schema
  database list <database-id>     List entries in a database

Mapping a Workspace:
  To build a complete tree of a Notion workspace, follow this workflow:

  Step 1 – Find root pages:
    $ notion-cli search --workspace

  Step 2 – Read each root page:
    $ notion-cli page get <page-id>
    Look for child pages (📄) and child databases (🗃️) in the output.

  Step 3 – View a database's schema:
    $ notion-cli database get <database-id>

  Step 4 – List entries in a database:
    $ notion-cli database list <database-id>

  Step 5 – Read an entry or child page:
    $ notion-cli page get <page-id>

  Repeat steps 2-5 to traverse the tree.

  Key points:
    • Start from roots: search --workspace finds your starting points
    • One page at a time: page get lists children but doesn't traverse them
    • Databases have two views: schema (get) and entries (list)
    • IDs are in output: every child shows its ID for easy extraction

Output:
  All commands output human-readable text by default.
  Use --raw on page get and database get/list for JSON output.

Performance:
  • Block fetching uses parallel API calls for speed
  • Large pages (100+ blocks) may take 5-15 seconds
  • Database list queries are fast (single API call)
  • search --workspace paginates internally (may take a few seconds)
`,
  );

program.addCommand(setTokenCommand);
program.addCommand(searchCommand);
program.addCommand(pageCommand);
program.addCommand(databaseCommand);

program.parse();
