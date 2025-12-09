# postman-code-examples

This repository contains examples of using Postman Code. Each example was created by connecting the Postman MCP Server, `code` toolset, to a coding agent.

These examples aim to show how you can accomplish a few fundamental things with Postman Code:

- Search for APIs on Postman and explore them: both internal and public APIs
- Generate high-quality, API client code to consume APIs
- Consume API updates and regenerate client code

Each example includes its own README with conversation examples showing how the agent explored APIs, answered questions, or generated code. Where applicable, you'll also find setup instructions to run the example yourself.

## Examples by Use Case

### Exploring APIs

**How it works**: The agent uses MCP tool calls to navigate Postman's API network. For public APIs, it typically starts by searching for relevant requests with `searchPostmanElements`, then drills down using `getWorkspace` to see available collections, `getCollectionMap` to understand collection structure and read top-level documentation, `getCollectionFolder` to access folder-level docs, and `getCollectionRequest` / `getCollectionResponse` to inspect specific endpoints and example payloads. For internal APIs, it starts with `getWorkspaces` to list workspaces in your account or organization. This lets the agent answer questions by reading actual request definitions and documentation directly from Postman.

#### Public

- [HubSpot API Explorer](./hubspot-api-explorer/) — The user asks questions about HubSpot's public API and gets answers sourced directly from their Postman collections. Covers authentication, CRM objects, associations, and search.

#### Internal

- [Internal API Explorer](./internal-api-explorer/) — The user explores their team's workspaces and collections through conversation, asking the agent to find APIs, read documentation, and inspect request examples.

### Consuming APIs with generated clients

**How it works**: The agent first explores APIs using the same tools described above—searching, navigating collections, reading request definitions and documentation—to build context. Then it calls `getCodeGenerationInstructions` to understand best practices and generates idiomatic client code following language-specific conventions, with request and response types (when response examples are available) and proper error handling.

- [Stripe API](./stripe-api-payment-demo/) — The user builds a working payments demo using Stripe's API. This example also demonstrates what happens when response examples aren't available in the collection—response types are marked as unverified.

### Updating clients when APIs change

- tbd
- tbd

## Contributing

Contribute an example!
