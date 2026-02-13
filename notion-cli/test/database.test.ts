/**
 * Tests for `database` commands: create, update, get, list.
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
let testDatabaseId: string;

describe("database", () => {
  before(async () => {
    ctx = await setupTestPage(cli);
  });

  after(async () => {
    await teardownTestPage(ctx);
  });

  it("database create <parent-page-id> --title --raw", async () => {
    const { stdout, exitCode } = await cli(
      "database", "create", ctx!.testPageId, "--title", "Test Database", "--raw",
    );
    assert.equal(exitCode, 0, "should exit 0");
    const db = extractJson(stdout) as { id: string; object: string };
    assert.equal(db.object, "database");
    assert.ok(db.id, "should have a database id");
    testDatabaseId = db.id;
  });

  it("database update <database-id> --title", async () => {
    assert.ok(testDatabaseId, "testDatabaseId must be set by 'database create' first");
    const { stdout, exitCode } = await cli(
      "database", "update", testDatabaseId, "--title", "Updated Test Database",
    );
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("Database updated"), "should confirm update");
    assert.ok(stdout.includes("Updated Test Database"), "should show new title");
  });

  it("database get <id>", async () => {
    assert.ok(testDatabaseId, "need a database ID from create");
    const { stdout, exitCode } = await cli("database", "get", testDatabaseId);
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("Title:"), "should show database title");
    // Note: 2025-09-03 API may not return properties on a freshly created
    // database, so we don't assert Schema is present.
  });

  it("database get shows data sources when present", async () => {
    assert.ok(testDatabaseId, "need a database ID from create");
    const { stdout, exitCode } = await cli("database", "get", testDatabaseId);
    assert.equal(exitCode, 0, "should exit 0");
    // The 2025-09-03 API returns data_sources on databases.
    assert.ok(stdout.includes("To list entries:"), "should show list hint");
  });

  it("database list <id>", async () => {
    assert.ok(testDatabaseId, "need a database ID from create");
    const { stdout, exitCode } = await cli("database", "list", testDatabaseId);
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(
      stdout.includes("Entries") || stdout.includes("No entries"),
      "should show entries or empty message",
    );
  });
});
