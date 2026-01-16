# Agent Instructions: Notion CLI

This document explains how to use the Notion CLI for AI agents. The CLI provides tools for searching, reading, and navigating a Notion workspace.

## Setup

Run all commands from this directory using:
```bash
npm run cli -- <command> [options]
```

The `--` is required to pass flags to the CLI (npm will swallow them otherwise).

## Available Commands

### search
Search for pages in the workspace.

```bash
# List all pages (paginated)
npm run cli -- search

# Search by query
npm run cli -- search "project name"

# Get only workspace-level (root) pages
npm run cli -- search --workspace
```

The `--workspace` flag is important: it internally paginates through all results and filters to only return top-level pages (pages whose parent is the workspace itself). This is how you find the roots of the workspace tree.

### page
Fetch a page and display its content and child pages/databases.

```bash
npm run cli -- page <page-id>

# Output raw JSON
npm run cli -- page <page-id> --raw
```

The page command:
- Shows page metadata (title, ID, parent, dates, URL)
- Shows all properties
- Recursively fetches all content blocks (in parallel for speed)
- Displays child pages and child databases with their IDs
- Does NOT traverse into child pages or databases (stays within the single page)

### database
Fetch a database schema and its entries.

```bash
npm run cli -- database <database-id>

# Limit results
npm run cli -- database <database-id> --limit 50

# Paginate
npm run cli -- database <database-id> --cursor <cursor>
```

The database command:
- Shows database metadata (title, ID, parent, dates, URL)
- Shows the schema (property names and types)
- Lists entries (rows) with their titles and IDs

## Mapping a Notion Workspace

To build a complete tree/map of a Notion workspace, follow this strategy:

### Step 1: Find Root Pages

```bash
npm run cli -- search --workspace
```

This returns only pages at the workspace level (top-level pages). These are your starting points.

### Step 2: Traverse Each Root Page

For each root page, fetch its content:

```bash
npm run cli -- page <page-id>
```

Look for:
- `📄 [Child Page: ...]` - nested pages (use their IDs to traverse deeper)
- `🗃️ [Child Database: ...]` - databases (query these separately)

### Step 3: Query Each Database

For each database found:

```bash
npm run cli -- database <database-id>
```

This returns the database entries. Each entry is a page, but for tree mapping you typically just need their titles (you don't need to traverse into each entry unless looking for specific content).

### Step 4: Recurse Into Child Pages

For each child page found, repeat Step 2. Continue until you've visited all pages.

### Key Points

1. **Start from roots**: Use `search --workspace` to find starting points
2. **One page at a time**: The `page` command shows child pages/databases but doesn't traverse into them
3. **Databases are separate**: Use the `database` command to get entries
4. **IDs are in output**: Every child page/database shows its ID in parentheses for easy extraction

### Example Session

```bash
# Find roots
npm run cli -- search --workspace
# Found: archive (35754014-...), Postman Code Demo (2946e5f3-...)

# Explore first root
npm run cli -- page 35754014-c743-4bb5-aa0a-721f51256861
# Shows: tasks database, notes page, misc page, etc.

# Query the database
npm run cli -- database 725a78f3-00bf-4dde-b207-d04530545c45
# Shows: 2 entries

# Explore a child page
npm run cli -- page 2a878747-495e-44fe-be28-8e8828f45eb2
# Shows: Sub Page child

# Continue recursively...
```

## Performance Notes

- Block fetching uses parallel API calls for speed
- Large pages (100+ blocks) may take 5-15 seconds
- Database queries are fast (single API call)
- The `--workspace` flag on search paginates internally (may take a few seconds for large workspaces)

## Output Format

All commands output human-readable text by default. Use `--raw` on `page` and `database` commands to get JSON output for programmatic processing.
