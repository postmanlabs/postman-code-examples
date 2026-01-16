# Notion CLI

A CLI tool for searching and navigating a Notion workspace. Built using [Postman Code](https://github.com/postmanlabs/postman-code) to generate type-safe API clients from the official [Notion API Postman Collection](https://www.postman.com/notionhq/notion-s-api-workspace/collection/a1b2c3d/notion-api).

Designed for AI agents that need to explore and read content from Notion workspaces.

## Features

- **Search** - Find pages or list all workspace-level pages
- **Read Pages** - Fetch page content with nested blocks
- **Query Databases** - List database schemas and entries
- **Navigate** - Traverse the workspace hierarchy from roots to leaves

## Prerequisites

1. **Node.js** - Version 18 or higher
2. **Notion Integration** - Create one at [notion.so/my-integrations](https://www.notion.so/my-integrations)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create a Notion Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Give it a name (e.g., "My CLI")
4. Select the workspace you want to access
5. Under "Capabilities", enable "Read content"
6. Click "Submit" and copy the "Internal Integration Secret"

### 3. Share Pages with Your Integration

Your integration can only access pages that have been explicitly shared with it:

1. Open a page or database in Notion
2. Click the `•••` menu in the top right
3. Select "Add connections"
4. Find and select your integration

> **Tip**: Share a top-level page to give access to all its children.

### 4. Configure Environment Variables

Create a `.env` file in this directory:

```bash
cp .env.example .env
```

Edit `.env` and add your integration token:

```
NOTION_API_KEY=secret_your_integration_token_here
```

## Commands

**Important**: Use `--` before flags to pass them to the CLI:

```bash
npm run cli -- <command> [options]
```

### search

Search for pages or find workspace roots:

```bash
# List all pages
npm run cli -- search

# Search by query
npm run cli -- search "project"

# Find workspace-level pages only (roots)
npm run cli -- search --workspace
```

The `--workspace` flag is key for mapping a workspace - it returns only top-level pages that aren't nested inside other pages or databases.

### page

Fetch a page and display its content:

```bash
npm run cli -- page <page-id>

# Output raw JSON
npm run cli -- page <page-id> --raw
```

Shows:
- Page metadata (title, ID, parent, dates, URL)
- All properties
- Content blocks with formatting
- Child pages and databases (with IDs for further navigation)

The command recursively fetches nested content blocks (toggles, callouts, etc.) but stops at child pages and databases - it shows they exist without traversing into them.

### database

Fetch a database and list its entries:

```bash
npm run cli -- database <database-id>

# Limit results
npm run cli -- database <database-id> --limit 50

# Paginate
npm run cli -- database <database-id> --cursor <cursor>
```

Shows:
- Database metadata
- Schema (property names and types)
- Entries with titles and IDs

## Mapping a Workspace

To build a complete map of a Notion workspace:

```bash
# 1. Find root pages
npm run cli -- search --workspace

# 2. For each root, get its structure
npm run cli -- page <root-id>

# 3. For each database found, get entries
npm run cli -- database <db-id>

# 4. For each child page found, recurse
npm run cli -- page <child-id>
```

See `AGENTS.md` for detailed instructions on workspace traversal.

## Project Structure

```
notion-api-demo/
├── cli.ts                           # Main CLI application
├── src/postman/notion-api/          # Generated API clients
│   ├── search/search/client.ts
│   ├── pages/retrieve-page/client.ts
│   ├── blocks/retrieve-block-children/client.ts
│   ├── databases/
│   │   ├── retrieve-database/client.ts
│   │   └── query-database/client.ts
│   └── shared/types.ts
├── AGENTS.md                        # Instructions for AI agents
├── workspace-tree.md                # Example workspace map
├── .env                             # Your API key (git-ignored)
└── package.json
```

## Troubleshooting

### "NOTION_API_KEY not found"

Make sure you have a `.env` file with your integration token.

### "Unauthorized" or "Forbidden" errors

- Verify your integration token is correct
- Make sure pages are shared with your integration

### No pages found

Your integration can only see pages explicitly shared with it. Share a top-level page to access its children.

## License

MIT
