/**
 * auth-internal command group — internal integration authentication
 *
 * Internal integrations are created at https://www.notion.so/my-integrations.
 * Authentication is a single secret token — no OAuth flow needed.
 *
 *   auth-internal set [token]  — save your integration token
 *   auth-internal status       — check if a token is configured
 *   auth-internal clear        — remove the stored token
 */

import { createInterface } from "readline";
import { Command } from "commander";
import { readConfig, writeConfig, CONFIG_FILE } from "../helpers.js";

// ============================================================================
// Masked input helper
// ============================================================================

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

// ============================================================================
// auth-internal set
// ============================================================================

const setCommand = new Command("set")
  .description("Save your integration token")
  .argument("[token]", "integration secret (omit to enter interactively)")
  .action(async (token?: string) => {
    if (!token) {
      token = await promptMasked("Integration token: ");
    }

    if (!token) {
      console.error("No token provided.");
      process.exit(1);
    }

    const config = readConfig();
    config.NOTION_TOKEN = token;
    config.auth_method = "internal";
    // Clear any OAuth metadata if switching methods
    delete (config as Record<string, string | undefined>).oauth_bot_id;
    delete (config as Record<string, string | undefined>).oauth_workspace_name;
    delete (config as Record<string, string | undefined>).oauth_workspace_id;
    writeConfig(config as Record<string, string>);
    console.log(`Token saved to ${CONFIG_FILE}`);
    process.exit(0);
  });

// ============================================================================
// auth-internal status
// ============================================================================

const statusCommand = new Command("status")
  .description("Check if an integration token is configured")
  .action(async () => {
    const config = readConfig();
    const envToken = process.env.NOTION_TOKEN;
    const configToken = config.NOTION_TOKEN;
    const token = envToken || configToken;

    if (!token) {
      console.log("No integration token configured.");
      console.log("");
      console.log("To set one:");
      console.log("  notion-cli auth-internal set <token>");
      return;
    }

    console.log("Integration token configured.");
    if (envToken) {
      console.log("  Source: NOTION_TOKEN environment variable");
    } else {
      console.log(`  Source: ${CONFIG_FILE}`);
    }
    console.log(`  Token: ${token.slice(0, 12)}...`);
    if (config.auth_method) {
      console.log(`  Auth method: ${config.auth_method}`);
    }
  });

// ============================================================================
// auth-internal clear
// ============================================================================

const clearCommand = new Command("clear")
  .description("Remove the stored integration token")
  .action(async () => {
    const config = readConfig();
    if (!config.NOTION_TOKEN) {
      console.log("No stored token to remove.");
      return;
    }

    delete (config as Record<string, string | undefined>).NOTION_TOKEN;
    delete (config as Record<string, string | undefined>).auth_method;
    writeConfig(config as Record<string, string>);
    console.log("Integration token removed.");

    if (process.env.NOTION_TOKEN) {
      console.log("Note: NOTION_TOKEN environment variable is still set.");
    }
  });

// ============================================================================
// auth-internal command group
// ============================================================================

export const authInternalCommand = new Command("auth-internal")
  .description("Authenticate with an internal integration token")
  .addHelpText(
    "after",
    `
Internal integrations use a single secret token for authentication.
No OAuth flow or browser interaction needed.

To get started:
  1. Go to https://www.notion.so/my-integrations
  2. Create an integration (or select an existing one)
  3. Copy the "Internal Integration Secret"
  4. Run: notion-cli auth-internal set <your-secret>
`,
  )
  .addCommand(setCommand)
  .addCommand(statusCommand)
  .addCommand(clearCommand);
