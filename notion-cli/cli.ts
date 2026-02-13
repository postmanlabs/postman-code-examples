#!/usr/bin/env node
/**
 * Notion CLI
 *
 * A CLI tool for searching and navigating a Notion workspace. Designed to be
 * used by AI agents to explore and read content from Notion.
 */

import { Command } from "commander";
import { authInternalCommand } from "./commands/auth-internal.js";
import { authPublicCommand } from "./commands/auth-public.js";
import { setTokenCommand } from "./commands/set-token.js";
import { searchCommand } from "./commands/search.js";
import { pageCommand } from "./commands/page.js";
import { databaseCommand } from "./commands/database.js";
import { datasourceCommand } from "./commands/datasource.js";
import { userCommand } from "./commands/user.js";
import { blockCommand } from "./commands/block.js";
import { commentCommand } from "./commands/comment.js";
import { fileCommand } from "./commands/file.js";
import { integrationCommand } from "./commands/integration.js";
import { docsCommand } from "./commands/docs.js";

const program = new Command();

program
  .name("notion-cli")
  .description("Explore and read content from a Notion workspace")
  .version("1.0.0")
  .addHelpText(
    "after",
    `
Run "notion-cli docs" for setup instructions, workspace mapping workflow, and usage guides.
`,
  );

program.addCommand(authInternalCommand);
program.addCommand(authPublicCommand);
// Kept for backwards compatibility; prefer "auth-internal set"
program.addCommand(setTokenCommand, { hidden: true });
program.addCommand(searchCommand);
program.addCommand(pageCommand);
program.addCommand(databaseCommand);
program.addCommand(datasourceCommand);
program.addCommand(blockCommand);
program.addCommand(commentCommand);
program.addCommand(fileCommand);
program.addCommand(userCommand);
program.addCommand(integrationCommand);
program.addCommand(docsCommand);

program.parse();
