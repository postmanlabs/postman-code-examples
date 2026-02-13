/**
 * Tests for `user` commands: me, list, get.
 * No test page needed — just exercises user endpoints.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { requireToken, createCli, extractJson } from "./helpers.js";

const token = requireToken();
const cli = createCli(token);

let userId: string;

describe("user", () => {
  it("user me --raw", async () => {
    const { stdout, exitCode } = await cli("user", "me", "--raw");
    assert.equal(exitCode, 0, "should exit 0");
    const user = extractJson(stdout) as Record<string, unknown>;
    assert.ok(user.id, "bot user should have an id");
    assert.equal(user.object, "user");
    assert.equal(user.type, "bot");
  });

  it("user list --raw", async () => {
    const { stdout, exitCode } = await cli("user", "list", "--raw");
    assert.equal(exitCode, 0, "should exit 0");
    const data = extractJson(stdout) as {
      results: Array<{ id: string; name: string }>;
    };
    assert.ok(data.results.length > 0, "should have at least one user");
    userId = data.results[0].id;
  });

  it("user get <id> --raw", async () => {
    assert.ok(userId, "userId must be set by 'user list' first");
    const { stdout, exitCode } = await cli("user", "get", userId, "--raw");
    assert.equal(exitCode, 0, "should exit 0");
    const user = extractJson(stdout) as Record<string, unknown>;
    assert.equal(user.id, userId, "returned user should match requested id");
  });
});
