# postman-code-examples

This repository contains examples of using Postman Code. Each example was created by connecting the [Postman MCP Server](https://github.com/postmanlabs/postman-mcp-server), `code` toolset, to a coding agent.

These examples aim to show how you can accomplish a few fundamental things with Postman Code:

- **Exploring APIs** — Search for APIs on Postman and explore them: both internal and public APIs
- **Consuming APIs** — Generate high-quality, well-organized client code with types and error handling
- **Syncing API Changes** — Consume API updates and regenerate client code

Each example includes its own README with conversation examples showing how the agent explored APIs, answered questions, or generated code. Where applicable, you'll also find setup instructions to run the example yourself.

Watch the example video:

https://github.com/user-attachments/assets/562cc380-28af-411f-8f7c-af90b2d6124f

## Examples by Use Case

### Exploring APIs

See how the agent navigates Postman's API network to answer questions about APIs—reading actual request definitions and documentation directly from collections. Key tools: `searchPostmanElements`, `getWorkspaces`, `getCollectionMap`, `getCollectionRequest`, `getCollectionResponse`.

#### Public

- [HubSpot API Explorer](./hubspot-api-explorer/) — The user asks questions about HubSpot's public API and gets answers sourced directly from their Postman collections. Covers authentication, CRM objects, associations, and search.

#### Internal

- [Internal API Explorer](./internal-api-explorer/) — The user explores their team's workspaces and collections through conversation, asking the agent to find APIs, read documentation, and inspect request examples.

### Consuming APIs

See how the agent generates production-ready client code directly from Postman collections using all the context that is available. Key tools: `getCodeGenerationInstructions`, plus the exploration tools above.

- [Stripe API Payment Demo](./stripe-api-payment-demo/) — The user builds a working payments demo using Stripe's API. This example also demonstrates what happens when response examples aren't available in the collection—response types are marked as unverified.

### Syncing API Changes

See how the agent detects changes in Postman collections and regenerates client code to stay current—no manual diff-reading required.

- Coming soon!

## Questions & Issues

If you run into problems or have comments/suggestions, please [open an issue](https://github.com/postmanlabs/postman-code-examples/issues). We'd love to hear from you and respond quickly.

## Contributing

If you've used Postman Code to explore APIs or generate code and are willing to share your example, open an issue and let us know. We'll help get it into the example list!
