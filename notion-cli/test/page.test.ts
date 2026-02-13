/**
 * Tests for `page` commands: get, property, update, create, archive.
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

describe("page", () => {
  before(async () => {
    ctx = await setupTestPage(cli);
  });

  after(async () => {
    await teardownTestPage(ctx);
  });

  it("page get <id>", async () => {
    const { stdout, exitCode } = await cli("page", "get", ctx!.testPageId);
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("Title:"), "should show page title");
    assert.ok(stdout.includes("ID:"), "should show page ID");
    assert.ok(stdout.includes("Archived:"), "should show archived status");
    assert.ok(stdout.includes("URL:"), "should show page URL");
  });

  it("page property <id> title", async () => {
    const { stdout, exitCode } = await cli("page", "property", ctx!.testPageId, "title");
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("[test] notion-cli"), "should contain the test page title");
  });

  it("page update <id> --title --raw", async () => {
    const newTitle = `[test] updated ${Date.now()}`;
    const { stdout, exitCode } = await cli(
      "page", "update", ctx!.testPageId, "--title", newTitle, "--raw",
    );
    assert.equal(exitCode, 0, "should exit 0");
    const page = extractJson(stdout) as { id: string; object: string };
    assert.equal(page.object, "page");
    assert.equal(page.id, ctx!.testPageId);
  });

  it("page create and archive lifecycle", async () => {
    // Create a child page
    const { stdout: createOut, exitCode: createCode } = await cli(
      "page", "create", ctx!.testPageId, "--title", "Temp child page", "--raw",
    );
    assert.equal(createCode, 0, "create should exit 0");
    const page = extractJson(createOut) as { id: string; object: string };
    assert.equal(page.object, "page");
    assert.ok(page.id, "should have a page id");

    // Archive it
    const { stdout: archiveOut, exitCode: archiveCode } = await cli("page", "archive", page.id);
    assert.equal(archiveCode, 0, "archive should exit 0");
    assert.ok(archiveOut.includes("Page archived"), "should confirm archive");
    assert.ok(archiveOut.includes("Archived: true"), "should show archived: true");
  });

  it("page move <id> --parent <new-parent-id>", async () => {
    // Create two child pages
    const { stdout: out1 } = await cli(
      "page", "create", ctx!.testPageId, "--title", "Move target", "--raw",
    );
    const target = extractJson(out1) as { id: string };

    const { stdout: out2 } = await cli(
      "page", "create", ctx!.testPageId, "--title", "Page to move", "--raw",
    );
    const movee = extractJson(out2) as { id: string };

    // Move the second page under the first
    const { stdout, exitCode } = await cli(
      "page", "move", movee.id, "--parent", target.id,
    );
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("Page moved"), "should confirm move");
    assert.ok(stdout.includes(target.id), "should show new parent ID");

    // Verify with --raw
    const { stdout: rawOut, exitCode: rawCode } = await cli(
      "page", "move", movee.id, "--parent", ctx!.testPageId, "--raw",
    );
    assert.equal(rawCode, 0, "raw move should exit 0");
    const moved = extractJson(rawOut) as { id: string; object: string };
    assert.equal(moved.object, "page");

    // Clean up
    await cli("page", "archive", movee.id);
    await cli("page", "archive", target.id);
  });
});
