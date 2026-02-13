/**
 * comment command group
 *   comment list <page-or-block-id>    — list comments
 *   comment add <page-id> <text>       — add a comment to a page
 *   comment reply <discussion-id> <text> — reply to a comment thread
 */

import { Command } from "commander";
import { createNotionClient } from "../src/postman/notion-api/index.js";
import { getBearerToken, formatDate } from "../helpers.js";

// -- comment list -------------------------------------------------------------

const commentListCommand = new Command("list")
  .description("List comments on a page or block")
  .argument("<block-id>", "the ID of the page or block to get comments for")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .option("-c, --cursor <cursor>", "pagination cursor from a previous request")
  .option("-n, --limit <number>", "max results per page, 1-100", "100")
  .addHelpText(
    "after",
    `
Details:
  Returns comments on a page or block. Pages are also blocks,
  so a page ID works here too.

  Comments are grouped by discussion_id — comments with the same
  discussion_id are part of the same thread.

Examples:
  $ notion-cli comment list <page-id>
  $ notion-cli comment list <page-id> --raw
`,
  )
  .action(async (blockId: string, options: { raw?: boolean; cursor?: string; limit: string }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);
    const pageSize = Math.min(parseInt(options.limit, 10) || 100, 100);

    try {
      const response = await notion.comments.list(blockId, {
        start_cursor: options.cursor,
        page_size: pageSize,
      });

      if (options.raw) {
        console.log(JSON.stringify(response, null, 2));
        return;
      }

      if (response.results.length === 0) {
        console.log("No comments found.");
        return;
      }

      console.log(`Found ${response.results.length} comment(s):\n`);

      for (const comment of response.results) {
        const text = comment.rich_text.map((t) => t.plain_text).join("") || "(empty)";
        const created = formatDate(comment.created_time);
        const author = comment.created_by.id;

        console.log(`  💬 ${text}`);
        console.log(`     ID: ${comment.id}`);
        console.log(`     Discussion: ${comment.discussion_id}`);
        console.log(`     Author: ${author}`);
        console.log(`     Created: ${created}`);
        console.log();
      }

      if (response.has_more && response.next_cursor) {
        console.log(`📑 More results available. Use --cursor to get next page:`);
        console.log(`   notion-cli comment list ${blockId} --cursor ${response.next_cursor}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- comment add --------------------------------------------------------------

const commentAddCommand = new Command("add")
  .description("Add a comment to a page")
  .argument("<page-id>", "the ID of the page to comment on")
  .argument("<text>", "the comment text")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .addHelpText(
    "after",
    `
Details:
  Creates a new top-level comment thread on the specified page.
  The text is added as a plain text comment.

Examples:
  $ notion-cli comment add <page-id> "This looks great!"
  $ notion-cli comment add <page-id> "Needs review" --raw
`,
  )
  .action(async (pageId: string, text: string, options: { raw?: boolean }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    try {
      const comment = await notion.comments.create({
        parent: { page_id: pageId },
        rich_text: [{ text: { content: text } }],
      });

      if (options.raw) {
        console.log(JSON.stringify(comment, null, 2));
        return;
      }

      console.log(`Comment added.`);
      console.log(`  ID: ${comment.id}`);
      console.log(`  Discussion: ${comment.discussion_id}`);
      console.log(`  Created: ${formatDate(comment.created_time)}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- comment reply ------------------------------------------------------------

const commentReplyCommand = new Command("reply")
  .description("Reply to a comment thread")
  .argument("<discussion-id>", "the discussion ID to reply to")
  .argument("<text>", "the reply text")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .addHelpText(
    "after",
    `
Details:
  Replies to an existing comment thread. The discussion_id can be
  found in the output of "comment list".

Examples:
  $ notion-cli comment reply <discussion-id> "I agree!"
  $ notion-cli comment reply <discussion-id> "Done." --raw
`,
  )
  .action(async (discussionId: string, text: string, options: { raw?: boolean }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    try {
      const comment = await notion.comments.create({
        discussion_id: discussionId,
        rich_text: [{ text: { content: text } }],
      });

      if (options.raw) {
        console.log(JSON.stringify(comment, null, 2));
        return;
      }

      console.log(`Reply added.`);
      console.log(`  ID: ${comment.id}`);
      console.log(`  Discussion: ${comment.discussion_id}`);
      console.log(`  Created: ${formatDate(comment.created_time)}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- comment get --------------------------------------------------------------

const commentGetCommand = new Command("get")
  .description("Retrieve a single comment by ID")
  .argument("<comment-id>", "the ID of the comment to retrieve")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .addHelpText(
    "after",
    `
Details:
  Retrieves a single comment by its ID. Shows the comment text,
  discussion thread ID, author, and creation date.

  Comment IDs can be found in the output of "comment list".

Examples:
  $ notion-cli comment get <comment-id>
  $ notion-cli comment get <comment-id> --raw
`,
  )
  .action(async (commentId: string, options: { raw?: boolean }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    try {
      const comment = await notion.comments.retrieve(commentId);

      if (options.raw) {
        console.log(JSON.stringify(comment, null, 2));
        return;
      }

      const text = comment.rich_text.map((t) => t.plain_text).join("") || "(empty)";
      console.log(`💬 ${text}`);
      console.log(`  ID: ${comment.id}`);
      console.log(`  Discussion: ${comment.discussion_id}`);
      console.log(`  Author: ${comment.created_by.id}`);
      console.log(`  Created: ${formatDate(comment.created_time)}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- comment command group ----------------------------------------------------

export const commentCommand = new Command("comment")
  .description("Read and manage comments on pages and blocks")
  .addCommand(commentListCommand)
  .addCommand(commentGetCommand)
  .addCommand(commentAddCommand)
  .addCommand(commentReplyCommand);
