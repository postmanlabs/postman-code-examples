/**
 * database command group
 *   database get  <id>  — metadata and schema
 *   database list <id>  — paginated entries
 */

import { Command } from "commander";
import { notion, type DatabasePropertySchema } from "../src/postman/notion-api/index.js";
import { getBearerToken, getPageTitle, formatDate, formatPropertyValue } from "../helpers.js";

// -- database get -------------------------------------------------------------

const databaseGetCommand = new Command("get")
  .description("View a database's metadata and schema")
  .argument("<database-id>", "Notion database ID or URL")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .addHelpText(
    "after",
    `
Details:
  Fetches a single database and displays:
    • Metadata – title, ID, parent, created/edited dates, URL
    • Schema – property names and their types

  To list the entries in this database, use:
    $ notion-cli database list <database-id>

Examples:
  $ notion-cli database get 725a78f3-00bf-4dde-b207-d04530545c45
  $ notion-cli database get 725a78f3-00bf-4dde-b207-d04530545c45 --raw
`,
  )
  .action(async (databaseId: string, options: { raw?: boolean }) => {
    const bearerToken = getBearerToken();

    console.log(`🗃️ Fetching database...\n`);

    try {
      const database = await notion.databases.retrieve(databaseId, bearerToken, "2022-02-22");

      if (options.raw) {
        console.log(JSON.stringify(database, null, 2));
        return;
      }

      const title = database.title.map((t) => t.plain_text).join("") || "(Untitled)";

      const parent = database.parent;
      let parentInfo: string;
      if (parent.type === "page_id") {
        parentInfo = `page (ID: ${parent.page_id})`;
      } else if (parent.type === "block_id") {
        parentInfo = `block (ID: ${parent.block_id})`;
      } else {
        parentInfo = "workspace (top-level)";
      }

      console.log(`Title: ${title}`);
      console.log(`ID: ${database.id}`);
      console.log(`Parent: ${parentInfo}`);
      console.log(`Created: ${formatDate(database.created_time)}`);
      console.log(`Last edited: ${formatDate(database.last_edited_time)}`);
      console.log(`URL: ${database.url}`);

      const propEntries = Object.entries(database.properties);
      if (propEntries.length > 0) {
        console.log(`\nSchema (${propEntries.length} properties):`);
        for (const [name, prop] of propEntries) {
          const schema = prop as DatabasePropertySchema;
          console.log(`  ${name}: ${schema.type}`);
        }
      }

      console.log(`\nTo list entries: notion-cli database list ${databaseId}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- database list ------------------------------------------------------------

const databaseListCommand = new Command("list")
  .description("List entries in a database")
  .argument("<database-id>", "Notion database ID or URL")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .option("-n, --limit <number>", "max entries to return, 1-100", "20")
  .option("-c, --cursor <cursor>", "pagination cursor from a previous query")
  .addHelpText(
    "after",
    `
Details:
  Lists entries (rows) in a Notion database, with pagination.

  Each entry is a Notion page. To read an entry's full content
  and properties, use:
    $ notion-cli page get <entry-id>

  To view the database schema, use:
    $ notion-cli database get <database-id>

Examples:
  $ notion-cli database list 725a78f3-00bf-4dde-b207-d04530545c45
  $ notion-cli database list 725a78f3-00bf-4dde-b207-d04530545c45 --limit 50
  $ notion-cli database list 725a78f3-00bf-4dde-b207-d04530545c45 --raw
`,
  )
  .action(async (databaseId: string, options: { raw?: boolean; limit: string; cursor?: string }) => {
    const bearerToken = getBearerToken();
    const pageSize = Math.min(parseInt(options.limit, 10) || 20, 100);

    console.log(`🗃️ Listing database entries...\n`);

    try {
      const queryResponse = await notion.databases.query(databaseId, bearerToken, "2022-02-22", {
        page_size: pageSize,
        start_cursor: options.cursor,
      });

      if (options.raw) {
        console.log(JSON.stringify(queryResponse, null, 2));
        return;
      }

      if (queryResponse.results.length === 0) {
        console.log("No entries found.");
        return;
      }

      console.log(`Entries (${queryResponse.results.length}${queryResponse.has_more ? "+" : ""}):\n`);
      console.log("─".repeat(60));

      for (const page of queryResponse.results) {
        const pageTitle = getPageTitle(page);
        const lastEdited = formatDate(page.last_edited_time);

        console.log(`  📄 ${pageTitle}`);
        console.log(`     ID: ${page.id}`);
        console.log(`     Last edited: ${lastEdited}`);
        console.log(`     URL: ${page.url}`);

        for (const [name, prop] of Object.entries(page.properties)) {
          if (prop.type === "title") continue;
          const value = formatPropertyValue(prop);
          console.log(`     ${name}: ${value}`);
        }

        console.log();
      }

      console.log("─".repeat(60));

      if (queryResponse.has_more && queryResponse.next_cursor) {
        console.log(`\n📑 More entries available. Next page:`);
        console.log(`   notion-cli database list ${databaseId} --cursor ${queryResponse.next_cursor}`);
      }

      console.log(`\nTo read an entry: notion-cli page get <entry-id>`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- database command group ---------------------------------------------------

export const databaseCommand = new Command("database")
  .description("View and query Notion databases")
  .addCommand(databaseGetCommand)
  .addCommand(databaseListCommand);
