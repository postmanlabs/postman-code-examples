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

- [HubSpot API Explorer](./examples/hubspot-api-explorer/) — The user asks questions about HubSpot's public API and gets answers sourced directly from their Postman collections. Covers authentication, CRM objects, associations, and search.
- [Internal API Explorer](./examples/internal-api-explorer/) — The user explores their team's workspaces and collections through conversation, asking the agent to find APIs, read documentation, and inspect request examples.

### Generating API client code and building on it

- Stripe API payments sandbox
- tbd

### Maintaining

- tbd
- tbd

## Contributing

Contribute an example!
