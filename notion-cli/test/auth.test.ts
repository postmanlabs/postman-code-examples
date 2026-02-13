/**
 * Auth command tests for auth-internal and auth-public.
 *
 * Uses an isolated temp HOME directory so tests never touch the real
 * ~/.notion-cli/config.json.
 *
 * The "auth-public (live API)" section requires real OAuth credentials:
 *   NOTION_OAUTH_CLIENT_ID, NOTION_OAUTH_CLIENT_SECRET
 * and optionally NOTION_OAUTH_TOKEN for introspect tests.
 * Those tests skip cleanly when the env vars are absent.
 *
 * Run:
 *   npm run test:auth
 */

import { describe, it, after } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CLI_ENTRY, PROJECT_DIR, extractJson } from "./helpers.js";
import { oauthToken } from "../src/postman/notion-api/oauth/token/client.js";
import { oauthIntrospect } from "../src/postman/notion-api/oauth/introspect/client.js";

// ---------------------------------------------------------------------------
// Isolated HOME — tests won't touch real config
// ---------------------------------------------------------------------------

const testHome = mkdtempSync(join(tmpdir(), "notion-cli-auth-test-"));

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function authCli(...args: string[]): Promise<CliResult> {
  return new Promise((res) => {
    const env: Record<string, string | undefined> = { ...process.env, HOME: testHome };
    // Strip auth env vars so tests start from a clean slate
    delete env.NOTION_TOKEN;
    delete env.NOTION_OAUTH_CLIENT_ID;
    delete env.NOTION_OAUTH_CLIENT_SECRET;

    execFile(
      process.execPath,
      ["--import", "tsx", CLI_ENTRY, ...args],
      { env, timeout: 30_000, cwd: PROJECT_DIR },
      (error, stdout, stderr) => {
        const exitCode = error
          ? typeof error.code === "number" ? error.code : 1
          : 0;
        res({ stdout: stdout ?? "", stderr: stderr ?? "", exitCode });
      },
    );
  });
}

function readTestConfig(): Record<string, string> {
  try {
    return JSON.parse(
      readFileSync(join(testHome, ".notion-cli", "config.json"), "utf-8"),
    );
  } catch {
    return {};
  }
}

after(() => {
  rmSync(testHome, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// auth-internal
// ---------------------------------------------------------------------------

describe("auth-internal", () => {

  it("status shows not configured when no token", async () => {
    const { stdout, exitCode } = await authCli("auth-internal", "status");
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("No integration token configured"), stdout);
  });

  it("set saves token to config file", async () => {
    const { stdout, exitCode } = await authCli("auth-internal", "set", "secret_test_abc123");
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("Token saved"), stdout);

    const config = readTestConfig();
    assert.equal(config.NOTION_TOKEN, "secret_test_abc123");
    assert.equal(config.auth_method, "internal");
  });

  it("status shows configured after set", async () => {
    const { stdout, exitCode } = await authCli("auth-internal", "status");
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("Integration token configured"), stdout);
    assert.ok(stdout.includes("secret_test_"), stdout);
  });

  it("clear removes token", async () => {
    const { stdout, exitCode } = await authCli("auth-internal", "clear");
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("Integration token removed"), stdout);

    const config = readTestConfig();
    assert.equal(config.NOTION_TOKEN, undefined);
    assert.equal(config.auth_method, undefined);
  });

  it("clear when already empty shows message", async () => {
    const { stdout, exitCode } = await authCli("auth-internal", "clear");
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("No stored token"), stdout);
  });
});

// ---------------------------------------------------------------------------
// auth-public
// ---------------------------------------------------------------------------

describe("auth-public", () => {

  it("status shows not configured when no credentials", async () => {
    const { stdout, exitCode } = await authCli("auth-public", "status");
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("not configured"), stdout);
  });

  it("login fails without client credentials", async () => {
    const { stderr, exitCode } = await authCli("auth-public", "login");
    assert.equal(exitCode, 1);
    assert.ok(stderr.includes("No OAuth client credentials"), stderr);
  });

  it("logout when not authenticated shows message", async () => {
    const { stdout, exitCode } = await authCli("auth-public", "logout");
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("No OAuth credentials to remove"), stdout);
  });
});

// ---------------------------------------------------------------------------
// help text
// ---------------------------------------------------------------------------

describe("auth help text", () => {

  it("auth-internal --help shows setup steps", async () => {
    const { stdout, exitCode } = await authCli("auth-internal", "--help");
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("notion.so/my-integrations"), stdout);
    assert.ok(stdout.includes("set"), stdout);
    assert.ok(stdout.includes("status"), stdout);
    assert.ok(stdout.includes("clear"), stdout);
  });

  it("auth-public --help shows setup steps", async () => {
    const { stdout, exitCode } = await authCli("auth-public", "--help");
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("setup"), stdout);
    assert.ok(stdout.includes("login"), stdout);
    assert.ok(stdout.includes("introspect"), stdout);
    assert.ok(stdout.includes("revoke"), stdout);
    assert.ok(stdout.includes("logout"), stdout);
    assert.ok(stdout.includes("client ID"), stdout);
  });
});

// ---------------------------------------------------------------------------
// auth-public — live API tests (require real OAuth credentials)
// ---------------------------------------------------------------------------

const oauthClientId = process.env.NOTION_OAUTH_CLIENT_ID;
const oauthClientSecret = process.env.NOTION_OAUTH_CLIENT_SECRET;
const oauthAccessToken = process.env.NOTION_OAUTH_TOKEN;

/**
 * CLI runner that passes OAuth client credentials via env vars.
 * Uses the isolated HOME so it doesn't touch real config.
 */
function oauthCli(...args: string[]): Promise<CliResult> {
  return new Promise((res) => {
    const env: Record<string, string | undefined> = {
      ...process.env,
      HOME: testHome,
      NOTION_OAUTH_CLIENT_ID: oauthClientId,
      NOTION_OAUTH_CLIENT_SECRET: oauthClientSecret,
    };
    // Don't inherit a token — auth-public commands use client creds
    delete env.NOTION_TOKEN;

    execFile(
      process.execPath,
      ["--import", "tsx", CLI_ENTRY, ...args],
      { env, timeout: 30_000, cwd: PROJECT_DIR },
      (error, stdout, stderr) => {
        const exitCode = error
          ? typeof error.code === "number" ? error.code : 1
          : 0;
        res({ stdout: stdout ?? "", stderr: stderr ?? "", exitCode });
      },
    );
  });
}

describe("auth-public (live API)", { skip: !oauthClientId || !oauthClientSecret ? "NOTION_OAUTH_CLIENT_ID and NOTION_OAUTH_CLIENT_SECRET not set" : undefined }, () => {

  // -- Client-level tests ---------------------------------------------------

  it("token client rejects an invalid authorization code", async () => {
    try {
      await oauthToken(
        {
          grant_type: "authorization_code",
          code: "invalid_code_for_testing",
          redirect_uri: "http://localhost:8787/callback",
        },
        oauthClientId!,
        oauthClientSecret!,
      );
      assert.fail("should have thrown on invalid code");
    } catch (err) {
      assert.ok(err instanceof Error, "should throw an Error");
      assert.ok(
        err.message.includes("Notion API error"),
        `should be a Notion API error, got: ${err.message}`,
      );
    }
  });

  it("introspect client returns token metadata", { skip: !oauthAccessToken ? "NOTION_OAUTH_TOKEN not set" : undefined }, async () => {
    const result = await oauthIntrospect(oauthAccessToken!, oauthClientId!, oauthClientSecret!);
    assert.ok(typeof result.active === "boolean", "should have an 'active' field");
    if (result.active) {
      assert.ok(result.bot_id, "active token should have a bot_id");
    }
  });

  // -- CLI command tests ----------------------------------------------------

  it("auth-public introspect --raw", { skip: !oauthAccessToken ? "NOTION_OAUTH_TOKEN not set" : undefined }, async () => {
    const { stdout, exitCode } = await oauthCli("auth-public", "introspect", oauthAccessToken!, "--raw");
    assert.equal(exitCode, 0, "should exit 0");
    const result = extractJson(stdout) as { active: boolean };
    assert.ok(typeof result.active === "boolean", "should have an active field");
  });

  it("auth-public introspect (formatted)", { skip: !oauthAccessToken ? "NOTION_OAUTH_TOKEN not set" : undefined }, async () => {
    const { stdout, exitCode } = await oauthCli("auth-public", "introspect", oauthAccessToken!);
    assert.equal(exitCode, 0, "should exit 0");
    assert.ok(stdout.includes("Active:"), "should show active status");
  });

  it("auth-public introspect fails without credentials", async () => {
    // Use authCli which has no OAuth creds
    const { stderr, exitCode } = await authCli("auth-public", "introspect", "fake_token");
    assert.equal(exitCode, 1);
    assert.ok(stderr.includes("No OAuth client credentials"), stderr);
  });

  it("auth-public revoke fails without credentials", async () => {
    const { stderr, exitCode } = await authCli("auth-public", "revoke", "fake_token");
    assert.equal(exitCode, 1);
    assert.ok(stderr.includes("No OAuth client credentials"), stderr);
  });
});
