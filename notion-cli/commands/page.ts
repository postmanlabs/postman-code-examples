/**
 * page command group
 *   page get <id>  — fetch and display a page's content
 */

import { Command } from "commander";
import { createNotionClient, type NotionBlock } from "../src/postman/notion-api/index.js";
import { getBearerToken, getPageTitle, formatDate, formatPropertyValue, formatBlock } from "../helpers.js";

// -- page get -----------------------------------------------------------------

const pageGetCommand = new Command("get")
  .description("Read a page's content, properties, and child pages")
  .argument("<page-id>", "Notion page ID")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .addHelpText(
    "after",
    `
Details:
  Fetches a single page and displays:
    • Metadata – title, ID, parent, created/edited dates, URL
    • Properties – all page properties (useful for database entries)
    • Content – recursively fetches all blocks (parallel for speed)
    • Children – lists child pages (📄) and child databases (🗃️)

  Does NOT traverse into child pages or databases; it stays within
  the single page. Use the listed IDs to fetch children separately.

  For child databases, use:
    $ notion-cli database get <database-id>   (view schema)
    $ notion-cli database list <database-id>  (list entries)

Examples:
  $ notion-cli page get 35754014-c743-4bb5-aa0a-721f51256861
  $ notion-cli page get 35754014-c743-4bb5-aa0a-721f51256861 --raw
`,
  )
  .action(async (pageId: string, options: { raw?: boolean }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    console.log(`📄 Fetching page...\n`);

    try {
      // First fetch page metadata
      const page = await notion.pages.retrieve(pageId);

      // Show page info
      const title = getPageTitle(page);
      const parent = page.parent;
      let parentInfo: string;
      if (parent.type === "database_id") {
        parentInfo = `database (ID: ${parent.database_id})`;
      } else if (parent.type === "data_source_id") {
        parentInfo = `data source (ID: ${parent.data_source_id})`;
      } else if (parent.type === "page_id") {
        parentInfo = `page (ID: ${parent.page_id})`;
      } else {
        parentInfo = "workspace (top-level)";
      }

      console.log(`Title: ${title}`);
      console.log(`ID: ${page.id}`);
      console.log(`Parent: ${parentInfo}`);
      console.log(`Created: ${formatDate(page.created_time)}`);
      console.log(`Last edited: ${formatDate(page.last_edited_time)}`);
      console.log(`Archived: ${page.archived}`);
      if (page.in_trash) {
        console.log(`In trash: ${page.in_trash}`);
      }
      console.log(`URL: ${page.url}`);

      // Show properties (useful for database items)
      const propEntries = Object.entries(page.properties);
      if (propEntries.length > 0) {
        console.log(`\nProperties (${propEntries.length}):`);
        for (const [name, prop] of propEntries) {
          const value = formatPropertyValue(prop);
          console.log(`  ${name}: ${value}`);
        }
      }

      // Fetch blocks with parallel recursion for speed
      const allBlocks: NotionBlock[] = [];

      async function fetchBlocksAtLevel(blockId: string, depth: number = 0): Promise<NotionBlock[]> {
        const blocks: NotionBlock[] = [];
        let cursor: string | undefined;

        do {
          const response = await notion.blocks.retrieveChildren(blockId, {
            start_cursor: cursor,
            page_size: 100,
          });

          for (const block of response.results) {
            (block as NotionBlock & { _depth: number })._depth = depth;
            blocks.push(block);
          }

          cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
        } while (cursor);

        return blocks;
      }

      async function fetchBlocksRecursive(blockId: string, depth: number = 0): Promise<void> {
        const blocks = await fetchBlocksAtLevel(blockId, depth);
        allBlocks.push(...blocks);

        // Find blocks that need recursion (have children, but not child pages/databases)
        const blocksToRecurse = blocks.filter((block) => {
          const isChildPage = block.type === "child_page" || block.type === "child_database";
          return block.has_children && !isChildPage;
        });

        // Recurse into all children in parallel
        if (blocksToRecurse.length > 0) {
          await Promise.all(blocksToRecurse.map((block) => fetchBlocksRecursive(block.id, depth + 1)));
        }
      }

      await fetchBlocksRecursive(pageId);

      if (allBlocks.length === 0) {
        console.log("\nContent: (no blocks)");
        return;
      }

      if (options.raw) {
        console.log(JSON.stringify(allBlocks, null, 2));
        return;
      }

      console.log(`\nContent (${allBlocks.length} blocks):\n`);
      console.log("─".repeat(60));

      for (const block of allBlocks) {
        const depth = (block as NotionBlock & { _depth?: number })._depth || 0;
        const indent = "  ".repeat(depth);
        const formatted = formatBlock(block, indent);
        if (formatted) {
          console.log(formatted);
        }
      }

      console.log("─".repeat(60));
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- page create --------------------------------------------------------------

const pageCreateCommand = new Command("create")
  .description("Create a new page under a parent page or database")
  .argument("<parent-id>", "ID of the parent page or database")
  .option("-t, --title <title>", "page title")
  .option("-d, --database", "parent is a database (default: parent is a page)")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .addHelpText(
    "after",
    `
Details:
  Creates a new page. By default, the parent is treated as a page.
  Use --database if the parent is a database (properties must match
  the database schema).

  For simple pages under a parent page, --title is all you need.

Examples:
  $ notion-cli page create <parent-page-id> --title "My New Page"
  $ notion-cli page create <parent-page-id> --title "My New Page" --raw
`,
  )
  .action(async (parentId: string, options: { title?: string; database?: boolean; raw?: boolean }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    const parent = options.database
      ? { database_id: parentId }
      : { page_id: parentId };

    const properties: Record<string, unknown> = {};
    if (options.title) {
      properties.title = [{ text: { content: options.title } }];
    }

    try {
      const page = await notion.pages.create({ parent, properties });

      if (options.raw) {
        console.log(JSON.stringify(page, null, 2));
        return;
      }

      const title = getPageTitle(page);
      console.log(`Page created.`);
      console.log(`  Title: ${title}`);
      console.log(`  ID: ${page.id}`);
      console.log(`  URL: ${page.url}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- page archive -------------------------------------------------------------

const pageArchiveCommand = new Command("archive")
  .description("Archive (soft-delete) a page")
  .argument("<page-id>", "the ID of the page to archive")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .addHelpText(
    "after",
    `
Details:
  Archives a page by setting its archived property to true.
  The page can be restored later from the Notion UI.

Examples:
  $ notion-cli page archive <page-id>
  $ notion-cli page archive <page-id> --raw
`,
  )
  .action(async (pageId: string, options: { raw?: boolean }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    try {
      const page = await notion.pages.archive(pageId);

      if (options.raw) {
        console.log(JSON.stringify(page, null, 2));
        return;
      }

      console.log(`Page archived.`);
      console.log(`  ID: ${page.id}`);
      console.log(`  Archived: ${page.archived}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- page property ------------------------------------------------------------

const pagePropertyCommand = new Command("property")
  .description("Retrieve a page property item")
  .argument("<page-id>", "the ID of the page")
  .argument("<property-id>", "the ID of the property to retrieve")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .option("-c, --cursor <cursor>", "pagination cursor (for paginated properties)")
  .addHelpText(
    "after",
    `
Details:
  Retrieves a single property value from a page. Useful for paginated
  properties (rollups, relations with many entries, long rich_text or
  title values) where the full value isn't returned in page get.

  The property ID can be found in the "page get --raw" output or in
  the database schema from "database get --raw".

Examples:
  $ notion-cli page property <page-id> <property-id>
  $ notion-cli page property <page-id> title
  $ notion-cli page property <page-id> <property-id> --raw
`,
  )
  .action(async (pageId: string, propertyId: string, options: { raw?: boolean; cursor?: string }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    try {
      const result = await notion.pages.retrieveProperty(pageId, propertyId, {
        start_cursor: options.cursor,
      });

      if (options.raw) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(`Type: ${result.type}`);

      // Paginated response (title, rich_text, relation, rollup)
      if (result.object === "list" && result.results) {
        console.log(`Items: ${result.results.length}`);
        for (const item of result.results) {
          // Try to extract a readable value
          const val = item[item.type] as Record<string, unknown> | undefined;
          if (val && "plain_text" in val) {
            console.log(`  ${val.plain_text}`);
          } else if (val && "id" in val) {
            console.log(`  ID: ${val.id}`);
          } else {
            console.log(`  ${JSON.stringify(val)}`);
          }
        }
        if (result.has_more && result.next_cursor) {
          console.log(`\n📑 More items available. Use --cursor to get next page:`);
          console.log(`   notion-cli page property ${pageId} ${propertyId} --cursor ${result.next_cursor}`);
        }
      } else {
        // Single-value response (select, number, checkbox, etc.)
        const val = result[result.type];
        if (val === null || val === undefined) {
          console.log(`Value: (empty)`);
        } else if (typeof val === "object") {
          console.log(`Value: ${JSON.stringify(val, null, 2)}`);
        } else {
          console.log(`Value: ${val}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- page update --------------------------------------------------------------

const pageUpdateCommand = new Command("update")
  .description("Update a page's properties")
  .argument("<page-id>", "the ID of the page to update")
  .option("-t, --title <title>", "set a new title")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .addHelpText(
    "after",
    `
Details:
  Updates properties on a page. Currently supports setting the title
  via --title. For more complex property updates, use the generated
  client directly.

Examples:
  $ notion-cli page update <page-id> --title "New Title"
  $ notion-cli page update <page-id> --title "New Title" --raw
`,
  )
  .action(async (pageId: string, options: { title?: string; raw?: boolean }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    const properties: Record<string, unknown> = {};
    if (options.title) {
      properties.title = [{ text: { content: options.title } }];
    }

    if (Object.keys(properties).length === 0) {
      console.error("Error: nothing to update. Use --title to set a new title.");
      process.exit(1);
    }

    try {
      const page = await notion.pages.update(pageId, { properties });

      if (options.raw) {
        console.log(JSON.stringify(page, null, 2));
        return;
      }

      const title = getPageTitle(page);
      console.log(`Page updated.`);
      console.log(`  Title: ${title}`);
      console.log(`  ID: ${page.id}`);
      console.log(`  URL: ${page.url}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- page move ----------------------------------------------------------------

const pageMoveCommand = new Command("move")
  .description("Move a page to a new parent")
  .argument("<page-id>", "the ID of the page to move")
  .requiredOption("-p, --parent <parent-id>", "the ID of the new parent page")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .addHelpText(
    "after",
    `
Details:
  Moves a page to a new parent page. The page keeps its content
  and properties — only the parent changes.

Examples:
  $ notion-cli page move <page-id> --parent <new-parent-page-id>
  $ notion-cli page move <page-id> --parent <new-parent-page-id> --raw
`,
  )
  .action(async (pageId: string, options: { parent: string; raw?: boolean }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    try {
      const page = await notion.pages.move(pageId, {
        parent: { type: "page_id", page_id: options.parent },
      });

      if (options.raw) {
        console.log(JSON.stringify(page, null, 2));
        return;
      }

      const title = getPageTitle(page);
      console.log(`Page moved.`);
      console.log(`  Title: ${title}`);
      console.log(`  ID: ${page.id}`);
      console.log(`  New parent: ${options.parent}`);
      console.log(`  URL: ${page.url}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- page command group -------------------------------------------------------

export const pageCommand = new Command("page")
  .description("Read and manage Notion pages")
  .addCommand(pageGetCommand)
  .addCommand(pageCreateCommand)
  .addCommand(pageUpdateCommand)
  .addCommand(pageArchiveCommand)
  .addCommand(pagePropertyCommand)
  .addCommand(pageMoveCommand);
