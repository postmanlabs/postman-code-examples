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

Mapping a Workspace:
  To build a complete tree of a Notion workspace, follow this workflow:

  Step 1 – Find root pages:
    $ notion-cli search --workspace

  Step 2 – Read each root page:
    $ notion-cli page <page-id>
    Look for child pages (📄) and child databases (🗃️) in the output.

  Step 3 – Query each database:
    $ notion-cli database <database-id>

  Step 4 – Recurse into child pages and repeat Step 2.

  Key points:
    • Start from roots: search --workspace finds your starting points
    • One page at a time: the page command lists children but doesn't traverse them
    • Databases are separate: use the database command to list entries
    • IDs are in output: every child shows its ID for easy extraction

Output:
  All commands output human-readable text by default.
  Use --raw on page and database for JSON output.

Performance:
  • Block fetching uses parallel API calls for speed
  • Large pages (100+ blocks) may take 5-15 seconds
  • Database queries are fast (single API call)
  • search --workspace paginates internally (may take a few seconds)
`,
  );

program.addCommand(setTokenCommand);
program.addCommand(searchCommand);
program.addCommand(pageCommand);
program.addCommand(databaseCommand);

program.parse();
