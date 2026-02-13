/**
 * Tests for the `search` command variants.
 * No test page needed — searches existing workspace content.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { requireToken, createCli, parseIds } from "./helpers.js";

const token = requireToken();
const cli = createCli(token);

describe("search", () => {
  it("search (default — pages)", async () => {
    const { stdout, exitCode } = await cli("search");
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("Found"), "should report results");
  });

  it("search --filter database", async () => {
    const { stdout, exitCode } = await cli("search", "--filter", "database");
    assert.equal(exitCode, 0, "should exit 0");
  });

  it("search --filter all", async () => {
    const { stdout, exitCode } = await cli("search", "--filter", "all");
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("Found"), "should report results");
  });

  it("search with query finds test pages", async () => {
    const { stdout, exitCode } = await cli("search", "[test] notion-cli");
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(
      stdout.includes("Found") || stdout.includes("No pages found"),
      "should report results or empty",
    );
  });

  it("search with --limit", async () => {
    const { stdout, exitCode } = await cli("search", "-n", "2");
    assert.equal(exitCode, 0, "should exit 0");
    const countMatch = stdout.match(/Found (\d+) result/);
    assert.ok(countMatch, "should report result count");
    assert.ok(parseInt(countMatch![1], 10) <= 2, "should respect --limit");
  });
});
