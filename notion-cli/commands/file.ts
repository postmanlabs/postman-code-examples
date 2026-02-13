/**
 * file command group
 *   file upload <file-path>  — upload a file (create + send + complete)
 *   file list                — list file uploads
 *   file get <file-id>       — retrieve a file upload
 */

import { Command } from "commander";
import { readFileSync, statSync } from "fs";
import { basename } from "path";
import { createNotionClient } from "../src/postman/notion-api/index.js";
import { getBearerToken, formatDate, lookup as mimeLookup } from "../helpers.js";

// -- file upload --------------------------------------------------------------

const fileUploadCommand = new Command("upload")
  .description("Upload a file to Notion")
  .argument("<file-path>", "path to the file to upload")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .addHelpText(
    "after",
    `
Details:
  Uploads a local file to Notion in three steps:
    1. Creates a file upload (reserves an upload slot)
    2. Sends the file data (multipart/form-data)
    3. Completes the upload

  The resulting file upload ID can be used to attach the file
  to a page or block via the API.

Examples:
  $ notion-cli file upload ./report.pdf
  $ notion-cli file upload ./image.png --raw
`,
  )
  .action(async (filePath: string, options: { raw?: boolean }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    try {
      const stat = statSync(filePath);
      const fileName = basename(filePath);
      const fileData = readFileSync(filePath);
      const contentType = mimeLookup(fileName);

      console.log(`📎 Uploading ${fileName} (${stat.size} bytes)...\n`);

      // Step 1: Create the file upload
      const upload = await notion.fileUploads.create({
        mode: "single_part",
        filename: fileName,
        content_type: contentType,
      });

      // Step 2: Send the file data as multipart/form-data
      const blob = new Blob([fileData], { type: contentType });
      const sent = await notion.fileUploads.send(upload.id, blob, fileName);

      // Step 3: Complete (only needed for multi_part uploads)
      // For single_part, the send step marks it as "uploaded" automatically.
      let completed = sent;
      if (sent.status === "pending" && sent.number_of_parts) {
        completed = await notion.fileUploads.complete(upload.id);
      }

      if (options.raw) {
        console.log(JSON.stringify(completed, null, 2));
        return;
      }

      console.log(`File uploaded.`);
      console.log(`  Filename: ${completed.filename}`);
      console.log(`  ID: ${completed.id}`);
      console.log(`  Content type: ${completed.content_type}`);
      console.log(`  Size: ${completed.content_length ?? "unknown"} bytes`);
      console.log(`  Status: ${completed.status}`);
      console.log(`  Created: ${formatDate(completed.created_time)}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- file list ----------------------------------------------------------------

const fileListCommand = new Command("list")
  .description("List file uploads")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .option("-n, --limit <number>", "max results per page, 1-100", "20")
  .option("-c, --cursor <cursor>", "pagination cursor from a previous request")
  .addHelpText(
    "after",
    `
Details:
  Lists file uploads for the current integration. Shows each
  file's name, ID, size, status, and creation date.

Examples:
  $ notion-cli file list
  $ notion-cli file list --limit 50
  $ notion-cli file list --raw
`,
  )
  .action(async (options: { raw?: boolean; limit: string; cursor?: string }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);
    const pageSize = Math.min(parseInt(options.limit, 10) || 20, 100);

    try {
      const response = await notion.fileUploads.list({
        page_size: pageSize,
        start_cursor: options.cursor,
      });

      if (options.raw) {
        console.log(JSON.stringify(response, null, 2));
        return;
      }

      if (response.results.length === 0) {
        console.log("No file uploads found.");
        return;
      }

      console.log(`Found ${response.results.length} file upload(s):\n`);

      for (const file of response.results) {
        console.log(`  📎 ${file.filename || "(unnamed)"}`);
        console.log(`     ID: ${file.id}`);
        console.log(`     Content type: ${file.content_type || "unknown"}`);
        console.log(`     Size: ${file.content_length ?? "unknown"} bytes`);
        console.log(`     Status: ${file.status}`);
        console.log(`     Created: ${formatDate(file.created_time)}`);
        console.log();
      }

      if (response.has_more && response.next_cursor) {
        console.log(`📑 More results available. Use --cursor to get next page:`);
        console.log(`   notion-cli file list --cursor ${response.next_cursor}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- file get -----------------------------------------------------------------

const fileGetCommand = new Command("get")
  .description("Retrieve a file upload by ID")
  .argument("<file-id>", "the ID of the file upload to retrieve")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .addHelpText(
    "after",
    `
Details:
  Retrieves a single file upload by its ID. Shows the file's
  name, size, status, and creation date.

Examples:
  $ notion-cli file get <file-id>
  $ notion-cli file get <file-id> --raw
`,
  )
  .action(async (fileId: string, options: { raw?: boolean }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    try {
      const file = await notion.fileUploads.retrieve(fileId);

      if (options.raw) {
        console.log(JSON.stringify(file, null, 2));
        return;
      }

      console.log(`📎 ${file.filename || "(unnamed)"}`);
      console.log(`  ID: ${file.id}`);
      console.log(`  Content type: ${file.content_type || "unknown"}`);
      console.log(`  Size: ${file.content_length ?? "unknown"} bytes`);
      console.log(`  Status: ${file.status}`);
      console.log(`  Created: ${formatDate(file.created_time)}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- file command group -------------------------------------------------------

export const fileCommand = new Command("file")
  .description("Upload and manage files")
  .addCommand(fileUploadCommand)
  .addCommand(fileListCommand)
  .addCommand(fileGetCommand);
