/**
 * Tests for `block` commands: get, children, append, update, delete.
 * Creates a test page in before(), archives in after().
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  requireToken, createCli, extractJson,
  setupTestPage, teardownTestPage, type TestContext,
} from "./helpers.js";

const token = requireToken();
const cli = createCli(token);
let ctx: TestContext | undefined;
let appendedBlockId: string;

describe("block", () => {
  before(async () => {
    ctx = await setupTestPage(cli);
  });

  after(async () => {
    await teardownTestPage(ctx);
  });

  it("block get <page-id> (pages are blocks)", async () => {
    const { stdout, exitCode } = await cli("block", "get", ctx!.testPageId);
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("Type:"), "should show block type");
    assert.ok(stdout.includes("ID:"), "should show block ID");
  });

  it("block children <page-id>", async () => {
    const { stdout, exitCode } = await cli("block", "children", ctx!.testPageId);
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(
      stdout.includes("No child blocks") || stdout.includes("block(s)"),
      "should report blocks or empty",
    );
  });

  it("block append <page-id> <text> --raw", async () => {
    const { stdout, exitCode } = await cli(
      "block", "append", ctx!.testPageId, "Integration test paragraph", "--raw",
    );
    assert.equal(exitCode, 0, "should exit 0");
    const response = extractJson(stdout) as { results: Array<{ id: string; type: string }> };
    assert.ok(response.results.length > 0, "should have appended at least one block");
    assert.equal(response.results[0].type, "paragraph");
    appendedBlockId = response.results[0].id;
  });

  it("block update <block-id> <text>", async () => {
    assert.ok(appendedBlockId, "appendedBlockId must be set by 'block append' first");
    const { stdout, exitCode } = await cli(
      "block", "update", appendedBlockId, "Updated paragraph text",
    );
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("Block updated"), "should confirm update");
  });

  it("block delete <block-id>", async () => {
    assert.ok(appendedBlockId, "appendedBlockId must be set by 'block append' first");
    const { stdout, exitCode } = await cli("block", "delete", appendedBlockId);
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("Block deleted"), "should confirm deletion");
    assert.ok(stdout.includes("Archived: true"), "should show archived: true");
  });
});
