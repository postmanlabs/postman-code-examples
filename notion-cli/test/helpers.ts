/**
 * Shared test utilities for the Notion CLI integration tests.
 *
 * Each test file is self-contained — it creates its own resources in
 * before() and cleans up in after(). This module provides the shared
 * helpers they all need: token loading, CLI runner, output parsers,
 * and a convenience setup that creates a test page.
 */

import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { homedir } from "node:os";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
export const CLI_ENTRY = resolve(__dirname, "..", "cli.ts");
export const PROJECT_DIR = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

export function loadToken(): string | undefined {
  if (process.env.NOTION_TOKEN) return process.env.NOTION_TOKEN;
  try {
    const config = JSON.parse(
      readFileSync(join(homedir(), ".notion-cli", "config.json"), "utf-8"),
    );
    return config.NOTION_TOKEN;
  } catch {
    return undefined;
  }
}

/**
 * Returns true when the current token comes from an OAuth (public) integration.
 * Checks NOTION_AUTH_METHOD env var first, then falls back to config.json.
 */
export function isOAuth(): boolean {
  if (process.env.NOTION_AUTH_METHOD) return process.env.NOTION_AUTH_METHOD === "oauth";
  try {
    const config = JSON.parse(
      readFileSync(join(homedir(), ".notion-cli", "config.json"), "utf-8"),
    );
    return config.auth_method === "oauth";
  } catch {
    return false;
  }
}

/**
 * Load token or exit cleanly if not available.
 * Call at the top of each test file.
 */
export function requireToken(): string {
  const token = loadToken();
  if (!token) {
    console.log("Skipping tests — no Notion API key found.");
    console.log("Run 'notion-cli auth-internal set' or 'notion-cli auth-public login' to authenticate.");
    process.exit(0);
  }
  return token;
}

// ---------------------------------------------------------------------------
// CLI runner
// ---------------------------------------------------------------------------

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Create a CLI runner bound to a specific token.
 */
export function createCli(token: string) {
  return function cli(...args: string[]): Promise<CliResult> {
    return new Promise((res) => {
      execFile(
        process.execPath,
        ["--import", "tsx", CLI_ENTRY, ...args],
        { env: { ...process.env, NOTION_TOKEN: token }, timeout: 60_000, cwd: PROJECT_DIR },
        (error, stdout, stderr) => {
          const exitCode = error
            ? typeof error.code === "number"
              ? error.code
              : 1
            : 0;
          res({ stdout: stdout ?? "", stderr: stderr ?? "", exitCode });
        },
      );
    });
  };
}

// ---------------------------------------------------------------------------
// Output parsers
// ---------------------------------------------------------------------------

/** Extract a JSON object or array from stdout that may have prefixed text. */
export function extractJson(stdout: string): unknown {
  const match = stdout.match(/^[\[{]/m);
  if (!match || match.index === undefined) {
    throw new Error(`No JSON found in output:\n${stdout.slice(0, 500)}`);
  }
  return JSON.parse(stdout.slice(match.index));
}

/** Parse all UUIDs from "ID: <uuid>" patterns in formatted output. */
export function parseIds(stdout: string): string[] {
  return [...stdout.matchAll(/ID:\s+([0-9a-f-]{36})/g)].map((m) => m[1]);
}

// ---------------------------------------------------------------------------
// Test page lifecycle
// ---------------------------------------------------------------------------

export interface TestContext {
  cli: ReturnType<typeof createCli>;
  parentPageId: string;
  testPageId: string;
}

/**
 * Create a test page under an accessible workspace page.
 * Call in before() — returns IDs needed by tests.
 */
export async function setupTestPage(cli: ReturnType<typeof createCli>): Promise<TestContext> {
  // Find an accessible page to use as parent
  const searchResult = await cli("search", "-n", "1");
  if (searchResult.exitCode !== 0) {
    throw new Error(`Setup search failed: ${searchResult.stderr}`);
  }
  const ids = parseIds(searchResult.stdout);
  if (ids.length === 0) {
    throw new Error("Integration must have access to at least one page");
  }
  const parentPageId = ids[0];

  // Create a test page
  const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
  const title = `[test] notion-cli ${timestamp}`;
  const createResult = await cli("page", "create", parentPageId, "--title", title, "--raw");
  if (createResult.exitCode !== 0) {
    throw new Error(`Setup page create failed: ${createResult.stderr}`);
  }
  const page = extractJson(createResult.stdout) as { id: string };
  if (!page.id) {
    throw new Error("Created page has no id");
  }

  return { cli, parentPageId, testPageId: page.id };
}

/**
 * Archive the test page. Call in after().
 */
export async function teardownTestPage(ctx: TestContext | undefined): Promise<void> {
  if (!ctx?.testPageId) return;
  await ctx.cli("page", "archive", ctx.testPageId);
}
