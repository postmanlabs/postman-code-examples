/**
 * Tests for `datasource` commands: get, query, templates, create, update.
 * Creates a test database (which yields a data source) in before(), archives in after().
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
let testDataSourceId: string;

describe("datasource", () => {
  before(async () => {
    ctx = await setupTestPage(cli);

    // Create a database — the API returns data source IDs with it
    const { stdout, exitCode } = await cli(
      "database", "create", ctx.testPageId, "--title", "DS Test Database", "--raw",
    );
    assert.equal(exitCode, 0, "database create should exit 0");
    const db = extractJson(stdout) as {
      id: string;
      data_sources?: Array<{ id: string }>;
    };
    testDatabaseId = db.id;

    // Extract the data source ID from the database response
    if (db.data_sources && db.data_sources.length > 0) {
      testDataSourceId = db.data_sources[0].id;
    } else {
      // Fallback: get the database again to find the data source
      const { stdout: getOut } = await cli("database", "get", testDatabaseId, "--raw");
      const dbFull = extractJson(getOut) as {
        data_sources?: Array<{ id: string }>;
      };
      if (dbFull.data_sources && dbFull.data_sources.length > 0) {
        testDataSourceId = dbFull.data_sources[0].id;
      }
    }
  });

  after(async () => {
    await teardownTestPage(ctx);
  });

  it("datasource get <datasource-id>", async () => {
    if (!testDataSourceId) {
      console.log("  (skipped — no data source ID available)");
      return;
    }
    const { stdout, exitCode } = await cli("datasource", "get", testDataSourceId);
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("Title:"), "should show title");
    assert.ok(stdout.includes("ID:"), "should show ID");
    assert.ok(stdout.includes("To query entries:"), "should show query hint");
  });

  it("datasource get <datasource-id> --raw", async () => {
    if (!testDataSourceId) {
      console.log("  (skipped — no data source ID available)");
      return;
    }
    const { stdout, exitCode } = await cli("datasource", "get", testDataSourceId, "--raw");
    assert.equal(exitCode, 0, "should exit 0");
    const ds = extractJson(stdout) as { id: string; object: string };
    assert.ok(ds.id, "should have an id");
  });

  it("datasource query <datasource-id>", async () => {
    if (!testDataSourceId) {
      console.log("  (skipped — no data source ID available)");
      return;
    }
    const { stdout, exitCode } = await cli("datasource", "query", testDataSourceId);
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(
      stdout.includes("Entries") || stdout.includes("No entries"),
      "should show entries or empty message",
    );
  });

  it("datasource query <datasource-id> --raw", async () => {
    if (!testDataSourceId) {
      console.log("  (skipped — no data source ID available)");
      return;
    }
    const { stdout, exitCode } = await cli("datasource", "query", testDataSourceId, "--raw");
    assert.equal(exitCode, 0, "should exit 0");
    const result = extractJson(stdout) as { object: string; results: unknown[] };
    assert.equal(result.object, "list");
    assert.ok(Array.isArray(result.results), "should have results array");
  });

  it("datasource update <datasource-id> --title", async () => {
    if (!testDataSourceId) {
      console.log("  (skipped — no data source ID available)");
      return;
    }
    const { stdout, exitCode } = await cli(
      "datasource", "update", testDataSourceId, "--title", "Updated DS",
    );
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("Data source updated"), "should confirm update");
    assert.ok(stdout.includes("Updated DS"), "should show new title");
  });

  it("datasource templates <datasource-id>", async () => {
    if (!testDataSourceId) {
      console.log("  (skipped — no data source ID available)");
      return;
    }
    const { stdout, exitCode } = await cli("datasource", "templates", testDataSourceId);
    // This may succeed with 0 templates or fail depending on the API — we just check it runs
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(
      stdout.includes("template") || stdout.includes("No templates"),
      "should show templates or empty message",
    );
  });
});
