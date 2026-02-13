/**
 * user command group
 *   user me  — show the bot user for the current integration token
 */

import { Command } from "commander";
import { createNotionClient } from "../src/postman/notion-api/index.js";
import { getBearerToken } from "../helpers.js";

// -- user me ------------------------------------------------------------------

const userMeCommand = new Command("me")
  .description("Show the bot user for your integration token")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .addHelpText(
    "after",
    `
Details:
  Fetches the bot user associated with the current API token.
  Useful for verifying your token works and checking which
  workspace the integration belongs to.

Examples:
  $ notion-cli user me
  $ notion-cli user me --raw
`,
  )
  .action(async (options: { raw?: boolean }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    try {
      const user = await notion.users.me();

      if (options.raw) {
        console.log(JSON.stringify(user, null, 2));
        return;
      }

      console.log(`Name: ${user.name || "(unnamed)"}`);
      console.log(`ID: ${user.id}`);
      console.log(`Type: ${user.type}`);
      if (user.bot) {
        if (user.bot.workspace_name) {
          console.log(`Workspace: ${user.bot.workspace_name}`);
        }
        if (user.bot.owner) {
          const owner = user.bot.owner;
          if (owner.type === "workspace") {
            console.log(`Owner: workspace`);
          } else if (owner.type === "user" && owner.user) {
            const ownerName = owner.user.name || owner.user.id;
            const ownerEmail = owner.user.person?.email;
            console.log(`Owner: ${ownerName}${ownerEmail ? ` (${ownerEmail})` : ""}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- user get -----------------------------------------------------------------

const userGetCommand = new Command("get")
  .description("Retrieve a user by ID")
  .argument("<user-id>", "the ID of the user to retrieve")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .addHelpText(
    "after",
    `
Details:
  Fetches a user object (person or bot) by ID.

Examples:
  $ notion-cli user get 6794760a-1f15-45cd-9c65-0dfe42f5135a
  $ notion-cli user get <user-id> --raw
`,
  )
  .action(async (userId: string, options: { raw?: boolean }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    try {
      const user = await notion.users.retrieve(userId);

      if (options.raw) {
        console.log(JSON.stringify(user, null, 2));
        return;
      }

      console.log(`Name: ${user.name || "(unnamed)"}`);
      console.log(`ID: ${user.id}`);
      console.log(`Type: ${user.type}`);
      if (user.type === "person" && user.person?.email) {
        console.log(`Email: ${user.person.email}`);
      }
      if (user.type === "bot" && user.bot) {
        if (user.bot.workspace_name) {
          console.log(`Workspace: ${user.bot.workspace_name}`);
        }
        if (user.bot.owner) {
          const owner = user.bot.owner;
          if (owner.type === "workspace") {
            console.log(`Owner: workspace`);
          } else if (owner.type === "user" && owner.user) {
            const ownerName = owner.user.name || owner.user.id;
            const ownerEmail = owner.user.person?.email;
            console.log(`Owner: ${ownerName}${ownerEmail ? ` (${ownerEmail})` : ""}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- user list ----------------------------------------------------------------

const userListCommand = new Command("list")
  .description("List all users in the workspace")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .option("-c, --cursor <cursor>", "pagination cursor from a previous list")
  .option("-n, --limit <number>", "max results per page, 1-100", "100")
  .addHelpText(
    "after",
    `
Details:
  Returns a paginated list of all users (people and bots) in the workspace.

Examples:
  $ notion-cli user list
  $ notion-cli user list --raw
  $ notion-cli user list -n 10
  $ notion-cli user list --cursor <cursor>
`,
  )
  .action(async (options: { raw?: boolean; cursor?: string; limit: string }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);
    const pageSize = Math.min(parseInt(options.limit, 10) || 100, 100);

    try {
      const response = await notion.users.list({
        start_cursor: options.cursor,
        page_size: pageSize,
      });

      if (options.raw) {
        console.log(JSON.stringify(response, null, 2));
        return;
      }

      if (response.results.length === 0) {
        console.log("No users found.");
        return;
      }

      console.log(`Found ${response.results.length} user(s):\n`);

      for (const user of response.results) {
        const icon = user.type === "bot" ? "🤖" : "👤";
        console.log(`  ${icon} ${user.name || "(unnamed)"}`);
        console.log(`     ID: ${user.id}`);
        console.log(`     Type: ${user.type}`);
        if (user.type === "person" && user.person?.email) {
          console.log(`     Email: ${user.person.email}`);
        }
        if (user.type === "bot" && user.bot) {
          if (user.bot.workspace_name) {
            console.log(`     Workspace: ${user.bot.workspace_name}`);
          }
          if (user.bot.owner) {
            const owner = user.bot.owner;
            if (owner.type === "workspace") {
              console.log(`     Owner: workspace`);
            } else if (owner.type === "user" && owner.user) {
              const ownerName = owner.user.name || owner.user.id;
              const ownerEmail = owner.user.person?.email;
              console.log(`     Owner: ${ownerName}${ownerEmail ? ` (${ownerEmail})` : ""}`);
            }
          }
        }
        console.log();
      }

      if (response.has_more && response.next_cursor) {
        console.log(`📑 More results available. Use --cursor to get next page:`);
        console.log(`   notion-cli user list --cursor ${response.next_cursor}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- user command group -------------------------------------------------------

export const userCommand = new Command("user")
  .description("View Notion users and bot info")
  .addCommand(userMeCommand)
  .addCommand(userGetCommand)
  .addCommand(userListCommand);
