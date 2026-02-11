/**
 * Shared helpers for the Notion CLI.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { NotionPage, NotionBlock, PropertyValue } from "./src/postman/notion-api/index.js";

// ============================================================================
// Config
// ============================================================================

export const CONFIG_DIR = join(homedir(), ".notion-cli");
export const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export function readConfig(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  } catch {
    return {};
  }
}

export function writeConfig(config: Record<string, string>): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");
}

// ============================================================================
// Helper Functions
// ============================================================================

export function getBearerToken(): string {
  const token = process.env.NOTION_API_KEY || readConfig().NOTION_API_KEY;
  if (!token) {
    console.error("Error: No Notion API key found.");
    console.error("");
    console.error("Set your key with:");
    console.error("  notion-cli set-token <your-integration-token>");
    console.error("");
    console.error("Or set the NOTION_API_KEY environment variable.");
    process.exit(1);
  }
  return token;
}

export function getPageTitle(page: NotionPage): string {
  for (const [, prop] of Object.entries(page.properties)) {
    if (prop.type === "title" && prop.title && prop.title.length > 0) {
      return prop.title.map((t) => t.plain_text).join("");
    }
  }
  return "(Untitled)";
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString();
}

export function formatPropertyValue(prop: PropertyValue): string {
  switch (prop.type) {
    case "title":
      return prop.title?.map((t) => t.plain_text).join("") || "(empty)";
    case "rich_text": {
      const rt = prop.rich_text as Array<{ plain_text: string }> | undefined;
      return rt?.map((t) => t.plain_text).join("") || "(empty)";
    }
    case "number":
      return String(prop.number ?? "(empty)");
    case "select": {
      const sel = prop.select as { name: string } | null | undefined;
      return sel?.name || "(empty)";
    }
    case "multi_select": {
      const ms = prop.multi_select as Array<{ name: string }> | undefined;
      return ms?.map((s) => s.name).join(", ") || "(empty)";
    }
    case "date": {
      const d = prop.date as { start: string; end?: string } | null | undefined;
      if (!d) return "(empty)";
      return d.end ? `${d.start} → ${d.end}` : d.start;
    }
    case "checkbox":
      return prop.checkbox ? "✓" : "✗";
    case "url":
      return (prop.url as string) || "(empty)";
    case "email":
      return (prop.email as string) || "(empty)";
    case "phone_number":
      return (prop.phone_number as string) || "(empty)";
    case "status": {
      const status = prop.status as { name: string } | null | undefined;
      return status?.name || "(empty)";
    }
    case "created_time":
      return formatDate(prop.created_time as string);
    case "last_edited_time":
      return formatDate(prop.last_edited_time as string);
    case "created_by":
    case "last_edited_by": {
      const user = prop[prop.type] as { id: string } | undefined;
      return user?.id || "(empty)";
    }
    case "relation": {
      const rel = prop.relation as Array<{ id: string }> | undefined;
      return rel?.map((r) => r.id).join(", ") || "(empty)";
    }
    case "rollup": {
      const rollup = prop.rollup as { type: string } | undefined;
      return `[rollup: ${rollup?.type || "unknown"}]`;
    }
    case "formula": {
      const formula = prop.formula as { type: string; string?: string; number?: number } | undefined;
      if (formula?.type === "string") return formula.string || "(empty)";
      if (formula?.type === "number") return String(formula.number ?? "(empty)");
      return `[formula: ${formula?.type || "unknown"}]`;
    }
    case "files": {
      const files = prop.files as Array<{ name: string }> | undefined;
      return files?.map((f) => f.name).join(", ") || "(empty)";
    }
    default:
      return `[${prop.type}]`;
  }
}

function extractRichText(block: NotionBlock): string {
  const blockType = block.type;
  const content = block[blockType] as { rich_text?: Array<{ plain_text: string }> } | undefined;
  if (content?.rich_text) {
    return content.rich_text.map((t) => t.plain_text).join("");
  }
  return "";
}

export function formatBlock(block: NotionBlock, indent: string = ""): string {
  const text = extractRichText(block);
  
  switch (block.type) {
    case "paragraph":
      return text ? `${indent}${text}` : "";
    case "heading_1":
      return `${indent}# ${text}`;
    case "heading_2":
      return `${indent}## ${text}`;
    case "heading_3":
      return `${indent}### ${text}`;
    case "bulleted_list_item":
      return `${indent}• ${text}`;
    case "numbered_list_item":
      return `${indent}1. ${text}`;
    case "to_do": {
      const todo = block.to_do as { checked?: boolean } | undefined;
      const checkbox = todo?.checked ? "[x]" : "[ ]";
      return `${indent}${checkbox} ${text}`;
    }
    case "toggle":
      return `${indent}▸ ${text}`;
    case "code": {
      const code = block.code as { language?: string } | undefined;
      const lang = code?.language || "";
      return `${indent}\`\`\`${lang}\n${indent}${text}\n${indent}\`\`\``;
    }
    case "quote":
      return `${indent}> ${text}`;
    case "callout": {
      const callout = block.callout as { icon?: { emoji?: string } } | undefined;
      const emoji = callout?.icon?.emoji || "💡";
      return `${indent}${emoji} ${text}`;
    }
    case "divider":
      return `${indent}---`;
    case "child_page": {
      const childPage = block.child_page as { title?: string } | undefined;
      const edited = formatDate(block.last_edited_time as string);
      return `${indent}📄 [Child Page: ${childPage?.title || "Untitled"}] (ID: ${block.id}, edited: ${edited})`;
    }
    case "child_database": {
      const childDb = block.child_database as { title?: string } | undefined;
      return `${indent}🗃️ [Child Database: ${childDb?.title || "Untitled"}] (ID: ${block.id})`;
    }
    case "image":
      return `${indent}🖼️ [Image]`;
    case "video":
      return `${indent}🎥 [Video]`;
    case "file":
      return `${indent}📎 [File]`;
    case "pdf":
      return `${indent}📄 [PDF]`;
    case "bookmark": {
      const bookmark = block.bookmark as { url?: string } | undefined;
      return `${indent}🔖 [Bookmark: ${bookmark?.url || ""}]`;
    }
    case "link_preview": {
      const link = block.link_preview as { url?: string } | undefined;
      return `${indent}🔗 [Link: ${link?.url || ""}]`;
    }
    case "table":
      return `${indent}📊 [Table]`;
    case "table_row":
      return ""; // Handled by table
    case "column_list":
      return ""; // Container, children are columns
    case "column":
      return ""; // Container
    case "synced_block":
      return `${indent}🔄 [Synced Block]`;
    case "template":
      return `${indent}📝 [Template]`;
    case "unsupported":
      return `${indent}[Unsupported block type]`;
    default:
      return text ? `${indent}${text}` : `${indent}[${block.type}]`;
  }
}
