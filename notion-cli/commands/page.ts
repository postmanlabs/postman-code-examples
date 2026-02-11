/**
 * page command - fetch and display a page's content
 */

import { Command } from "commander";
import { notion, type NotionBlock } from "../src/postman/notion-api/index.js";
import { getBearerToken, getPageTitle, formatDate, formatPropertyValue, formatBlock } from "../helpers.js";

export const pageCommand = new Command("page")
  .description("Read a page's content, properties, and child pages")
  .argument("<page-id>", "Notion page ID or URL")
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

Examples:
  $ notion-cli page 35754014-c743-4bb5-aa0a-721f51256861
  $ notion-cli page 35754014-c743-4bb5-aa0a-721f51256861 --raw
`,
  )
  .action(async (pageId: string, options: { raw?: boolean }) => {
    const bearerToken = getBearerToken();

    console.log(`📄 Fetching page...\n`);

    try {
      // First fetch page metadata
      const page = await notion.pages.retrieve(pageId, bearerToken, "2022-02-22");
      
      // Show page info
      const title = getPageTitle(page);
      const parent = page.parent;
      let parentInfo: string;
      if (parent.type === "database_id") {
        parentInfo = `database (ID: ${parent.database_id})`;
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
          const response = await notion.blocks.retrieveChildren(blockId, bearerToken, "2022-02-22", {
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
        const blocksToRecurse = blocks.filter(block => {
          const isChildPage = block.type === "child_page" || block.type === "child_database";
          return block.has_children && !isChildPage;
        });
        
        // Recurse into all children in parallel
        if (blocksToRecurse.length > 0) {
          await Promise.all(
            blocksToRecurse.map(block => fetchBlocksRecursive(block.id, depth + 1))
          );
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

      console.log(`Content (${allBlocks.length} blocks):\n`);
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
