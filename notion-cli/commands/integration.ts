/**
 * integration command group
 *   integration pages  — list the root pages the integration can access
 */

import { Command } from "commander";
import { createNotionClient, type NotionPage } from "../src/postman/notion-api/index.js";
import { getBearerToken, getPageTitle, formatDate } from "../helpers.js";

// -- integration pages --------------------------------------------------------

const integrationPagesCommand = new Command("pages")
  .description("List root pages the integration can access")
  .addHelpText(
    "after",
    `
Details:
  Lists the root pages visible to this integration — the entry points
  for navigating workspace content.

  A page is considered a root if:
    1. Its parent is the workspace itself (a true top-level page), OR
    2. Its parent page is not accessible to the integration.

  Case 2 matters when an integration is shared with a page that is
  nested inside the workspace hierarchy. That page has a parent, but
  the integration can't see the parent, so it's effectively a root
  from the integration's perspective.

  How it works: paginates through all pages via the Search API,
  collects every page ID, then returns pages whose parent is either
  the workspace or a page ID not in the collected set.

  This is the recommended starting point for mapping content. From
  these roots, use "page get" to discover child pages and databases,
  then traverse the tree with page get / database get / database list.

Examples:
  $ notion-cli integration pages
`,
  )
  .action(async () => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    console.log("🔍 Finding root pages...\n");

    try {
      const allPages: NotionPage[] = [];
      let cursor: string | undefined;

      // Paginate through all pages the integration can see
      do {
        const response = await notion.search({
          filter: { value: "page", property: "object" },
          start_cursor: cursor,
          page_size: 100,
        });

        for (const result of response.results) {
          if (result.object === "page") {
            allPages.push(result as NotionPage);
          }
        }

        cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
      } while (cursor);

      // Build a set of all visible page IDs
      const visibleIds = new Set(allPages.map((p) => p.id));

      // A page is a root if its parent is the workspace, or its parent
      // page isn't in the set of pages the integration can see.
      const rootPages = allPages.filter((page) => {
        if (page.parent.type === "workspace") return true;
        if (page.parent.type === "page_id" && page.parent.page_id) return !visibleIds.has(page.parent.page_id);
        // database/data source children are not roots — they live inside a visible database
        if (page.parent.type === "database_id" || page.parent.type === "data_source_id") return false;
        return false;
      });

      if (rootPages.length === 0) {
        console.log("No root pages found.");
        console.log(`(Scanned ${allPages.length} total pages)`);
        return;
      }

      console.log(`Found ${rootPages.length} root page(s) (scanned ${allPages.length} total):\n`);

      for (const page of rootPages) {
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
  });

// -- integration command group ------------------------------------------------

export const integrationCommand = new Command("integration")
  .description("Inspect the integration's access and capabilities")
  .addCommand(integrationPagesCommand);
