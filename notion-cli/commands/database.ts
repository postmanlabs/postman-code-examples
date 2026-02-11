/**
 * database command - fetch and display a database's schema and entries
 */

import { Command } from "commander";
import { notion, type DatabasePropertySchema } from "../src/postman/notion-api/index.js";
import { getBearerToken, getPageTitle, formatDate } from "../helpers.js";

export const databaseCommand = new Command("database")
  .description("Read a database's schema and query its entries")
  .argument("<database-id>", "Notion database ID or URL")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .option("-n, --limit <number>", "max entries to return, 1-100", "20")
  .option("-c, --cursor <cursor>", "pagination cursor from a previous query")
  .addHelpText(
    "after",
    `
Details:
  Fetches a database and displays:
    • Metadata – title, ID, parent, created/edited dates, URL
    • Schema – property names and their types
    • Entries – rows with title, ID, last edited date, and URL

  Each entry is a Notion page. For tree mapping you typically just
  need titles and IDs; use the page command to read entry content.

Examples:
  $ notion-cli database 725a78f3-00bf-4dde-b207-d04530545c45
  $ notion-cli database 725a78f3-00bf-4dde-b207-d04530545c45 --limit 50
  $ notion-cli database 725a78f3-00bf-4dde-b207-d04530545c45 --raw
`,
  )
  .action(async (databaseId: string, options: { raw?: boolean; limit: string; cursor?: string }) => {
    const bearerToken = getBearerToken();
    const pageSize = Math.min(parseInt(options.limit, 10) || 20, 100);

    console.log(`🗃️ Fetching database...\n`);

    try {
      // Fetch database metadata (schema)
      const database = await notion.databases.retrieve(databaseId, bearerToken, "2022-02-22");
      
      // Get database title
      const title = database.title.map((t) => t.plain_text).join("") || "(Untitled)";
      
      // Determine parent type
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
      
      // Show schema (properties)
      const propEntries = Object.entries(database.properties);
      if (propEntries.length > 0) {
        console.log(`\nSchema (${propEntries.length} properties):`);
        for (const [name, prop] of propEntries) {
          const schema = prop as DatabasePropertySchema;
          console.log(`  ${name}: ${schema.type}`);
        }
      }

      // Query database entries
      const queryResponse = await notion.databases.query(databaseId, bearerToken, "2022-02-22", {
        page_size: pageSize,
        start_cursor: options.cursor,
      });

      if (options.raw) {
        console.log(JSON.stringify({ database, entries: queryResponse.results }, null, 2));
        return;
      }

      if (queryResponse.results.length === 0) {
        console.log("\nEntries: (no entries)");
        return;
      }

      console.log(`\nEntries (${queryResponse.results.length}${queryResponse.has_more ? "+" : ""}):\n`);
      console.log("─".repeat(60));

      for (const page of queryResponse.results) {
        const pageTitle = getPageTitle(page);
        const lastEdited = formatDate(page.last_edited_time);
        
        console.log(`  📄 ${pageTitle}`);
        console.log(`     ID: ${page.id}`);
        console.log(`     Last edited: ${lastEdited}`);
        console.log(`     URL: ${page.url}`);
        console.log();
      }

      console.log("─".repeat(60));

      if (queryResponse.has_more && queryResponse.next_cursor) {
        console.log(`\n📑 More entries available. Use --cursor to get next page:`);
        console.log(`   notion-cli database ${databaseId} --cursor ${queryResponse.next_cursor}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });
