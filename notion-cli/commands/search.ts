/**
 * search command - search for pages matching a query string
 */

import { Command } from "commander";
import { notion, type NotionPage } from "../src/postman/notion-api/index.js";
import { getBearerToken, getPageTitle, formatDate } from "../helpers.js";

export const searchCommand = new Command("search")
  .description("Search for pages or list workspace roots")
  .argument("[query]", "text to search for (omit to list all pages)")
  .option("-c, --cursor <cursor>", "pagination cursor from a previous search")
  .option("-n, --limit <number>", "max results per page, 1-100", "20")
  .option("-w, --workspace", "find only top-level workspace pages (roots)")
  .addHelpText(
    "after",
    `
Details:
  Without a query, lists all accessible pages (paginated).
  With a query, searches page titles and content.

  Each result shows: title, ID, parent, dates, and URL.

  The --workspace flag is special: it paginates through ALL results
  internally and filters to only return pages whose parent is the
  workspace itself (top-level pages). This is how you find the roots
  of the workspace tree. When using --workspace, --cursor and --limit
  are ignored.

Examples:
  $ notion-cli search                      # list all pages
  $ notion-cli search "meeting notes"      # search by text
  $ notion-cli search --workspace          # list root pages only
  $ notion-cli search -n 5                 # limit to 5 results
`,
  )
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
          const response = await notion.search(bearerToken, "2022-02-22", {
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
      const response = await notion.search(bearerToken, "2022-02-22", {
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
        console.log(`   notion-cli search ${query ? `"${query}" ` : ""}--cursor ${response.next_cursor}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });
