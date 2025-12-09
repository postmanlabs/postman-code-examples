# hubspot-api-explorer

This is an example of using the Postman MCP Server, `code` toolset, to explore the [HubSpot Public API Workspace](https://www.postman.com/hubspot/hubspot-public-api-workspace/overview) on Postman.

## Conversations

Below are Q&A exchanges between a human (🧑) and an AI agent (🤖) that uses Postman's MCP tools to search collections, inspect requests, and answer questions about the HubSpot API.

### 🧑 **Tell me about each of the collections in HubSpot's public workspace.**

🤖 HubSpot maintains 3 public Postman workspaces. Here's a breakdown:

**1. HubSpot Public API Workspace** (main official API reference)
Contains 15 collections organized by product area:

- **CRM**: Contacts, Companies, Deals, Tickets, Products, Line Items, Quotes, etc.
- **CMS**: Pages, Blog Posts, HubDb, Domains, URL Redirects
- **Marketing**: Forms, Emails, Campaigns, Events, Subscription Preferences
- **Automation**: Workflows, Sequences, Custom Workflow Actions
- **Conversations**: Custom Channels, Visitor Identification
- **Settings**: Users, Business Units, Currencies, Account Info
- **Other**: Auth (OAuth), Webhooks, GraphQL, Engagements, Extend CRM (Cards, Timeline)

These collections sync directly from HubSpot's OpenAPI specs—fork them to get updates.

**2. HubSpot Developer Use Cases** (tutorials & examples)
Collections tied to HubSpot Developer Blog posts:

- "A Developer's Guide to HubSpot CRM Objects"
- "Customizing the CRM with custom objects"
- OAuth templates and user provisioning examples
- AWS ML integration tutorials
- HubSpot RAG Assistant, Data Builder

**3. HubSpot Flows Workspace** (visual API workflows)
Pre-built Postman Flows for common tasks:

- Invoice Creation, Contact/Deal/Company Associations
- OAuth Flow with Public App
- Agentic Flows: Call Analysis, Ticket Escalation (using OpenAI/Gemini)
- Data Builder, File Manager Search

**Starting Points:**

- Fork collections from "HubSpot Public API Workspace" for the latest API specs
- Use "HubSpot Flows Workspace" for ready-to-run workflow examples
- Check "HubSpot Developer Use Cases" for blog-linked tutorials

---

### 🧑 **How does authentication work for the HubSpot API?**

🤖 HubSpot uses OAuth 2.0 for API authentication. Based on the "[Flow] HubSpot OAuth Flow with Public App" collection from HubSpot's verified Postman workspace, the flow works as follows:

**1. Initiate Authorization**
Redirect users to HubSpot's authorization endpoint with your app credentials:
`https://app.hubspot.com/oauth/authorize?client_id={{client_id}}&redirect_uri={{redirect_uri}}&scope={{scope}}`

**2. Exchange Code for Token**
After user authorization, HubSpot redirects back with an authorization code. Exchange it for an access token via POST to `https://api.hubapi.com/oauth/v1/token` with:

- grant_type: "authorization_code"
- client_id, client_secret, redirect_uri
- code (from the redirect)

**3. Use Access Token**
Include the access token in API requests. Tokens expire and can be refreshed using the refresh token endpoint (see "get-/oauth/v1/refresh-tokens/{token}" in the collection).

**Starting Points for More Research:**

- Postman Collection: "[Flow] HubSpot OAuth Flow with Public App" in the HubSpot Flows Workspace
- Postman Collection: "OAuth - OAuth Template Collection" in HubSpot Developer Use Cases workspace
- HubSpot Developer Portal: https://developers.hubspot.com/get-started (for creating apps and getting credentials)

---

### 🧑 **How do I create a contact and associate it with a company?**

🤖 This is a two-step process using the CRM API. Based on the "CRM - A Developer's Guide to HubSpot CRM Objects" collection:

**Step 1: Create the Contact**
POST to `https://api.hubapi.com/crm/v3/objects/contacts` with a JSON body:

```json
{
  "properties": {
    "email": "newcontact@example.com",
    "firstname": "New",
    "lastname": "Contact",
    "company": "Example Company",
    "phone": "555-555-5555"
  }
}
```

**Step 2: Associate with Company**
Use the v4 associations API to link the contact to a company:
POST to `https://api.hubapi.com/crm/v4/objects/contacts/{{contactId}}/associations/companies/{{companyId}}/{{associationTypeId}}`

The `associationTypeId` defines the relationship type (e.g., primary company). Use the "Get Association Type IDs" request to retrieve valid type IDs.

**Starting Points:**

- Postman Collection: "CRM - A Developer's Guide to HubSpot CRM Objects" (HubSpot Developer Use Cases)
- Postman Flow: "[Flow] Automate HubSpot Contact, Deal, Company Associations" (HubSpot Flows Workspace)

---

### 🧑 **What's the difference between the v3 and v4 associations APIs?**

🤖 Based on the "CRM API Collections" in HubSpot Public API Workspace, both versions exist but serve different purposes:

**Associations V3 API** (`/crm/v3/associations/`)

- Simpler, legacy approach
- Basic batch operations: create, read, archive associations
- URL pattern: `/crm/v3/associations/:fromObjectType/:toObjectType/batch/create`
- Less granular control over association types

**Associations V4 API** (`/crm/v4/associations/`)

- Current recommended API
- Supports labeled associations and association categories (`HUBSPOT_DEFINED`, `INTEGRATOR_DEFINED`)
- More operations: Create Default Associations, Delete Specific Labels
- URL pattern: `/crm/v4/associations/:fromObjectType/:toObjectType/batch/create`
- Request body includes `types` array with `associationCategory` and `associationTypeId`

**Key Difference:** V4 lets you specify association labels (like "Primary" vs "Secondary" company) and custom association types, while V3 only creates basic unlabeled associations.

**Starting Points:**

- Postman Collection: "CRM API Collections" → "Associations V3 API" and "Associations V4 API" folders
- Postman Collection: "CRM API Collections" → "Associations V4 Schema API" for managing association definitions

---

### 🧑 **How do I search for deals by custom properties?**

🤖 Use the CRM Search API. Based on the "Deals API" → "Search" folder in "CRM API Collections":

**Endpoint:** POST `https://api.hubapi.com/crm/v3/objects/deals/search`

**Request Body Structure:**

```json
{
  "filterGroups": [
    {
      "filters": [
        {
          "propertyName": "your_custom_property",
          "operator": "EQ",
          "value": "desired_value"
        }
      ]
    }
  ],
  "properties": ["dealname", "amount", "your_custom_property"],
  "limit": 10
}
```

**Available Operators:** `EQ`, `NEQ`, `LT`, `LTE`, `GT`, `GTE`, `CONTAINS_TOKEN`, `NOT_CONTAINS_TOKEN`, `IN`, `NOT_IN`, `BETWEEN`

**Filter Logic:**

- Filters within a `filterGroup` are AND'd together
- Multiple `filterGroups` are OR'd together

**Response** includes `results` array with matching deals, their properties, and `paging` info for pagination.

**Starting Points:**

- Postman Collection: "CRM API Collections" → "Deals API" → "Search"
- Same search pattern works for contacts, companies, tickets, and custom objects

---

## Other Questions You Could Ask

Here are more questions and topics that your agent can help you explore:

**Understanding the API landscape:**

- What can I do with the HubSpot CMS API?
- How do custom objects work in HubSpot?
- What automation capabilities are available via API?

**Use-case driven questions:**

- How would I sync contacts between HubSpot and an external system?
- What's the best way to bulk import data into HubSpot?
- How do I set up webhooks to listen for contact updates?

**Practical/operational:**

- What scopes do I need for working with deals?
- How does pagination work across HubSpot APIs?
- What rate limits should I be aware of?

**Flows and workflows:**

- How do I use Postman Flows to automate invoice creation?
- What agentic workflows has HubSpot published?
