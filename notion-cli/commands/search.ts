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

function normalizeDirectionOption(input: string | undefined): "ascending" | "descending" | undefined {
  if (!input) return undefined;
  const v = input.trim().toLowerCase();
  if (v === "ascending" || v === "asc") return "ascending";
  if (v === "descending" || v === "desc") return "descending";
  console.error(`Error: invalid --direction value "${input}". Expected: ascending (asc) or descending (desc).`);
  process.exit(1);
}

function isNotionPage(result: NotionPage | NotionDatabase): result is NotionPage {
  return result.object === "page";
}

function isNotionDatabase(result: NotionPage | NotionDatabase): result is NotionDatabase {
  return result.object === "database";
}

/** Data source objects are returned when searching with filter: data_source (2025-09-03 API) */
interface DataSourceResult {
  object: "data_source";
  id: string;
  title?: Array<{ plain_text: string }>;
  parent?: { type: string; database_id?: string };
  database_parent?: { type: string; database_id?: string };
  created_time: string;
  last_edited_time: string;
  archived?: boolean;
  url?: string;
  properties?: Record<string, { type: string }>;
}

function isDataSource(result: unknown): result is DataSourceResult {
  return (result as Record<string, unknown>)?.object === "data_source";
}

export const searchCommand = new Command("search")
  .description("Search for pages and databases")
  .argument("[query]", "text to search for (omit to list all results)")
  .option("-c, --cursor <cursor>", "pagination cursor from a previous search")
  .option("-n, --limit <number>", "max results per page, 1-100", "20")
  .option("-f, --filter <object>", "filter results by object type: page, database, or all", "page")
  .option("-d, --direction <direction>", "sort direction: ascending (asc) or descending (desc)")
  .option("--sort-by <timestamp>", "sort timestamp field (default: last_edited_time)", "last_edited_time")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .addHelpText(
    "after",
    `
Details:
  Without a query, lists all accessible results (paginated).
  With a query, searches titles and content.

  By default, results are filtered to pages only.
  Use --filter database to list databases, or --filter all to show both.

  Use --direction to order results (ascending or descending).
  The sort field defaults to last_edited_time (currently the only
  documented value), but --sort-by can override it.

  Each result shows: title, ID, parent, dates, and URL.

Examples:
  $ notion-cli search                           # list all pages
  $ notion-cli search --filter database         # list databases
  $ notion-cli search --filter all              # list pages + databases
  $ notion-cli search "meeting notes"           # search by text
  $ notion-cli search -n 5                      # limit to 5 results
  $ notion-cli search --direction ascending     # oldest edits first
  $ notion-cli search -d desc                   # newest edits first
`,
  )
  .action(
    async (
      query: string | undefined,
      options: { cursor?: string; limit: string; filter?: string; direction?: string; sortBy: string; raw?: boolean },
    ) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);
    const filterOption = normalizeFilterOption(options.filter);
    const sortDirection = normalizeDirectionOption(options.direction);
    const pageSize = Math.min(parseInt(options.limit, 10) || 20, 100);

    const filterLabel =
      filterOption === "page" ? "pages" : filterOption === "database" ? "databases" : "pages and databases";

    try {
      const response = await notion.search({
        query: query || undefined,
        ...(filterOption === "all" ? {} : { filter: { value: FILTER_API_VALUE[filterOption], property: "object" } }),
        ...(sortDirection ? { sort: { direction: sortDirection, timestamp: options.sortBy } } : {}),
        start_cursor: options.cursor,
        page_size: pageSize,
      });

      if (options.raw) {
        console.log(JSON.stringify(response, null, 2));
        return;
      }

      console.log(query ? `🔍 Searching ${filterLabel} for "${query}"...\n` : `🔍 Listing ${filterLabel}...\n`);

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

        // Data source objects are returned when filtering for databases (2025-09-03 API)
        const dsResult = result as unknown;
        if (isDataSource(dsResult)) {
          const title = dsResult.title?.map((t: { plain_text: string }) => t.plain_text).join("") || "(Untitled)";
          const lastEdited = formatDate(dsResult.last_edited_time);
          const created = formatDate(dsResult.created_time);

          // Data sources have a parent (the database) and database_parent (the database's parent)
          const dsParent = dsResult.parent as { type?: string; database_id?: string } | undefined;
          const dbParent = dsResult.database_parent as { type?: string; page_id?: string } | undefined;
          let parentInfo: string;
          if (dsParent?.database_id) {
            parentInfo = `database (ID: ${dsParent.database_id})`;
          } else if (dbParent?.page_id) {
            parentInfo = `page (ID: ${dbParent.page_id})`;
          } else {
            parentInfo = "workspace";
          }

          // Show schema summary if available
          const propEntries = Object.entries(dsResult.properties || {});
          const schemaInfo = propEntries.length > 0
            ? propEntries.map(([name, p]) => `${name}: ${(p as { type: string }).type}`).join(", ")
            : undefined;

          console.log(`  🗃️ ${title}`);
          console.log(`     ID: ${dsResult.id}`);
          console.log(`     Parent: ${parentInfo}`);
          console.log(`     Created: ${created}`);
          console.log(`     Last edited: ${lastEdited}`);
          if (dsResult.archived !== undefined) {
            console.log(`     Archived: ${dsResult.archived}`);
          }
          if (dsResult.url) {
            console.log(`     URL: ${dsResult.url}`);
          }
          if (schemaInfo) {
            console.log(`     Schema: ${schemaInfo}`);
          }
          console.log();
          continue;
        }

        // Shouldn't happen, but keep output resilient if Notion adds new objects.
        console.log(`  [Unknown object: ${(result as unknown as Record<string, unknown>).object || "?"}] ${(result as unknown as { id?: string }).id || ""}`);
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
