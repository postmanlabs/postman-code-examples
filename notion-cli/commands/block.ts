/**
 * block command group
 *   block get <id>       — retrieve a single block
 *   block children <id>  — list a block's children
 */

import { Command } from "commander";
import { createNotionClient } from "../src/postman/notion-api/index.js";
import { getBearerToken, formatDate, formatBlock } from "../helpers.js";

// -- block get ----------------------------------------------------------------

const blockGetCommand = new Command("get")
  .description("Retrieve a single block by ID")
  .argument("<block-id>", "the ID of the block to retrieve")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .addHelpText(
    "after",
    `
Details:
  Fetches a single block object. Shows the block type, content,
  parent, dates, and whether it has children.

  Pages are also blocks — you can pass a page ID here.

Examples:
  $ notion-cli block get <block-id>
  $ notion-cli block get <block-id> --raw
`,
  )
  .action(async (blockId: string, options: { raw?: boolean }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    try {
      const block = await notion.blocks.retrieve(blockId);

      if (options.raw) {
        console.log(JSON.stringify(block, null, 2));
        return;
      }

      const parent = block.parent;
      let parentInfo: string;
      if (parent.type === "page_id") {
        parentInfo = `page (ID: ${parent.page_id})`;
      } else if (parent.type === "block_id") {
        parentInfo = `block (ID: ${parent.block_id})`;
      } else if (parent.type === "database_id") {
        parentInfo = `database (ID: ${parent.database_id})`;
      } else {
        parentInfo = "workspace";
      }

      console.log(`ID: ${block.id}`);
      console.log(`Type: ${block.type}`);
      console.log(`Parent: ${parentInfo}`);
      console.log(`Has children: ${block.has_children}`);
      console.log(`Archived: ${block.archived}`);
      console.log(`Created: ${formatDate(block.created_time)}`);
      console.log(`Last edited: ${formatDate(block.last_edited_time)}`);

      const formatted = formatBlock(block);
      if (formatted) {
        console.log(`\nContent:\n  ${formatted}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- block children -----------------------------------------------------------

const blockChildrenCommand = new Command("children")
  .description("List a block's child blocks")
  .argument("<block-id>", "the ID of the block or page to get children for")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .option("-c, --cursor <cursor>", "pagination cursor from a previous request")
  .option("-n, --limit <number>", "max results per page, 1-100", "100")
  .addHelpText(
    "after",
    `
Details:
  Returns the immediate children of a block. Pages are also blocks,
  so you can pass a page ID to get the top-level content blocks.

  Unlike "page get", this does NOT recurse into nested blocks.

Examples:
  $ notion-cli block children <block-id>
  $ notion-cli block children <page-id>
  $ notion-cli block children <block-id> --raw
  $ notion-cli block children <block-id> -n 10
`,
  )
  .action(async (blockId: string, options: { raw?: boolean; cursor?: string; limit: string }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);
    const pageSize = Math.min(parseInt(options.limit, 10) || 100, 100);

    try {
      const response = await notion.blocks.retrieveChildren(blockId, {
        start_cursor: options.cursor,
        page_size: pageSize,
      });

      if (options.raw) {
        console.log(JSON.stringify(response, null, 2));
        return;
      }

      if (response.results.length === 0) {
        console.log("No child blocks found.");
        return;
      }

      console.log(`Found ${response.results.length} block(s):\n`);

      for (const block of response.results) {
        const formatted = formatBlock(block);
        const children = block.has_children ? " [has children]" : "";
        if (formatted) {
          console.log(`  ${formatted}${children}`);
        } else {
          console.log(`  [${block.type}] (ID: ${block.id})${children}`);
        }
      }

      if (response.has_more && response.next_cursor) {
        console.log(`\n📑 More results available. Use --cursor to get next page:`);
        console.log(`   notion-cli block children ${blockId} --cursor ${response.next_cursor}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- block append -------------------------------------------------------------

const blockAppendCommand = new Command("append")
  .description("Append child blocks to a page or block")
  .argument("<parent-id>", "the ID of the parent page or block")
  .argument("<text>", "text content to append as a paragraph block")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .addHelpText(
    "after",
    `
Details:
  Appends a paragraph block containing the given text to the parent.
  The parent can be a page ID or a block ID.

  For more complex block structures, use the generated client directly.

Examples:
  $ notion-cli block append <page-id> "Hello, world!"
  $ notion-cli block append <block-id> "Nested content" --raw
`,
  )
  .action(async (parentId: string, text: string, options: { raw?: boolean }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    const children = [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: text } }],
        },
      },
    ];

    try {
      const response = await notion.blocks.appendChildren(parentId, children);

      if (options.raw) {
        console.log(JSON.stringify(response, null, 2));
        return;
      }

      console.log(`Appended ${response.results.length} block(s).`);
      for (const block of response.results) {
        const formatted = formatBlock(block);
        if (formatted) {
          console.log(`  ${formatted}`);
        } else {
          console.log(`  [${block.type}] (ID: ${block.id})`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- block update -------------------------------------------------------------

const blockUpdateCommand = new Command("update")
  .description("Update a block's text content")
  .argument("<block-id>", "the ID of the block to update")
  .argument("<text>", "new text content for the block")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .addHelpText(
    "after",
    `
Details:
  Updates a paragraph, heading, bulleted list item, numbered list item,
  to-do, toggle, callout, or quote block with new text content.

  First retrieves the block to determine its type, then sends the
  update with the correct type key.

Examples:
  $ notion-cli block update <block-id> "Updated text"
  $ notion-cli block update <block-id> "Updated text" --raw
`,
  )
  .action(async (blockId: string, text: string, options: { raw?: boolean }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    try {
      // First, retrieve the block to get its type
      const existing = await notion.blocks.retrieve(blockId);
      const blockType = existing.type;

      // Types that support rich_text updates
      const richTextTypes = [
        "paragraph", "heading_1", "heading_2", "heading_3",
        "bulleted_list_item", "numbered_list_item", "to_do",
        "toggle", "callout", "quote",
      ];

      if (!richTextTypes.includes(blockType)) {
        console.error(`Error: block type "${blockType}" does not support text updates via this command.`);
        process.exit(1);
      }

      const params: Record<string, unknown> = {
        [blockType]: {
          rich_text: [{ type: "text", text: { content: text } }],
        },
      };

      const block = await notion.blocks.update(blockId, params);

      if (options.raw) {
        console.log(JSON.stringify(block, null, 2));
        return;
      }

      console.log(`Block updated.`);
      console.log(`  ID: ${block.id}`);
      console.log(`  Type: ${block.type}`);
      const formatted = formatBlock(block);
      if (formatted) {
        console.log(`  Content: ${formatted}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- block delete -------------------------------------------------------------

const blockDeleteCommand = new Command("delete")
  .description("Delete (archive) a block")
  .argument("<block-id>", "the ID of the block to delete")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .addHelpText(
    "after",
    `
Details:
  Deletes a block by setting its archived status to true.
  The block can be restored via the Notion UI or by updating
  it with archived: false.

Examples:
  $ notion-cli block delete <block-id>
  $ notion-cli block delete <block-id> --raw
`,
  )
  .action(async (blockId: string, options: { raw?: boolean }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    try {
      const block = await notion.blocks.delete(blockId);

      if (options.raw) {
        console.log(JSON.stringify(block, null, 2));
        return;
      }

      console.log(`Block deleted.`);
      console.log(`  ID: ${block.id}`);
      console.log(`  Type: ${block.type}`);
      console.log(`  Archived: ${block.archived}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- block command group ------------------------------------------------------

export const blockCommand = new Command("block")
  .description("Read and inspect Notion blocks")
  .addCommand(blockGetCommand)
  .addCommand(blockChildrenCommand)
  .addCommand(blockAppendCommand)
  .addCommand(blockUpdateCommand)
  .addCommand(blockDeleteCommand);
