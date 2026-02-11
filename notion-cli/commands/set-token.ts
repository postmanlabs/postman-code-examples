/**
 * set-token command - store the Notion API key
 */

import { createInterface } from "readline";
import { Command } from "commander";
import { readConfig, writeConfig, CONFIG_FILE } from "../helpers.js";

export const setTokenCommand = new Command("set-token")
  .description("Save your Notion integration token")
  .argument("[token]", "Notion internal integration secret (or omit to enter interactively)")
  .action(async (token?: string) => {
    if (!token) {
      // Prompt with masked input
      token = await new Promise<string>((resolve) => {
        process.stdout.write("Enter your Notion integration token: ");
        const rl = createInterface({ input: process.stdin, terminal: false });

        // Mask input by intercepting keystrokes
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(true);
        }
        process.stdin.resume();

        let input = "";
        const onData = (key: Buffer) => {
          const chars = key.toString();
          for (const ch of chars) {
            if (ch === "\n" || ch === "\r" || ch === "\u0004") {
              // Enter or Ctrl+D
              if (process.stdin.isTTY) process.stdin.setRawMode(false);
              process.stdin.removeListener("data", onData);
              rl.close();
              process.stdout.write("\n");
              resolve(input);
              return;
            } else if (ch === "\u0003") {
              // Ctrl+C
              if (process.stdin.isTTY) process.stdin.setRawMode(false);
              process.stdout.write("\n");
              process.exit(0);
            } else if (ch === "\u007F" || ch === "\b") {
              // Backspace
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

    if (!token) {
      console.error("No token provided.");
      process.exit(1);
    }

    const config = readConfig();
    config.NOTION_API_KEY = token;
    writeConfig(config);
    console.log(`Token saved to ${CONFIG_FILE}`);
  });
