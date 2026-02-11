/**
 * search command - search for pages matching a query string
 */

import { Command } from "commander";
import { notion, type NotionDatabase, type NotionPage } from "../src/postman/notion-api/index.js";
import { getBearerToken, getPageTitle, formatDate } from "../helpers.js";

type SearchFilterOption = "page" | "database" | "all";

function normalizeFilterOption(input: string | undefined): SearchFilterOption {
  if (!input) return "page";
  const v = input.trim().toLowerCase();
  if (v === "page" || v === "database" || v === "all") return v;
  console.error(`Error: invalid --filter value "${input}". Expected: page, database, or all.`);
  process.exit(1);
}

function isNotionPage(result: NotionPage | NotionDatabase): result is NotionPage {
  return result.object === "page";
}

function isNotionDatabase(result: NotionPage | NotionDatabase): result is NotionDatabase {
  return result.object === "database";
}

export const searchCommand = new Command("search")
  .description("Search for pages and databases, or list workspace roots")
  .argument("[query]", "text to search for (omit to list all results)")
  .option("-c, --cursor <cursor>", "pagination cursor from a previous search")
  .option("-n, --limit <number>", "max results per page, 1-100", "20")
  .option("-w, --workspace", "find only top-level workspace pages (roots)")
  .option("-f, --filter <object>", "filter results by object type: page, database, or all", "page")
  .addHelpText(
    "after",
    `
Details:
  Without a query, lists all accessible results (paginated).
  With a query, searches titles and content.

  By default, results are filtered to pages only.
  Use --filter database to list databases, or --filter all to show both.

  Each result shows: title, ID, parent, dates, and URL.

  The --workspace flag is special: it paginates through ALL results
  internally and filters to only return pages whose parent is the
  workspace itself (top-level pages). This is how you find the roots
  of the workspace tree. When using --workspace, --cursor and --limit
  are ignored.

Examples:
  $ notion-cli search                      # list all pages
  $ notion-cli search --filter database    # list databases
  $ notion-cli search --filter all         # list pages + databases
  $ notion-cli search "meeting notes"      # search by text
  $ notion-cli search --workspace          # list root pages only
  $ notion-cli search -n 5                 # limit to 5 results
`,
  )
  .action(
    async (
      query: string | undefined,
      options: { cursor?: string; limit: string; workspace?: boolean; filter?: string },
    ) => {
    const bearerToken = getBearerToken();
    const filterOption = normalizeFilterOption(options.filter);

    // Workspace mode: paginate internally and filter for workspace-level pages
    if (options.workspace) {
      if (filterOption !== "page") {
        console.error("Error: --filter cannot be used with --workspace (workspace roots are pages only).");
        process.exit(1);
      }
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
          for (const result of response.results) {
            if (!isNotionPage(result)) continue;
            if (result.parent.type === "workspace") {
              workspacePages.push(result);
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

    const filterLabel =
      filterOption === "page" ? "pages" : filterOption === "database" ? "databases" : "pages and databases";
    console.log(query ? `🔍 Searching ${filterLabel} for "${query}"...\n` : `🔍 Listing ${filterLabel}...\n`);

    try {
      const response = await notion.search(bearerToken, "2022-02-22", {
        query: query || undefined,
        ...(filterOption === "all" ? {} : { filter: { value: filterOption, property: "object" } }),
        start_cursor: options.cursor,
        page_size: pageSize,
      });

      if (response.results.length === 0) {
        console.log(`No ${filterLabel} found.`);
        return;
      }

      console.log(`Found ${response.results.length} result(s):\n`);

      for (const result of response.results) {
        if (isNotionPage(result)) {
          const title = getPageTitle(result);
          const lastEdited = formatDate(result.last_edited_time);
          const created = formatDate(result.created_time);

          // Determine parent type and ID
          const parent = result.parent;
          let parentInfo: string;
          if (parent.type === "database_id") {
            parentInfo = `database (ID: ${parent.database_id})`;
          } else if (parent.type === "page_id") {
            parentInfo = `page (ID: ${parent.page_id})`;
          } else {
            parentInfo = "workspace (top-level)";
          }

          console.log(`  📄 ${title}`);
          console.log(`     ID: ${result.id}`);
          console.log(`     Parent: ${parentInfo}`);
          console.log(`     Created: ${created}`);
          console.log(`     Last edited: ${lastEdited}`);
          console.log(`     Archived: ${result.archived}`);
          console.log(`     URL: ${result.url}`);
          console.log();
          continue;
        }

        if (isNotionDatabase(result)) {
          const title = result.title.map((t) => t.plain_text).join("") || "(Untitled)";
          const lastEdited = formatDate(result.last_edited_time);
          const created = formatDate(result.created_time);

          const parent = result.parent;
          let parentInfo: string;
          if (parent.type === "page_id") {
            parentInfo = `page (ID: ${parent.page_id})`;
          } else if (parent.type === "block_id") {
            parentInfo = `block (ID: ${parent.block_id})`;
          } else {
            parentInfo = "workspace (top-level)";
          }

          console.log(`  🗃️ ${title}`);
          console.log(`     ID: ${result.id}`);
          console.log(`     Parent: ${parentInfo}`);
          console.log(`     Created: ${created}`);
          console.log(`     Last edited: ${lastEdited}`);
          console.log(`     Archived: ${result.archived}`);
          console.log(`     URL: ${result.url}`);
          console.log();
          continue;
        }

        // Shouldn't happen, but keep output resilient if Notion adds new objects.
        console.log(`  [Unknown object] ${(result as unknown as { id?: string }).id || ""}`);
      }

      if (response.has_more && response.next_cursor) {
        console.log(`\n📑 More results available. Use --cursor to get next page:`);
        console.log(`   notion-cli search ${query ? `"${query}" ` : ""}--cursor ${response.next_cursor}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  },
);
