/**
 * Tests for the `integration` command (e.g., integration pages).
 * No test page needed — reads existing workspace structure.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { requireToken, createCli } from "./helpers.js";

const token = requireToken();
const cli = createCli(token);

describe("integration", () => {
  it("integration pages", async () => {
    const { stdout, exitCode } = await cli("integration", "pages");
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(
      stdout.includes("root page") || stdout.includes("No root"),
      "should report root pages or empty",
    );
  });
});
