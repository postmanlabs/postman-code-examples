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

  it("page get <id> --raw outputs valid JSON", async () => {
    const { stdout, exitCode } = await cli("page", "get", ctx!.testPageId, "--raw");
    assert.equal(exitCode, 0, "should exit 0");
    // Must be valid JSON — no formatted text mixed in
    const data = JSON.parse(stdout) as { page: { id: string; object: string }; blocks: unknown[] };
    assert.ok(data.page, "raw output should have a 'page' key");
    assert.equal(data.page.object, "page", "page should be a page object");
    assert.equal(data.page.id, ctx!.testPageId, "page ID should match");
    assert.ok(Array.isArray(data.blocks), "raw output should have a 'blocks' array");
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

  it("page update --set writes typed property values", async () => {
    // Create a database with properties, then a page in it, then update via --set
    const { stdout: dbOut } = await cli(
      "database", "create", ctx!.testPageId, "--title", "Set Test DB", "--raw",
    );
    const db = extractJson(dbOut) as { id: string; data_sources?: Array<{ id: string }> };
    const dsId = db.data_sources?.[0]?.id;

    // Add columns to the data source
    if (dsId) {
      await cli("datasource", "update", dsId, "-p", "Artist:rich_text", "-p", "Year:number", "-p", "Genre:select:Rock,Jazz");
    }

    // Create a page (database entry)
    const { stdout: pageOut } = await cli(
      "page", "create", db.id, "--database", "--title", "Test Entry", "--raw",
    );
    const entry = extractJson(pageOut) as { id: string };

    // Set property values
    const { stdout, exitCode } = await cli(
      "page", "update", entry.id,
      "-s", "Artist:rich_text:Radiohead",
      "-s", "Year:number:1997",
      "-s", "Genre:select:Rock",
    );
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("Page updated"), "should confirm update");

    // Verify via --raw
    const { stdout: rawOut } = await cli("page", "update", entry.id, "-s", "Artist:rich_text:Pavement", "--raw");
    const updated = extractJson(rawOut) as {
      id: string;
      properties?: Record<string, { type: string; rich_text?: Array<{ plain_text: string }> }>;
    };
    assert.equal(updated.id, entry.id);
    assert.ok(updated.properties?.["Artist"], "should have Artist property");

    // Clean up
    await cli("page", "archive", entry.id);
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

  it("page update --icon sets emoji icon", async () => {
    const { stdout, exitCode } = await cli(
      "page", "update", ctx!.testPageId, "--icon", "🧪",
    );
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("Page updated"), "should confirm update");
    assert.ok(stdout.includes("🧪"), "should show icon in output");

    // Verify via --raw
    const { stdout: rawOut } = await cli("page", "update", ctx!.testPageId, "--icon", "📚", "--raw");
    const page = extractJson(rawOut) as { icon?: { type: string; emoji: string } };
    assert.equal(page.icon?.type, "emoji");
    assert.equal(page.icon?.emoji, "📚");
  });

  it("page update --cover sets cover image", async () => {
    const coverUrl = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800";
    const { stdout, exitCode } = await cli(
      "page", "update", ctx!.testPageId, "--cover", coverUrl,
    );
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("Page updated"), "should confirm update");
    assert.ok(stdout.includes("Cover:"), "should show cover in output");

    // Verify via --raw
    const { stdout: rawOut } = await cli("page", "update", ctx!.testPageId, "--cover", coverUrl, "--raw");
    const page = extractJson(rawOut) as { cover?: { type: string; external?: { url: string } } };
    assert.equal(page.cover?.type, "external");
    assert.equal(page.cover?.external?.url, coverUrl);
  });

  it("page update --icon none removes icon", async () => {
    // First set an icon
    await cli("page", "update", ctx!.testPageId, "--icon", "🎸");

    // Then remove it
    const { stdout, exitCode } = await cli(
      "page", "update", ctx!.testPageId, "--icon", "none", "--raw",
    );
    assert.equal(exitCode, 0, "should exit 0");
    const page = extractJson(stdout) as { icon: unknown };
    assert.equal(page.icon, null, "icon should be null after removal");
  });

  it("page update --icon + --cover + --title combined", async () => {
    const { stdout, exitCode } = await cli(
      "page", "update", ctx!.testPageId,
      "--title", "Combined update test",
      "--icon", "🚀",
      "--cover", "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
    );
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("Page updated"));
    assert.ok(stdout.includes("🚀"), "should show icon");
    assert.ok(stdout.includes("Cover:"), "should show cover");
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
