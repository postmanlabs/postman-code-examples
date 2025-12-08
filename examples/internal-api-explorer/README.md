# Internal API Explorer

This example demonstrates using Postman's MCP Server to explore your company's internal APIs through natural conversation. The AI agent searches across workspaces, discovers collections, and helps you understand API ownership and capabilities.

## Conversations

Below are Q&A exchanges between a human (🧑) and an AI agent (🤖) that uses Postman's MCP tools to search workspaces, inspect collections, and answer questions about internal APIs.

### 🧑 **Find my company's search API**

🤖 I found several workspaces related to search in your organization. Let me break them down:

| Workspace                 | Type | Description                                            |
| ------------------------- | ---- | ------------------------------------------------------ |
| **Search Platform**       | Team | Core search APIs maintained by the Search team         |
| **Search Infrastructure** | Team | Indexing, replication, and cluster management          |
| **Search Integrations**   | Team | Connectors for Catalog, Recommendations, and Analytics |
| **Product Search**        | Team | Consumer-facing search for the storefront              |

To help you find the specific search API you're looking for, I can explore any of these workspaces in more detail. Which area interests you most?

- **Search Platform** - If you're looking for the core search endpoints and query APIs
- **Search Infrastructure** - If you need to manage indexes or cluster configuration
- **Search Integrations** - If you're connecting search to other services
- **Product Search** - If you're working on storefront search features

---

### 🧑 **Tell me what's in the Search Platform workspace**

🤖 I explored the **Search Platform** workspace. Here's what I found:

**Collections:**

| Collection           | Requests | Description                                          |
| -------------------- | -------- | ---------------------------------------------------- |
| **Search API v2**    | 12       | Main search endpoints - query, autocomplete, filters |
| **Search Admin**     | 8        | Index management and configuration endpoints         |
| **Search Analytics** | 5        | Query performance and usage metrics                  |

**Environments:**

- `search-dev` - Development environment (search-dev.internal.example.com)
- `search-staging` - Staging environment (search-staging.internal.example.com)
- `search-prod` - Production environment (search.example.com)

**Key endpoints in Search API v2:**

```
POST /v2/search          - Execute a search query
GET  /v2/search/suggest  - Autocomplete suggestions
POST /v2/search/filters  - Get available filter facets
GET  /v2/search/health   - Service health check
```

Would you like me to dive deeper into any of these collections? I can show you request/response examples, authentication requirements, or the full folder structure.

---

### 🧑 **How do I migrate to Search v2?**

🤖 I found a **Migration** folder in the Search API v2 collection with everything you need. Here's the migration path:

**Key changes from v1 to v2:**

1. **Request format** - The query payload moved from query params to a JSON body
2. **Authentication** - Now uses Bearer tokens instead of API keys
3. **Response pagination** - Cursor-based instead of offset-based

**Requests to help you migrate:**

| Request                                  | Purpose                                                  |
| ---------------------------------------- | -------------------------------------------------------- |
| `Migration / v1 to v2 Request Converter` | Transforms your v1 query params into v2 JSON body format |
| `Migration / Validate v2 Compatibility`  | Tests if your current queries will work on v2            |
| `Migration / Token Exchange`             | Exchanges your v1 API key for a v2 Bearer token          |

**Example transformation:**

```
# v1 (deprecated)
GET /v1/search?q=laptop&category=electronics&limit=20

# v2
POST /v2/search
{
  "query": "laptop",
  "filters": { "category": "electronics" },
  "pagination": { "limit": 20 }
}
```

Want me to show you the full request details or the response schema differences?

---

## Other Questions You Could Ask

Here are more questions and topics that your agent can help you explore:

**Understanding the API landscape:**

- Who maintains the search API and how do I contact them?
- What kinds of search queries can I make?
- Are there any deprecated endpoints I should avoid?

**Practical/operational:**

- What rate limits should I be aware of?
- How do I test the search API locally?
- Show me example error responses and how to handle them
