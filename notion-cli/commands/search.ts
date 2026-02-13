/**
 * search command — search for pages and databases via the Notion Search API
 */

import { Command } from "commander";
import { createNotionClient, type NotionDatabase, type NotionPage } from "../src/postman/notion-api/index.js";
import { getBearerToken, getPageTitle, formatDate } from "../helpers.js";

type SearchFilterOption = "page" | "database" | "all";

/** Map CLI filter names to API values (database → data_source in 2025-09-03) */
const FILTER_API_VALUE: Record<string, "page" | "data_source"> = {
  page: "page",
  database: "data_source",
};

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
  .description("Search for pages and databases")
  .argument("[query]", "text to search for (omit to list all results)")
  .option("-c, --cursor <cursor>", "pagination cursor from a previous search")
  .option("-n, --limit <number>", "max results per page, 1-100", "20")
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

Examples:
  $ notion-cli search                      # list all pages
  $ notion-cli search --filter database    # list databases
  $ notion-cli search --filter all         # list pages + databases
  $ notion-cli search "meeting notes"      # search by text
  $ notion-cli search -n 5                 # limit to 5 results
`,
  )
  .action(
    async (
      query: string | undefined,
      options: { cursor?: string; limit: string; filter?: string },
    ) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);
    const filterOption = normalizeFilterOption(options.filter);
    const pageSize = Math.min(parseInt(options.limit, 10) || 20, 100);

    const filterLabel =
      filterOption === "page" ? "pages" : filterOption === "database" ? "databases" : "pages and databases";
    console.log(query ? `🔍 Searching ${filterLabel} for "${query}"...\n` : `🔍 Listing ${filterLabel}...\n`);

    try {
      const response = await notion.search({
        query: query || undefined,
        ...(filterOption === "all" ? {} : { filter: { value: FILTER_API_VALUE[filterOption], property: "object" } }),
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
          } else if (parent.type === "data_source_id") {
            parentInfo = `data source (ID: ${parent.data_source_id})`;
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
