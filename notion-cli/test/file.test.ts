/**
 * Tests for `file` commands: upload, list, get.
 * Uses a small temporary file for the upload test.
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import {
  requireToken, createCli, extractJson, PROJECT_DIR,
} from "./helpers.js";

const token = requireToken();
const cli = createCli(token);
let testFilePath: string;
let uploadedFileId: string;

describe("file", () => {
  before(() => {
    // Create a small test file
    testFilePath = join(PROJECT_DIR, "test", "tmp-test-upload.txt");
    writeFileSync(testFilePath, "Hello from integration test\n");
  });

  after(() => {
    // Clean up the temp file
    try {
      unlinkSync(testFilePath);
    } catch {
      // ignore
    }
  });

  it("file upload <file-path>", async () => {
    const { stdout, exitCode } = await cli("file", "upload", testFilePath);
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("File uploaded"), "should confirm upload");
    assert.ok(stdout.includes("tmp-test-upload.txt"), "should show file name");
    assert.ok(stdout.includes("Status:"), "should show status");

    // Extract the ID from formatted output
    const idMatch = stdout.match(/ID:\s+([0-9a-f-]{36})/);
    assert.ok(idMatch, "should show file upload ID");
    uploadedFileId = idMatch![1];
  });

  it("file upload <file-path> --raw", async () => {
    const { stdout, exitCode } = await cli("file", "upload", testFilePath, "--raw");
    assert.equal(exitCode, 0, "should exit 0");
    const file = extractJson(stdout) as { id: string; object: string; status: string; filename: string };
    assert.equal(file.object, "file_upload");
    assert.ok(file.id, "should have an id");
    assert.ok(file.filename, "should have a filename");
  });

  it("file list", async () => {
    const { stdout, exitCode } = await cli("file", "list");
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(
      stdout.includes("file upload") || stdout.includes("No file uploads"),
      "should show file uploads or empty message",
    );
  });

  it("file list --raw", async () => {
    const { stdout, exitCode } = await cli("file", "list", "--raw");
    assert.equal(exitCode, 0, "should exit 0");
    const result = extractJson(stdout) as { object: string; results: unknown[] };
    assert.equal(result.object, "list");
    assert.ok(Array.isArray(result.results), "should have results array");
  });

  it("file get <file-id>", async () => {
    assert.ok(uploadedFileId, "uploadedFileId must be set by 'file upload' first");
    const { stdout, exitCode } = await cli("file", "get", uploadedFileId);
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("tmp-test-upload.txt"), "should show file name");
    assert.ok(stdout.includes(uploadedFileId), "should show file ID");
  });

  it("file get <file-id> --raw", async () => {
    assert.ok(uploadedFileId, "uploadedFileId must be set by 'file upload' first");
    const { stdout, exitCode } = await cli("file", "get", uploadedFileId, "--raw");
    assert.equal(exitCode, 0, "should exit 0");
    const file = extractJson(stdout) as { id: string; object: string };
    assert.equal(file.object, "file_upload");
    assert.equal(file.id, uploadedFileId);
  });
});
