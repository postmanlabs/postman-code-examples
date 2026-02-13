/**
 * auth-public command group — public integration (OAuth) authentication
 *
 * Public integrations use OAuth so that other Notion users can install them
 * via the "Add to Notion" flow. This requires a client ID and client secret
 * from the integration's settings page.
 *
 *   auth-public setup          — save your OAuth client ID and secret
 *   auth-public login          — authenticate via browser (OAuth flow)
 *   auth-public status         — check current OAuth authentication state
 *   auth-public logout         — revoke and clear the stored OAuth access token
 */

import { createInterface } from "readline";
import { createServer } from "http";
import { exec } from "child_process";
import { Command } from "commander";
import {
  readConfig,
  writeConfig,
  getOAuthCredentials,
  CONFIG_FILE,
} from "../helpers.js";
import { createNotionClient } from "../src/postman/notion-api/index.js";

// ============================================================================
// Helpers
// ============================================================================

const REDIRECT_URI = "http://localhost:8787/callback";
const NOTION_AUTH_URL = "https://api.notion.com/v1/oauth/authorize";

function promptMasked(message: string): Promise<string> {
  return new Promise<string>((resolve) => {
    process.stdout.write(message);

    if (!process.stdin.isTTY) {
      const rl = createInterface({ input: process.stdin, terminal: false });
      rl.once("line", (line) => {
        rl.close();
        resolve(line.trim());
      });
      return;
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    let input = "";

    const onData = (key: Buffer) => {
      const chars = key.toString();
      for (const ch of chars) {
        if (ch === "\n" || ch === "\r" || ch === "\u0004") {
          process.stdin.setRawMode(false);
          process.stdin.removeListener("data", onData);
          process.stdin.pause();
          process.stdout.write("\n");
          resolve(input);
          return;
        } else if (ch === "\u0003") {
          process.stdin.setRawMode(false);
          process.stdout.write("\n");
          process.exit(0);
        } else if (ch === "\u007F" || ch === "\b") {
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write("\b \b");
          }
        } else {
          input += ch;
          process.stdout.write("*");
        }
      }
    };
    process.stdin.on("data", onData);
  });
}

function promptPlain(message: string): Promise<string> {
  return new Promise<string>((resolve) => {
    process.stdout.write(message);
    const rl = createInterface({ input: process.stdin, terminal: false });
    rl.once("line", (line) => {
      rl.close();
      process.stdin.pause();
      resolve(line.trim());
    });
  });
}

function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";
  exec(`${cmd} "${url}"`);
}

function waitForCallback(port: number): Promise<string> {
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout>;

    function done() {
      clearTimeout(timer);
      server.close();
    }

    const server = createServer((req, res) => {
      const url = new URL(req.url || "/", `http://localhost:${port}`);

      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(callbackPage("Authorization Failed", `Notion returned an error: ${error}. You can close this tab.`));
        done();
        reject(new Error(`OAuth authorization error: ${error}`));
        return;
      }

      if (!code) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(callbackPage("Missing Code", "No authorization code received. You can close this tab."));
        done();
        reject(new Error("No authorization code in callback"));
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(callbackPage("Success!", "Authorization complete. You can close this tab and return to the terminal."));
      done();
      resolve(code);
    });

    server.listen(port, () => {
      // Server is ready
    });

    timer = setTimeout(() => {
      server.close();
      reject(new Error("Timed out waiting for OAuth callback (2 minutes)"));
    }, 120_000);
  });
}

function callbackPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>notion-cli — ${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex;
    justify-content: center; align-items: center; min-height: 100vh; margin: 0;
    background: #f7f6f3; color: #37352f; }
  .card { text-align: center; padding: 2rem; }
  h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
  p { color: #6b6b6b; }
</style>
</head>
<body><div class="card"><h1>${title}</h1><p>${message}</p></div></body>
</html>`;
}

// ============================================================================
// auth-public setup — save client credentials
// ============================================================================

const setupCommand = new Command("setup")
  .description("Save your OAuth client ID and secret")
  .action(async () => {
    const existing = getOAuthCredentials();
    if (existing) {
      console.log("OAuth client credentials are already configured.");
      console.log(`  Client ID: ${existing.clientId.slice(0, 12)}...`);
      console.log("");
      const answer = await promptPlain("Overwrite? (y/N) ");
      if (answer.toLowerCase() !== "y") {
        console.log("Kept existing credentials.");
        return;
      }
      console.log("");
    }

    console.log("Enter your OAuth client credentials.");
    console.log("(Find these at https://www.notion.so/my-integrations under your public integration.)");
    console.log("");
    const clientId = await promptPlain("Client ID: ");
    const clientSecret = await promptMasked("Client secret: ");

    if (!clientId || !clientSecret) {
      console.error("Both client ID and client secret are required.");
      process.exit(1);
    }

    const config = readConfig();
    config.NOTION_OAUTH_CLIENT_ID = clientId;
    config.NOTION_OAUTH_CLIENT_SECRET = clientSecret;
    writeConfig(config);

    console.log("");
    console.log("Client credentials saved.");
    console.log("Run 'notion-cli auth-public login' to authenticate.");
    process.exit(0);
  });

// ============================================================================
// auth-public login — OAuth browser flow
// ============================================================================

const loginCommand = new Command("login")
  .description("Authenticate via browser (OAuth authorization flow)")
  .option("--no-browser", "print the authorization URL instead of opening it")
  .action(async (options: { browser: boolean }) => {
    // Check for client credentials
    const creds = getOAuthCredentials();
    if (!creds) {
      console.error("No OAuth client credentials found.");
      console.error("");
      console.error("Run 'notion-cli auth-public setup' first to save your client ID and secret.");
      process.exit(1);
    }

    // Build authorization URL
    const authUrl = `${NOTION_AUTH_URL}?client_id=${encodeURIComponent(creds.clientId)}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

    // Start local server
    console.log("Starting local server for OAuth callback...");
    const codePromise = waitForCallback(8787);

    // Open browser or print URL
    if (options.browser) {
      console.log("Opening browser for authorization...");
      console.log("");
      openBrowser(authUrl);
    } else {
      console.log("Open this URL in your browser to authorize:");
      console.log("");
      console.log(`  ${authUrl}`);
      console.log("");
    }

    console.log("Waiting for authorization...");

    // Wait for callback
    let code: string;
    try {
      code = await codePromise;
    } catch (err) {
      console.error(`\n${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }

    console.log("Authorization code received. Exchanging for access token...");

    // Exchange code for token
    const notion = createNotionClient("");

    try {
      const response = await notion.oauth.token(
        {
          grant_type: "authorization_code",
          code,
          redirect_uri: REDIRECT_URI,
        },
        creds.clientId,
        creds.clientSecret,
      );

      // Store token and metadata
      const config = readConfig();
      config.NOTION_TOKEN = response.access_token;
      config.auth_method = "oauth";
      config.oauth_bot_id = response.bot_id;
      config.oauth_workspace_name = response.workspace_name;
      config.oauth_workspace_id = response.workspace_id;
      writeConfig(config);

      console.log("");
      console.log("Authenticated successfully!");
      console.log(`  Workspace: ${response.workspace_name}`);
      console.log(`  Bot ID: ${response.bot_id}`);
      console.log(`  Token saved to ${CONFIG_FILE}`);
      process.exit(0);
    } catch (err) {
      console.error(`\nError exchanging code: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  });

// ============================================================================
// auth-public status
// ============================================================================

const statusCommand = new Command("status")
  .description("Check current OAuth authentication state")
  .action(async () => {
    const config = readConfig();
    const creds = getOAuthCredentials();

    // Client credentials
    if (creds) {
      console.log("Client credentials: configured");
      console.log(`  Client ID: ${creds.clientId.slice(0, 12)}...`);
    } else {
      console.log("Client credentials: not configured");
      console.log("  Run 'notion-cli auth-public setup' to save them.");
    }

    console.log("");

    // Access token
    const isOAuth = config.auth_method === "oauth";
    if (isOAuth && config.NOTION_TOKEN) {
      console.log("Access token: configured");
      console.log(`  Token: ${config.NOTION_TOKEN.slice(0, 12)}...`);
      if (config.oauth_workspace_name) console.log(`  Workspace: ${config.oauth_workspace_name}`);
      if (config.oauth_workspace_id) console.log(`  Workspace ID: ${config.oauth_workspace_id}`);
      if (config.oauth_bot_id) console.log(`  Bot ID: ${config.oauth_bot_id}`);
    } else if (config.NOTION_TOKEN && !isOAuth) {
      console.log("Access token: using an internal integration token (not OAuth)");
      console.log("  Run 'notion-cli auth-public login' to authenticate via OAuth instead.");
    } else {
      console.log("Access token: not authenticated");
      if (creds) {
        console.log("  Run 'notion-cli auth-public login' to authenticate.");
      }
    }
  });

// ============================================================================
// auth-public logout
// ============================================================================

const logoutCommand = new Command("logout")
  .description("Revoke and clear the stored OAuth access token")
  .option("--all", "also remove stored client credentials")
  .action(async (options: { all?: boolean }) => {
    const config = readConfig();
    let removed = false;

    if (config.auth_method === "oauth" && config.NOTION_TOKEN) {
      // Revoke the token with Notion so re-auth issues a fresh token
      const creds = getOAuthCredentials();
      if (creds) {
        try {
          const notion = createNotionClient("");
          await notion.oauth.revoke(config.NOTION_TOKEN, creds.clientId, creds.clientSecret);
          console.log("Token revoked with Notion.");
        } catch {
          console.log("Warning: could not revoke token with Notion (it may already be expired).");
        }
      }

      delete (config as Record<string, string | undefined>).NOTION_TOKEN;
      delete (config as Record<string, string | undefined>).auth_method;
      delete (config as Record<string, string | undefined>).oauth_bot_id;
      delete (config as Record<string, string | undefined>).oauth_workspace_name;
      delete (config as Record<string, string | undefined>).oauth_workspace_id;
      removed = true;
    }

    if (options.all) {
      if (config.NOTION_OAUTH_CLIENT_ID || config.NOTION_OAUTH_CLIENT_SECRET) {
        delete (config as Record<string, string | undefined>).NOTION_OAUTH_CLIENT_ID;
        delete (config as Record<string, string | undefined>).NOTION_OAUTH_CLIENT_SECRET;
        removed = true;
      }
    }

    if (!removed) {
      console.log("No OAuth credentials to remove.");
      return;
    }

    writeConfig(config as Record<string, string>);
    console.log("OAuth credentials removed.");
    if (!options.all && (config.NOTION_OAUTH_CLIENT_ID || config.NOTION_OAUTH_CLIENT_SECRET)) {
      console.log("(Client ID/secret retained — use --all to remove those too)");
    }
  });

// ============================================================================
// auth-public introspect — inspect a token's metadata
// ============================================================================

const introspectCommand = new Command("introspect")
  .description("Inspect an OAuth token's metadata")
  .argument("<token>", "the token to introspect")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .action(async (token: string, options: { raw?: boolean }) => {
    const creds = getOAuthCredentials();
    if (!creds) {
      console.error("No OAuth client credentials found.");
      console.error("Run 'notion-cli auth-public setup' first.");
      process.exit(1);
    }

    const notion = createNotionClient("");

    try {
      const response = await notion.oauth.introspect(token, creds.clientId, creds.clientSecret);

      if (options.raw) {
        console.log(JSON.stringify(response, null, 2));
        return;
      }

      console.log(`Active: ${response.active}`);
      if (response.bot_id) console.log(`Bot ID: ${response.bot_id}`);
      if (response.workspace_id) console.log(`Workspace ID: ${response.workspace_id}`);
      if (response.token_type) console.log(`Token type: ${response.token_type}`);
      if (response.iat) console.log(`Issued at: ${response.iat}`);
      if (response.exp) console.log(`Expires: ${response.exp}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// ============================================================================
// auth-public revoke — revoke a token
// ============================================================================

const revokeCommand = new Command("revoke")
  .description("Revoke an OAuth token")
  .argument("<token>", "the token to revoke")
  .action(async (token: string) => {
    const creds = getOAuthCredentials();
    if (!creds) {
      console.error("No OAuth client credentials found.");
      console.error("Run 'notion-cli auth-public setup' first.");
      process.exit(1);
    }

    const notion = createNotionClient("");

    try {
      await notion.oauth.revoke(token, creds.clientId, creds.clientSecret);
      console.log("Token revoked.");
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// ============================================================================
// auth-public command group
// ============================================================================

export const authPublicCommand = new Command("auth-public")
  .description("Authenticate with a public integration (OAuth)")
  .addHelpText(
    "after",
    `
Public integrations use OAuth so other Notion users can install them.
This requires a client ID and client secret from your integration's settings.

To get started:
  1. Go to https://www.notion.so/my-integrations
  2. Create or select a public integration
  3. Copy the OAuth client ID and client secret
  4. Run: notion-cli auth-public setup
  5. Run: notion-cli auth-public login
`,
  )
  .addCommand(setupCommand)
  .addCommand(loginCommand)
  .addCommand(statusCommand)
  .addCommand(introspectCommand)
  .addCommand(revokeCommand)
  .addCommand(logoutCommand);
