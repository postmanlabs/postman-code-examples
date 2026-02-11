# Postman Code

Integrate APIs without breaking your flow.

Postman Code connects your coding agent to Postman, enabling it to search for APIs, explore collections, and generate client code directly from API definitions.

## Examples

Example apps built with Postman Code:

- [Notion CLI](./notion-cli/) — A CLI for exploring and reading content from Notion workspaces
- [Stripe API Payment Demo](./stripe-api-payment-demo/) — A working payments demo using Stripe's PaymentIntent API

Each example includes generated code and setup instructions.

https://github.com/user-attachments/assets/562cc380-28af-411f-8f7c-af90b2d6124f

---

## Prerequisites

- A coding agent with MCP support (Cursor, Claude Code, VS Code with Copilot, etc.)
- A [Postman account](https://www.postman.com/) (free tier works)
- A [Postman API key](https://go.postman.co/settings/me/api-keys)

## Installation

For full installation instructions, see the [Postman MCP Server README](https://github.com/postmanlabs/postman-mcp-server). Quick setup for common coding agents is below.

The Postman MCP Server provides the **Code** toolset at `https://mcp.postman.com/code` (or `https://mcp.eu.postman.com/code` for EU users).

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "postman": {
      "url": "https://mcp.postman.com/code",
      "headers": {
        "Authorization": "Bearer YOUR_POSTMAN_API_KEY"
      }
    }
  }
}
```

### VS Code

Add to `.vscode/mcp.json`:

```json
{
  "servers": {
    "postman": {
      "type": "http",
      "url": "https://mcp.postman.com/code",
      "headers": {
        "Authorization": "Bearer ${input:postman-api-key}"
      }
    }
  },
  "inputs": [
    {
      "id": "postman-api-key",
      "type": "promptString",
      "description": "Enter your Postman API key"
    }
  ]
}
```

### Claude Code

```bash
claude mcp add --transport http postman https://mcp.postman.com/code \
  --header "Authorization: Bearer YOUR_POSTMAN_API_KEY"
```

### Local Server

If your MCP host doesn't support remote servers, you can run locally:

```bash
npx @postman/postman-mcp-server --code
```

Set the `POSTMAN_API_KEY` environment variable before running.

For complete installation options including Docker, see the [Postman MCP Server README](https://github.com/postmanlabs/postman-mcp-server).

### Ensuring Your Agent Uses Postman Tools

Adding "use postman" to your prompt ensures your coding agent uses the Postman MCP tools rather than generating code from memory or web searches. To make this automatic, add a rule to your coding agent:

> Always use the provided Postman MCP tools when I need to explore APIs, answer questions about APIs, or generate client code to consume APIs.

---

## Use Cases

### Exploring APIs

Discover and understand APIs without generating code.

**Search for public APIs** on the Postman Public API Network—find official collections from Stripe, Notion, HubSpot, and thousands of other providers.

```
"search postman for the spotify api"
"find the official stripe collection on postman"
```

**Search for internal APIs** in your team's workspaces—find your organization's private API collections.

```
"what APIs do we have in our internal workspace?"
"find our user authentication API"
```

**Understand API structure**—explore what endpoints an API offers, what parameters they accept, and what responses they return.

```
"what endpoints does the hubspot contacts api have?"
"what operations are available in the orders folder?"
```

**Read documentation**—get detailed information about specific operations directly from the Postman collection.

```
"how does the create payment intent endpoint work?"
"what parameters does the search endpoint accept?"
```

**Examine request/response shapes**—see example request bodies and response payloads.

```
"what does a successful response from create order look like?"
"what error responses can the authentication endpoint return?"
```

**Plan implementations**—have the agent help you figure out which endpoints you need before writing any code.

```
"I need to sync customers from hubspot to our database. what endpoints would I need?"
"help me plan a checkout flow using stripe. what API calls are involved?"
```

### Generating Code

Create client code from API definitions.

**Generate for specific endpoints**—create a client for a single endpoint or a group of related endpoints.

```
"generate a client for the create payment intent endpoint"
"write code for the list, get, and create operations for contacts"
```

**Build features**—describe what you're building and let the agent figure out which endpoints are needed.

```
"build a demo of accepting a payment using the stripe api"
"write a script that syncs notion pages to our database"
```

**Generate for internal APIs**—works with any collection in your Postman workspaces, not just public APIs.

```
"create a client for our internal user sync API"
"generate code to call the user profile endpoints from our auth service"
```

### Updating Code

Keep generated code in sync when APIs change.

**Check for changes**—compare timestamps to see if the API definition has been updated since you generated your code.

```
"check if any of my postman-generated code is out of date"
"has the stripe api collection changed since I generated my clients?"
```

**Regenerate affected code**—update only the clients that are out of sync.

```
"update my stripe payment intent client to match the latest API definition"
"regenerate all clients that are out of sync with their collections"
```

**Review before updating**—see what changed in the API before accepting regenerated code.

```
"show me what changed in the stripe api since I generated my code"
"what would change if I regenerated my hubspot clients?"
```

---

## How Code Generation Works

When you request code generation, the agent follows this sequence:

1. **Gets instructions** — Calls the `getCodeGenerationInstructions` MCP tool to load the generation guidelines
2. **Gathers context** — Fetches the collection, parent folders (which may contain docs), request details, response examples, and environments
3. **Analyzes your project** — Examines your language, framework, and conventions
4. **Plans file structure** — Determines where files will go based on existing code or project conventions
5. **Generates files** — Creates client files and shared utilities following the patterns from the instructions

### Matching Your Project

The agent generates code in your project's language and style. It looks at:

- Language and framework (TypeScript, Python, etc.)
- Naming conventions (camelCase, snake_case)
- Export patterns (named exports, default exports)
- Existing HTTP helpers and error handling patterns
- Documentation style (JSDoc, TSDoc, docstrings)

### File Organization

Before generating any files, the agent determines where they should go. If existing Postman Code files are found (by searching for "Generated by Postman Code" headers), new files go alongside them. Otherwise, a `postman/` directory is created.

The directory structure mirrors the Postman collection:

```
postman/
  <collection-slug>/                    # "stripe-api"
    <folder-slug>/                      # "payment-intents"
      <request-slug>/                   # "create-payment-intent"
        client.<ext>                    # The generated client function
    shared/
      types.<ext>                       # Shared type definitions
      variables.<ext>                   # Collection/environment variables
```

---

## What Gets Generated

### Client Files

For each request, a client file is generated containing:

**Client file header** — Every file starts with a header linking back to Postman:

```javascript
/**
 * Generated by Postman Code
 * 
 * Collection: Stripe API
 * Collection UID: 12345678-1234-1234-1234-123456789abc
 * 
 * Request: Payment Intents > Create Payment Intent
 * Request UID: 87654321-4321-4321-4321-cba987654321
 * Request modified at: 2024-11-10T15:45:30.000Z
 */
```

This header enables discovery (finding all generated files), change detection (comparing timestamps), and traceability (linking back to the source).

**Client function** — The API call implementation with:
- Types for request and response (in typed languages)
- Documentation from the Postman request description
- Proper URL construction, headers, and body handling

**Error handling** — Generated from response examples saved in Postman. If a request has examples for 404 and 422 responses, the code will have explicit handling for each:

```javascript
switch (response.status) {
  case 404:
    throw new NotFoundError(await response.json());
  case 422:
    throw new ValidationError(await response.json());
  default:
    throw new Error(await response.text());
}
```

### Shared Files

**Variables file** — If the collection or environments define variables, a `variables` file is generated containing collection-level and environment-specific values. Client functions accept these as parameters—they don't hardcode values.

**Types file** — Common types used across multiple requests are extracted to avoid duplication.

**Utility files** — Auth helpers, validation logic, or other shared code as needed.

---

## Customization

The generation instructions are opinionated but not rigid. You can customize the output by adding requirements to your prompt—the agent will prioritize your instructions over the defaults.

**What you can customize:**

- **Directory structure** — Store files wherever makes sense for your project
- **File naming** — Use different file names or consolidate multiple clients into one file
- **Code patterns** — Request specific error handling, logging, or HTTP client usage
- **Documentation style** — Ask for different comment formats or more/less detail

**What we recommend keeping:**

- **Client file header** — This links generated code back to its Postman source and includes the modification timestamp. Without it, you lose the ability to detect when the API definition has changed and know which files need regeneration.

---

## MCP Tools Reference

Complete reference for all available Postman MCP `code` toolset tools.

### Authentication & User Info

#### getAuthenticatedUser

Gets information about the authenticated user, including user ID, username, teamId, and roles.

**Parameters:** None

---

### Code Generation

#### getCodeGenerationInstructions

**MANDATORY to call BEFORE generating any API client code.** Returns comprehensive step-by-step instructions for generating API client code from Postman collections, including best practices, file structure, function design patterns, error handling, and language-specific conventions.

**Parameters:** None

---

### Collections

#### getCollection

Get information about a collection. By default returns the lightweight collection map (metadata + recursive itemRefs). Can optionally request `minimal` (root-level folder/request IDs only) or `full` (complete Postman collection payload) models.

**Parameters:**
- **collectionId** (required) - The collection ID in format `<OWNER_ID>-<UUID>` (e.g. `12345-33823532ab9e41c9b6fd12d0fd459b8b`)
- **model** (optional) - Response shape: `"minimal"` for root-level IDs only, `"full"` for complete payload, or omit for lightweight collection map
- **access_key** (optional) - Collection's read-only access key (allows calling without API key)

#### getCollectionFolder

Gets information about a folder in a collection. Can optionally populate all contents or return only ID properties.

**Parameters:**
- **collectionId** (required) - The collection's ID
- **folderId** (required) - The folder's ID
- **populate** (optional) - If true, returns all of the folder's contents
- **ids** (optional) - If true, returns only properties that contain ID values
- **uid** (optional) - If true, returns all IDs in UID format (`userId-id`)

#### getCollectionRequest

Gets information about a request in a collection. Can optionally populate all contents or return only ID properties.

**Parameters:**
- **collectionId** (required) - The collection's ID
- **requestId** (required) - The request's ID
- **populate** (optional) - If true, returns all of the request's contents
- **ids** (optional) - If true, returns only properties that contain ID values
- **uid** (optional) - If true, returns all IDs in UID format (`userId-id`)

#### getCollectionResponse

Gets information about a response in a collection. Can optionally populate all contents or return only ID properties.

**Parameters:**
- **collectionId** (required) - The collection's ID
- **responseId** (required) - The response's ID
- **populate** (optional) - If true, returns all of the response's contents
- **ids** (optional) - If true, returns only properties that contain ID values
- **uid** (optional) - If true, returns all IDs in UID format (`userId-id`)

---

### Environments

#### getEnvironment

Gets information about a specific environment by ID.

**Parameters:**
- **environmentId** (required) - The environment's ID

#### getEnvironments

Gets information about all of your environments. Can optionally filter by workspace.

**Parameters:**
- **workspace** (optional) - The workspace's ID to filter environments by

---

### Workspaces

#### getWorkspace

Gets information about a specific workspace. Returns visibility settings (personal, team, private, public, partner) and can optionally include deactivated mocks or SCIM user IDs.

**Parameters:**
- **workspaceId** (required) - The workspace's ID
- **include** (optional) - Additional info to include: `"mocks:deactivated"` or `"scim"`

#### getWorkspaces

Gets all workspaces you have access to. Can filter by type and by creator user ID.

**Parameters:**
- **type** (optional) - Filter by workspace type: `"personal"`, `"team"`, `"private"`, `"public"`, or `"partner"`
- **createdBy** (optional) - Filter by creator's Postman user ID
- **include** (optional) - Additional info to include: `"mocks:deactivated"` or `"scim"`

---

### Search

#### searchPostmanElements

Searches for Postman elements in the **public network only**. Currently supports searching for requests. Does NOT search private workspaces, team workspaces, or personal collections.

**Parameters:**
- **entityType** (required) - Type of element to search for. Currently only accepts `"requests"`
- **q** (optional) - The search query string (1-512 characters)
- **limit** (optional) - Max number of results (1-10, default: 10)
- **publisherIsVerified** (optional) - If true, only return entities from Postman-verified publishers
- **nextCursor** (optional) - Cursor for pagination to get next set of results

---

## FAQ

### What languages are supported?

Postman Code is designed to be language-agnostic. The instructions provided through MCP tools don't target a specific language—while examples use JavaScript for illustration, agents are explicitly told to follow your project's conventions.

This means Postman Code *can* work with any language. However, we're actively testing across languages, frameworks, and use cases to verify quality.

**Tested and verified:**
- JavaScript
- TypeScript

**Other languages:** Coming soon. We'll update this list as we complete testing.

---

## Questions & Issues

If you run into problems or have comments/suggestions, please [open an issue](https://github.com/postmanlabs/postman-code-examples/issues). We'd love to hear from you.

## Contributing

If you've used Postman Code to explore APIs or generate code and want to share your example, open an issue and let us know!
