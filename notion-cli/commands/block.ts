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
        // Child pages and databases already include their ID in the formatted output
        const isChildRef = block.type === "child_page" || block.type === "child_database";
        const idSuffix = isChildRef ? "" : ` (ID: ${block.id})`;
        if (formatted) {
          console.log(`  ${formatted}${idSuffix}${children}`);
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

const APPEND_BLOCK_TYPES = [
  "paragraph", "heading_1", "heading_2", "heading_3",
  "callout", "quote", "divider", "code", "bookmark",
  "to_do", "bulleted_list_item", "numbered_list_item",
  "table_of_contents",
] as const;

type AppendBlockType = typeof APPEND_BLOCK_TYPES[number];

const NOTION_COLORS = [
  "default", "gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red",
  "gray_background", "brown_background", "orange_background", "yellow_background",
  "green_background", "blue_background", "purple_background", "pink_background", "red_background",
] as const;

/**
 * Build a Notion block object from CLI flags.
 */
function buildBlock(
  type: AppendBlockType,
  text: string | undefined,
  opts: { color?: string; icon?: string; language?: string; checked?: boolean },
): Record<string, unknown> {
  const richText = text
    ? [{ type: "text", text: { content: text } }]
    : [];

  const color = opts.color || "default";

  switch (type) {
    case "paragraph":
      return { object: "block", type, paragraph: { rich_text: richText, color } };
    case "heading_1":
      return { object: "block", type, heading_1: { rich_text: richText, color } };
    case "heading_2":
      return { object: "block", type, heading_2: { rich_text: richText, color } };
    case "heading_3":
      return { object: "block", type, heading_3: { rich_text: richText, color } };
    case "callout":
      return {
        object: "block", type,
        callout: {
          rich_text: richText,
          color,
          ...(opts.icon ? { icon: { type: "emoji", emoji: opts.icon } } : {}),
        },
      };
    case "quote":
      return { object: "block", type, quote: { rich_text: richText, color } };
    case "divider":
      return { object: "block", type, divider: {} };
    case "code":
      return {
        object: "block", type,
        code: { rich_text: richText, language: opts.language || "plain text" },
      };
    case "bookmark":
      return {
        object: "block", type,
        bookmark: { url: text || "", caption: [] },
      };
    case "to_do":
      return {
        object: "block", type,
        to_do: { rich_text: richText, checked: opts.checked ?? false, color },
      };
    case "bulleted_list_item":
      return { object: "block", type, bulleted_list_item: { rich_text: richText, color } };
    case "numbered_list_item":
      return { object: "block", type, numbered_list_item: { rich_text: richText, color } };
    case "table_of_contents":
      return { object: "block", type, table_of_contents: { color } };
    default:
      return { object: "block", type: "paragraph", paragraph: { rich_text: richText, color } };
  }
}

interface BlockAppendOptions {
  raw?: boolean;
  type?: string;
  color?: string;
  icon?: string;
  language?: string;
  checked?: boolean;
  json?: string;
}

const blockAppendCommand = new Command("append")
  .description("Append blocks to a page or block")
  .argument("<parent-id>", "the ID of the parent page or block")
  .argument("[text]", "text content for the block")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .option(
    "-T, --type <type>",
    `block type: ${APPEND_BLOCK_TYPES.join(", ")}`,
    "paragraph",
  )
  .option(
    "--color <color>",
    `block color: ${NOTION_COLORS.join(", ")}`,
  )
  .option("--icon <emoji>", "emoji icon (callout blocks)")
  .option("--language <lang>", "code language (code blocks)", "plain text")
  .option("--checked", "mark as checked (to_do blocks)")
  .option(
    "--json <blocks>",
    "raw JSON block(s) to append — overrides text and --type; use - for stdin",
  )
  .addHelpText(
    "after",
    `
Details:
  Appends one or more blocks to the parent. Default type is paragraph.

  Use --type for headings, callouts, dividers, code, quotes, bookmarks,
  lists, to-dos, and table of contents. Use --json for complex structures
  (tables, toggles with children, columns, multi-block appends).

  Types that need no text: divider, table_of_contents
  Types where text is a URL: bookmark

Block types:
  paragraph, heading_1, heading_2, heading_3, callout, quote, divider,
  code, bookmark, to_do, bulleted_list_item, numbered_list_item,
  table_of_contents

Colors:
  Text: default, gray, brown, orange, yellow, green, blue, purple, pink, red
  Background: gray_background, brown_background, orange_background, ...

Examples:
  $ notion-cli block append <id> "Hello, world!"
  $ notion-cli block append <id> "Important heading" --type heading_1 --color purple
  $ notion-cli block append <id> "Note this!" --type callout --icon 🎸 --color blue_background
  $ notion-cli block append <id> --type divider
  $ notion-cli block append <id> "console.log('hi')" --type code --language javascript
  $ notion-cli block append <id> "https://example.com" --type bookmark
  $ notion-cli block append <id> "Buy milk" --type to_do
  $ notion-cli block append <id> "Done already" --type to_do --checked
  $ notion-cli block append <id> --type table_of_contents --color gray_background
  $ notion-cli block append <id> --json '[{"type":"divider","divider":{}}]'
  $ cat blocks.json | notion-cli block append <id> --json -
`,
  )
  .action(async (parentId: string, text: string | undefined, options: BlockAppendOptions) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    let children: unknown[];

    if (options.json) {
      // JSON mode: parse from argument or stdin
      let jsonStr = options.json;
      if (jsonStr === "-") {
        // Read from stdin
        const chunks: Buffer[] = [];
        for await (const chunk of process.stdin) {
          chunks.push(chunk as Buffer);
        }
        jsonStr = Buffer.concat(chunks).toString("utf-8");
      }

      try {
        const parsed = JSON.parse(jsonStr);
        children = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        console.error("Error: --json value is not valid JSON.");
        process.exit(1);
      }
    } else {
      // Flag-based mode
      const blockType = (options.type || "paragraph") as AppendBlockType;

      if (!APPEND_BLOCK_TYPES.includes(blockType)) {
        console.error(`Error: unsupported block type "${options.type}".`);
        console.error(`Supported: ${APPEND_BLOCK_TYPES.join(", ")}`);
        process.exit(1);
      }

      if (options.color && !NOTION_COLORS.includes(options.color as typeof NOTION_COLORS[number])) {
        console.error(`Error: unsupported color "${options.color}".`);
        console.error(`Supported: ${NOTION_COLORS.join(", ")}`);
        process.exit(1);
      }

      // Validate text presence
      const noTextTypes: AppendBlockType[] = ["divider", "table_of_contents"];
      if (!text && !noTextTypes.includes(blockType)) {
        console.error(`Error: text argument is required for block type "${blockType}".`);
        process.exit(1);
      }

      children = [buildBlock(blockType, text, {
        color: options.color,
        icon: options.icon,
        language: options.language,
        checked: options.checked,
      })];
    }

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
  .description("Update a block's text content and/or color")
  .argument("<block-id>", "the ID of the block to update")
  .argument("[text]", "new text content for the block")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .option(
    "--color <color>",
    `block color: ${NOTION_COLORS.join(", ")}`,
  )
  .addHelpText(
    "after",
    `
Details:
  Updates a paragraph, heading, bulleted list item, numbered list item,
  to-do, toggle, callout, or quote block with new text and/or color.

  First retrieves the block to determine its type, then sends the
  update with the correct type key.

  You can update text only, color only, or both at once.

Colors:
  Text: default, gray, brown, orange, yellow, green, blue, purple, pink, red
  Background: gray_background, brown_background, orange_background, ...

Examples:
  $ notion-cli block update <block-id> "Updated text"
  $ notion-cli block update <block-id> --color red_background
  $ notion-cli block update <block-id> "Updated text" --color purple
  $ notion-cli block update <block-id> "Updated text" --raw
`,
  )
  .action(async (blockId: string, text: string | undefined, options: { raw?: boolean; color?: string }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    if (!text && !options.color) {
      console.error("Error: provide text, --color, or both.");
      process.exit(1);
    }

    if (options.color && !NOTION_COLORS.includes(options.color as typeof NOTION_COLORS[number])) {
      console.error(`Error: unsupported color "${options.color}".`);
      console.error(`Supported: ${NOTION_COLORS.join(", ")}`);
      process.exit(1);
    }

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
        console.error(`Error: block type "${blockType}" does not support text/color updates via this command.`);
        process.exit(1);
      }

      const updatePayload: Record<string, unknown> = {};
      if (text !== undefined) {
        updatePayload.rich_text = [{ type: "text", text: { content: text } }];
      } else {
        // Preserve existing rich_text — the API requires it even for color-only updates
        const existingData = (existing as Record<string, any>)[blockType];
        if (existingData?.rich_text) {
          updatePayload.rich_text = existingData.rich_text;
        }
      }
      if (options.color) {
        updatePayload.color = options.color;
      }

      const params: Record<string, unknown> = {
        [blockType]: updatePayload,
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
  .description("Read and manage Notion blocks")
  .addCommand(blockGetCommand)
  .addCommand(blockChildrenCommand)
  .addCommand(blockAppendCommand)
  .addCommand(blockUpdateCommand)
  .addCommand(blockDeleteCommand);
