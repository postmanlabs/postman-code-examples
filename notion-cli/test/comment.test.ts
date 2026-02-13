/**
 * Tests for `comment` commands: add, list, reply.
 * Creates a test page in before(), archives in after().
 */

import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  requireToken, createCli, extractJson, isOAuth,
  setupTestPage, teardownTestPage, type TestContext,
} from "./helpers.js";

const token = requireToken();
const cli = createCli(token);
let ctx: TestContext | undefined;
let discussionId: string;

// Notion API bug: OAuth tokens cannot read comments (returns 404).
// See KNOWN-ISSUES.md for details.
const skipComments = isOAuth();

describe("comment", { skip: skipComments ? "OAuth tokens cannot read comments (known Notion API bug)" : false }, () => {
  before(async () => {
    ctx = await setupTestPage(cli);
  });

  after(async () => {
    await teardownTestPage(ctx);
  });

  it("comment add <page-id> <text> --raw", async () => {
    const { stdout, exitCode } = await cli(
      "comment", "add", ctx!.testPageId, "Integration test comment", "--raw",
    );
    assert.equal(exitCode, 0, "should exit 0");
    const comment = extractJson(stdout) as { id: string; discussion_id: string };
    assert.ok(comment.id, "should have a comment id");
    assert.ok(comment.discussion_id, "should have a discussion id");
    discussionId = comment.discussion_id;
  });

  it("comment list <page-id>", async () => {
    const { stdout, exitCode } = await cli("comment", "list", ctx!.testPageId);
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("Integration test comment"), "should show the comment we added");
  });

  it("comment reply <discussion-id> <text>", async () => {
    assert.ok(discussionId, "discussionId must be set by 'comment add' first");
    const { stdout, exitCode } = await cli(
      "comment", "reply", discussionId, "Integration test reply",
    );
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("Reply added"), "should confirm reply was added");
  });

  it("comment list shows both comments after reply", async () => {
    const { stdout, exitCode } = await cli("comment", "list", ctx!.testPageId);
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("2 comment(s)"), "should now show 2 comments");
  });

  it("comment get <comment-id>", async () => {
    // First add a comment and capture its ID
    const { stdout: addOut } = await cli(
      "comment", "add", ctx!.testPageId, "Comment for get test", "--raw",
    );
    const comment = extractJson(addOut) as { id: string; discussion_id: string };
    assert.ok(comment.id, "should have a comment id");

    // Get the comment by ID
    const { stdout, exitCode } = await cli("comment", "get", comment.id);
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("Comment for get test"), "should show comment text");
    assert.ok(stdout.includes(comment.id), "should show comment ID");
    assert.ok(stdout.includes(comment.discussion_id), "should show discussion ID");
  });

  it("comment get <comment-id> --raw", async () => {
    const { stdout: addOut } = await cli(
      "comment", "add", ctx!.testPageId, "Raw get test", "--raw",
    );
    const comment = extractJson(addOut) as { id: string };

    const { stdout, exitCode } = await cli("comment", "get", comment.id, "--raw");
    assert.equal(exitCode, 0, "should exit 0");
    const result = extractJson(stdout) as { id: string; object: string };
    assert.equal(result.object, "comment");
    assert.equal(result.id, comment.id);
  });
});
