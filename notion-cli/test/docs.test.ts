/**
 * Tests for the `docs` command.
 * No API calls needed — just verifies the built-in guide content.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { requireToken, createCli } from "./helpers.js";

const token = requireToken();
const cli = createCli(token);

describe("docs", () => {
  it("docs prints guide content", async () => {
    const { stdout, exitCode } = await cli("docs");
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("MAPPING A WORKSPACE"), "should include mapping section");
    assert.ok(stdout.includes("AUTHENTICATION"), "should include authentication section");
    assert.ok(stdout.includes("WRITING CONTENT"), "should include writing content section");
  });
});
