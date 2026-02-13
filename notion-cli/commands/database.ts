/**
 * database command group
 *   database get  <id>  — metadata and schema
 *   database list <id>  — paginated entries
 */

import { Command } from "commander";
import { createNotionClient, type DatabasePropertySchema } from "../src/postman/notion-api/index.js";
import { getBearerToken, getPageTitle, formatDate, formatPropertyValue } from "../helpers.js";

// -- database get -------------------------------------------------------------

const databaseGetCommand = new Command("get")
  .description("View a database's metadata and schema")
  .argument("<database-id>", "Notion database ID")
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
    const notion = createNotionClient(bearerToken);

    console.log(`🗃️ Fetching database...\n`);

    try {
      const database = await notion.databases.retrieve(databaseId);

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
      if (database.archived !== undefined) {
        console.log(`Archived: ${database.archived}`);
      }
      if (database.in_trash) {
        console.log(`In trash: ${database.in_trash}`);
      }
      if (database.is_locked) {
        console.log(`Locked: ${database.is_locked}`);
      }
      console.log(`URL: ${database.url}`);

      // Show data sources (new in 2025-09-03)
      if (database.data_sources && database.data_sources.length > 0) {
        console.log(`\nData sources (${database.data_sources.length}):`);
        for (const ds of database.data_sources) {
          console.log(`  ${ds.name || "(Unnamed)"} — ID: ${ds.id}`);
        }
      }

      const propEntries = Object.entries(database.properties || {});
      if (propEntries.length > 0) {
        console.log(`\nSchema (${propEntries.length} properties):`);
        for (const [name, prop] of propEntries) {
          const schema = prop as DatabasePropertySchema;
          console.log(`  ${name}: ${schema.type}`);
        }
      }

      // Suggest using data source ID for queries if available
      if (database.data_sources && database.data_sources.length > 0) {
        console.log(`\nTo list entries: notion-cli database list ${databaseId}`);
        console.log(`  (uses data source ID: ${database.data_sources[0].id})`);
      } else {
        console.log(`\nTo list entries: notion-cli database list ${databaseId}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- database list ------------------------------------------------------------

const databaseListCommand = new Command("list")
  .description("List entries in a database")
  .argument("<database-id>", "Notion database ID")
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
    const notion = createNotionClient(bearerToken);
    const pageSize = Math.min(parseInt(options.limit, 10) || 20, 100);

    console.log(`🗃️ Listing database entries...\n`);

    try {
      // Two-step flow: retrieve database to get data source ID, then query the data source
      const database = await notion.databases.retrieve(databaseId);
      const dataSourceId = database.data_sources?.[0]?.id;

      let queryResponse;
      if (dataSourceId) {
        queryResponse = await notion.dataSources.query(dataSourceId, {
          page_size: pageSize,
          start_cursor: options.cursor,
        });
      } else {
        // Fallback to legacy database query if no data sources available
        queryResponse = await notion.databases.query(databaseId, {
          page_size: pageSize,
          start_cursor: options.cursor,
        });
      }

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

// -- database create ----------------------------------------------------------

const databaseCreateCommand = new Command("create")
  .description("Create a database as a child of a page")
  .argument("<parent-page-id>", "ID of the parent page")
  .option("-t, --title <title>", "database title")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .addHelpText(
    "after",
    `
Details:
  Creates a new inline database as a child of the specified page.
  The database is created with a single "Name" title property.
  Use "database update" to add more properties after creation.

Examples:
  $ notion-cli database create <parent-page-id> --title "Task Tracker"
  $ notion-cli database create <parent-page-id> --title "Task Tracker" --raw
`,
  )
  .action(async (parentPageId: string, options: { title?: string; raw?: boolean }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    try {
      const db = await notion.databases.create({
        parent: { type: "page_id", page_id: parentPageId },
        title: options.title ? [{ text: { content: options.title } }] : undefined,
        properties: {
          Name: { title: {} },
        },
      });

      if (options.raw) {
        console.log(JSON.stringify(db, null, 2));
        return;
      }

      const title = db.title.map((t) => t.plain_text).join("") || "(Untitled)";
      console.log(`Database created.`);
      console.log(`  Title: ${title}`);
      console.log(`  ID: ${db.id}`);
      console.log(`  URL: ${db.url}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- database update ----------------------------------------------------------

const databaseUpdateCommand = new Command("update")
  .description("Update a database's title or description")
  .argument("<database-id>", "ID of the database to update")
  .option("-t, --title <title>", "set a new title")
  .option("-d, --description <description>", "set a new description")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .addHelpText(
    "after",
    `
Details:
  Updates a database's title and/or description.
  Only the specified fields are updated; others remain unchanged.

Examples:
  $ notion-cli database update <database-id> --title "New Title"
  $ notion-cli database update <database-id> --description "Updated description"
  $ notion-cli database update <database-id> --title "New" --description "Desc" --raw
`,
  )
  .action(async (databaseId: string, options: { title?: string; description?: string; raw?: boolean }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    const params: Record<string, unknown> = {};
    if (options.title) {
      params.title = [{ text: { content: options.title } }];
    }
    if (options.description) {
      params.description = [{ text: { content: options.description } }];
    }

    if (Object.keys(params).length === 0) {
      console.error("Error: nothing to update. Use --title or --description.");
      process.exit(1);
    }

    try {
      const db = await notion.databases.update(databaseId, params);

      if (options.raw) {
        console.log(JSON.stringify(db, null, 2));
        return;
      }

      const title = db.title.map((t) => t.plain_text).join("") || "(Untitled)";
      console.log(`Database updated.`);
      console.log(`  Title: ${title}`);
      console.log(`  ID: ${db.id}`);
      console.log(`  URL: ${db.url}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- database command group ---------------------------------------------------

export const databaseCommand = new Command("database")
  .description("View and query Notion databases")
  .addCommand(databaseGetCommand)
  .addCommand(databaseListCommand)
  .addCommand(databaseCreateCommand)
  .addCommand(databaseUpdateCommand);
