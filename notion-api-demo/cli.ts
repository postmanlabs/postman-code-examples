#!/usr/bin/env node
/**
 * Notion CLI
 *
 * A CLI tool for searching and navigating a Notion workspace. Designed to be
 * used by AI agents to explore and read content from Notion.
 */

import "dotenv/config";
import { Command } from "commander";
import { search } from "./src/postman/notion-api/search/search/client.js";
import { retrievePage } from "./src/postman/notion-api/pages/retrieve-page/client.js";
import { retrieveBlockChildren } from "./src/postman/notion-api/blocks/retrieve-block-children/client.js";
import { retrieveDatabase } from "./src/postman/notion-api/databases/retrieve-database/client.js";
import { queryDatabase } from "./src/postman/notion-api/databases/query-database/client.js";
import type { NotionPage, NotionBlock, PropertyValue, NotionDatabase, DatabasePropertySchema } from "./src/postman/notion-api/shared/types.js";

// ============================================================================
// Helper Functions
// ============================================================================

function getBearerToken(): string {
  const token = process.env.NOTION_API_KEY;
  if (!token) {
    console.error("Error: NOTION_API_KEY not found in environment.");
    console.error("Make sure you have a .env file with NOTION_API_KEY=your_secret_key");
    process.exit(1);
  }
  return token;
}

function getPageTitle(page: NotionPage): string {
  for (const [, prop] of Object.entries(page.properties)) {
    if (prop.type === "title" && prop.title && prop.title.length > 0) {
      return prop.title.map((t) => t.plain_text).join("");
    }
  }
  return "(Untitled)";
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString();
}

function formatPropertyValue(prop: PropertyValue): string {
  switch (prop.type) {
    case "title":
      return prop.title?.map((t) => t.plain_text).join("") || "(empty)";
    case "rich_text": {
      const rt = prop.rich_text as Array<{ plain_text: string }> | undefined;
      return rt?.map((t) => t.plain_text).join("") || "(empty)";
    }
    case "number":
      return String(prop.number ?? "(empty)");
    case "select": {
      const sel = prop.select as { name: string } | null | undefined;
      return sel?.name || "(empty)";
    }
    case "multi_select": {
      const ms = prop.multi_select as Array<{ name: string }> | undefined;
      return ms?.map((s) => s.name).join(", ") || "(empty)";
    }
    case "date": {
      const d = prop.date as { start: string; end?: string } | null | undefined;
      if (!d) return "(empty)";
      return d.end ? `${d.start} → ${d.end}` : d.start;
    }
    case "checkbox":
      return prop.checkbox ? "✓" : "✗";
    case "url":
      return (prop.url as string) || "(empty)";
    case "email":
      return (prop.email as string) || "(empty)";
    case "phone_number":
      return (prop.phone_number as string) || "(empty)";
    case "status": {
      const status = prop.status as { name: string } | null | undefined;
      return status?.name || "(empty)";
    }
    case "created_time":
      return formatDate(prop.created_time as string);
    case "last_edited_time":
      return formatDate(prop.last_edited_time as string);
    case "created_by":
    case "last_edited_by": {
      const user = prop[prop.type] as { id: string } | undefined;
      return user?.id || "(empty)";
    }
    case "relation": {
      const rel = prop.relation as Array<{ id: string }> | undefined;
      return rel?.map((r) => r.id).join(", ") || "(empty)";
    }
    case "rollup": {
      const rollup = prop.rollup as { type: string } | undefined;
      return `[rollup: ${rollup?.type || "unknown"}]`;
    }
    case "formula": {
      const formula = prop.formula as { type: string; string?: string; number?: number } | undefined;
      if (formula?.type === "string") return formula.string || "(empty)";
      if (formula?.type === "number") return String(formula.number ?? "(empty)");
      return `[formula: ${formula?.type || "unknown"}]`;
    }
    case "files": {
      const files = prop.files as Array<{ name: string }> | undefined;
      return files?.map((f) => f.name).join(", ") || "(empty)";
    }
    default:
      return `[${prop.type}]`;
  }
}

function extractRichText(block: NotionBlock): string {
  const blockType = block.type;
  const content = block[blockType] as { rich_text?: Array<{ plain_text: string }> } | undefined;
  if (content?.rich_text) {
    return content.rich_text.map((t) => t.plain_text).join("");
  }
  return "";
}

function formatBlock(block: NotionBlock, indent: string = ""): string {
  const text = extractRichText(block);
  
  switch (block.type) {
    case "paragraph":
      return text ? `${indent}${text}` : "";
    case "heading_1":
      return `${indent}# ${text}`;
    case "heading_2":
      return `${indent}## ${text}`;
    case "heading_3":
      return `${indent}### ${text}`;
    case "bulleted_list_item":
      return `${indent}• ${text}`;
    case "numbered_list_item":
      return `${indent}1. ${text}`;
    case "to_do": {
      const todo = block.to_do as { checked?: boolean } | undefined;
      const checkbox = todo?.checked ? "[x]" : "[ ]";
      return `${indent}${checkbox} ${text}`;
    }
    case "toggle":
      return `${indent}▸ ${text}`;
    case "code": {
      const code = block.code as { language?: string } | undefined;
      const lang = code?.language || "";
      return `${indent}\`\`\`${lang}\n${indent}${text}\n${indent}\`\`\``;
    }
    case "quote":
      return `${indent}> ${text}`;
    case "callout": {
      const callout = block.callout as { icon?: { emoji?: string } } | undefined;
      const emoji = callout?.icon?.emoji || "💡";
      return `${indent}${emoji} ${text}`;
    }
    case "divider":
      return `${indent}---`;
    case "child_page": {
      const childPage = block.child_page as { title?: string } | undefined;
      const edited = formatDate(block.last_edited_time as string);
      return `${indent}📄 [Child Page: ${childPage?.title || "Untitled"}] (ID: ${block.id}, edited: ${edited})`;
    }
    case "child_database": {
      const childDb = block.child_database as { title?: string } | undefined;
      return `${indent}🗃️ [Child Database: ${childDb?.title || "Untitled"}] (ID: ${block.id})`;
    }
    case "image":
      return `${indent}🖼️ [Image]`;
    case "video":
      return `${indent}🎥 [Video]`;
    case "file":
      return `${indent}📎 [File]`;
    case "pdf":
      return `${indent}📄 [PDF]`;
    case "bookmark": {
      const bookmark = block.bookmark as { url?: string } | undefined;
      return `${indent}🔖 [Bookmark: ${bookmark?.url || ""}]`;
    }
    case "link_preview": {
      const link = block.link_preview as { url?: string } | undefined;
      return `${indent}🔗 [Link: ${link?.url || ""}]`;
    }
    case "table":
      return `${indent}📊 [Table]`;
    case "table_row":
      return ""; // Handled by table
    case "column_list":
      return ""; // Container, children are columns
    case "column":
      return ""; // Container
    case "synced_block":
      return `${indent}🔄 [Synced Block]`;
    case "template":
      return `${indent}📝 [Template]`;
    case "unsupported":
      return `${indent}[Unsupported block type]`;
    default:
      return text ? `${indent}${text}` : `${indent}[${block.type}]`;
  }
}

// ============================================================================
// CLI Commands
// ============================================================================

const program = new Command();

program
  .name("notion-cli")
  .description("CLI tool for searching and navigating a Notion workspace")
  .version("1.0.0");

/**
 * Search command - search for pages matching a query string
 */
program
  .command("search")
  .description("Search Notion for pages matching a query string")
  .argument("[query]", "Search query (optional - omit to list all pages)")
  .option("-c, --cursor <cursor>", "Pagination cursor for next page of results")
  .option("-n, --limit <number>", "Number of results per page (max 100)", "20")
  .option("-w, --workspace", "Only return top-level workspace pages (paginates internally)")
  .action(async (query: string | undefined, options: { cursor?: string; limit: string; workspace?: boolean }) => {
    const bearerToken = getBearerToken();

    // Workspace mode: paginate internally and filter for workspace-level pages
    if (options.workspace) {
      if (options.cursor || options.limit !== "20") {
        console.error("Error: --cursor and --limit cannot be used with --workspace flag.");
        console.error("When using --workspace, pagination is handled internally to find all top-level pages.");
        process.exit(1);
      }

      console.log("🔍 Finding workspace-level pages...\n");

      try {
        const workspacePages: NotionPage[] = [];
        let cursor: string | undefined;
        let totalScanned = 0;

        // Paginate through all results internally
        do {
          const response = await search(bearerToken, "2022-02-22", {
            query: query || undefined,
            filter: { value: "page", property: "object" },
            start_cursor: cursor,
            page_size: 100, // Max page size for efficiency
          });

          totalScanned += response.results.length;

          // Filter for workspace-level pages
          for (const page of response.results) {
            if (page.parent.type === "workspace") {
              workspacePages.push(page);
            }
          }

          cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
        } while (cursor);

        if (workspacePages.length === 0) {
          console.log("No workspace-level pages found.");
          console.log(`(Scanned ${totalScanned} total pages)`);
          return;
        }

        console.log(`Found ${workspacePages.length} workspace-level page(s) (scanned ${totalScanned} total):\n`);

        for (const page of workspacePages) {
          const title = getPageTitle(page);
          const lastEdited = formatDate(page.last_edited_time);
          const created = formatDate(page.created_time);

          console.log(`  📄 ${title}`);
          console.log(`     ID: ${page.id}`);
          console.log(`     Created: ${created}`);
          console.log(`     Last edited: ${lastEdited}`);
          console.log(`     Archived: ${page.archived}`);
          console.log(`     URL: ${page.url}`);
          console.log();
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
      return;
    }

    // Normal search mode
    const pageSize = Math.min(parseInt(options.limit, 10) || 20, 100);

    console.log(query ? `🔍 Searching for "${query}"...\n` : "🔍 Listing all pages...\n");

    try {
      const response = await search(bearerToken, "2022-02-22", {
        query: query || undefined,
        filter: { value: "page", property: "object" },
        start_cursor: options.cursor,
        page_size: pageSize,
      });

      if (response.results.length === 0) {
        console.log("No pages found.");
        return;
      }

      console.log(`Found ${response.results.length} page(s):\n`);

      for (const page of response.results) {
        const title = getPageTitle(page);
        const lastEdited = formatDate(page.last_edited_time);
        const created = formatDate(page.created_time);
        
        // Determine parent type and ID
        const parent = page.parent;
        let parentInfo: string;
        if (parent.type === "database_id") {
          parentInfo = `database (ID: ${parent.database_id})`;
        } else if (parent.type === "page_id") {
          parentInfo = `page (ID: ${parent.page_id})`;
        } else {
          parentInfo = "workspace (top-level)";
        }

        console.log(`  📄 ${title}`);
        console.log(`     ID: ${page.id}`);
        console.log(`     Parent: ${parentInfo}`);
        console.log(`     Created: ${created}`);
        console.log(`     Last edited: ${lastEdited}`);
        console.log(`     Archived: ${page.archived}`);
        console.log(`     URL: ${page.url}`);
        console.log();
      }

      if (response.has_more && response.next_cursor) {
        console.log(`\n📑 More results available. Use --cursor to get next page:`);
        console.log(`   npm run cli search ${query ? `"${query}" ` : ""}-- --cursor ${response.next_cursor}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

/**
 * Page command - fetch and display a page's content
 */
program
  .command("page")
  .description("Fetch a page and display its content and properties")
  .argument("<page-id>", "The ID of the page to fetch")
  .option("-r, --raw", "Output raw JSON instead of formatted text")
  .action(async (pageId: string, options: { raw?: boolean }) => {
    const bearerToken = getBearerToken();

    console.log(`📄 Fetching page...\n`);

    try {
      // First fetch page metadata
      const page = await retrievePage(pageId, bearerToken, "2022-02-22");
      
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
          const response = await retrieveBlockChildren(blockId, bearerToken, "2022-02-22", {
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

/**
 * Database command - fetch and display a database's schema and entries
 */
program
  .command("database")
  .description("Fetch a database and display its schema and entries")
  .argument("<database-id>", "The ID of the database to fetch")
  .option("-r, --raw", "Output raw JSON instead of formatted text")
  .option("-n, --limit <number>", "Number of entries to show (max 100)", "20")
  .option("-c, --cursor <cursor>", "Pagination cursor for next page of results")
  .action(async (databaseId: string, options: { raw?: boolean; limit: string; cursor?: string }) => {
    const bearerToken = getBearerToken();
    const pageSize = Math.min(parseInt(options.limit, 10) || 20, 100);

    console.log(`🗃️ Fetching database...\n`);

    try {
      // Fetch database metadata (schema)
      const database = await retrieveDatabase(databaseId, bearerToken, "2022-02-22");
      
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
      const queryResponse = await queryDatabase(databaseId, bearerToken, "2022-02-22", {
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
        console.log(`   npm run cli -- database ${databaseId} --cursor ${queryResponse.next_cursor}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

program.parse();
