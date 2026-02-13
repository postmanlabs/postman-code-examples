# Notion API Upgrade: 2022-02-22 → 2025-09-03

Tracking the upgrade of the Notion CLI from the old Notion API collection to the **Notion API (2025-09-03)** collection.

- **Old collection UID:** `15568543-d990f9b7-98d3-47d3-9131-4866ab9c6df2`
- **New collection UID:** `52041987-03f70d8f-b6e5-4306-805c-f95f7cdf05b9`
- **Notion-Version header:** `2022-02-22` → `2025-09-03`

---

## Summary of API changes

### Breaking: Database query → Data source query

The biggest change. Databases now act as containers for **data sources**, and querying moves from `/v1/databases/{database_id}/query` to `/v1/data_sources/{data_source_id}/query`. Database IDs and data source IDs are not interchangeable. To get a data source ID, first retrieve the database and extract it from the `data_sources` array.

This breaks our `database list` command and the `databases.query()` client.

### New resource: Data sources (5 endpoints)

| Endpoint | Method | URL |
|----------|--------|-----|
| Retrieve a data source | GET | `/v1/data_sources/{data_source_id}` |
| Update a data source | PATCH | `/v1/data_sources/{data_source_id}` |
| Query a data source | POST | `/v1/data_sources/{data_source_id}/query` |
| List data source templates | GET | `/v1/data_sources/{data_source_id}/templates` |
| Create a data source | POST | `/v1/data_sources` |

### New: Move page

`POST /v1/pages/{page_id}/move` — moves a page to a new parent page or database.

### New: Retrieve a comment

`GET /v1/comments/{comment_id}` — retrieves a single comment by ID.

### New resource: File uploads (5 endpoints)

Multi-part file upload support. Lifecycle: create → send (chunks) → complete.

| Endpoint | Method | URL |
|----------|--------|-----|
| Create a file upload | POST | `/v1/file_uploads` |
| Send file upload | POST | `/v1/file_uploads/{file_upload_id}/send` |
| Complete file upload | POST | `/v1/file_uploads/{file_upload_id}/complete` |
| Retrieve a file upload | GET | `/v1/file_uploads/{file_upload_id}` |
| List file uploads | GET | `/v1/file_uploads` |

### New resource: OAuth (3 endpoints)

Token management for OAuth integrations. These use **Basic auth** (`base64(client_id:client_secret)`), not bearer token auth.

| Endpoint | Method | URL | Purpose |
|----------|--------|-----|---------|
| Token | POST | `/v1/oauth/token` | Exchange authorization code for access token |
| Revoke | POST | `/v1/oauth/revoke` | Revoke an access/refresh token |
| Introspect | POST | `/v1/oauth/introspect` | Inspect a token's metadata |

### Response shape changes in existing endpoints

Comparing the new collection's example responses against the old, two changes affect our code:

**1. Page parent type: `database_id` → `data_source_id`**

Pages that live inside databases now report their parent as `data_source_id` instead of `database_id`:

```json
// Old
"parent": { "type": "database_id", "database_id": "668d797c-..." }

// New (2025-09-03)
"parent": { "type": "data_source_id", "data_source_id": "668d797c-..." }
```

This affects any code that checks `parent.type`. In our CLI:
- `page get` — displays parent info
- `integration pages` — filters pages by parent type to find roots
- `search` — displays parent type in results
- The `formatParent()` helper or equivalent logic

**2. Database response includes `data_sources` array**

`GET /v1/databases/{database_id}` now returns a `data_sources` array:

```json
"data_sources": [
  { "id": "abc-123-data-source-id", "name": "Main Data Source" }
]
```

Plus new fields: `is_locked`, `in_trash`. Our `database get` command should display the data source IDs (users will need them for the new query flow).

**3. Page response includes `in_trash` field**

Minor addition. The `in_trash` boolean is separate from `archived`. Not critical but worth surfacing in output.

**Request shapes unchanged** — All existing endpoint URLs, HTTP methods, and request body structures are identical. The only request-level change is the `Notion-Version` header value (`2022-02-22` → `2025-09-03`), which is set at runtime via `shared/variables.ts`.

### Comments consolidated

The old collection had two separate requests: "Add comment to page" and "Add comment to discussion". The new collection has a single "Create a comment" — the body determines which behavior (include `parent.page_id` for a page comment, or `discussion_id` for a reply). Our two existing clients still work fine, but we could consolidate.

### Archive page removed from collection

The old collection had a dedicated "Archive a page" request. This was always just `PATCH /v1/pages/{page_id}` with `{ archived: true }` — same as update page properties. Our `archivePage` client is fine; it just won't have a dedicated collection request backing it in the new collection.

---

## Understanding OAuth vs. integration tokens

The CLI currently uses **internal integration tokens** — a user creates an integration at notion.so/my-integrations, copies the secret, and stores it via `set-token`. Simple and direct.

**OAuth** is the mechanism for **public integrations** — apps that other Notion users can install into their workspaces (the "Add to Notion" flow). The flow:

1. User visits an authorization URL in their browser
2. They approve the app's requested permissions
3. Notion redirects back with an authorization code
4. The app exchanges the code for an access token via `POST /v1/oauth/token` (using Basic auth with client_id:client_secret)
5. The access token is used as a bearer token for subsequent API calls (same as integration tokens)

For the CLI, adding OAuth support would mean:
- A `login` or `auth` command that opens the browser, runs a local HTTP server for the redirect callback, captures the authorization code, and exchanges it for a token
- Token storage (and refresh, if applicable)
- The Token, Revoke, and Introspect endpoints are for managing these OAuth tokens

**Decision:** CLI commands for the OAuth building blocks (`oauth token`, `oauth introspect`, `oauth revoke`) are implemented. They require `NOTION_OAUTH_CLIENT_ID` and `NOTION_OAUTH_CLIENT_SECRET` env vars. The interactive browser-based login flow (`oauth login`) is not yet built — it would open the browser, spin up a local HTTP server at `http://localhost:9876/callback` for the redirect, exchange the code, and store the token. The internal integration token flow (`set-token`) remains the primary auth method.

---

## Upgrade steps

### Phase 1: Foundation

- [x] **1.1 Update `shared/variables.ts`** — Change `NOTION_VERSION` from `2022-02-22` to `2025-09-03`. Add new variables (`data_source_id`, `file_upload_id`, `comment_id`, etc.).

- [x] **1.2 Regenerate all existing clients** — Updated all 21 client headers to reference the new collection UID and request UIDs. Code unchanged since `notionVersion` is passed as a parameter. The existing 21 clients:
  - `blocks/`: append-block-children, delete-block, retrieve-block, retrieve-block-children, update-block
  - `comments/`: add-comment-to-page, add-comment-to-discussion, retrieve-comments
  - `databases/`: create-database, query-database, retrieve-database, update-database
  - `pages/`: archive-page, create-page, retrieve-page, retrieve-page-property, update-page-properties
  - `search/`: search
  - `users/`: list-users, retrieve-bot-user, retrieve-user

- [x] **1.3 Handle the query-database → data source migration** — The `query-database` client currently hits `/v1/databases/{database_id}/query`. In the new API this endpoint doesn't exist. Two options:
  - (a) Replace `query-database` with the new `query-data-source` client and update `database list` to first retrieve the database, extract the data source ID, then query the data source
  - (b) Keep a backwards-compatible wrapper

  Option (a) is cleaner. The `database list` command will need a two-step flow.

- [x] **1.4 Update `index.ts`** — Add new namespaces (`dataSources`, `fileUploads`, `oauth`) and re-export new clients.

### Phase 1b: Handle response shape changes

- [x] **1b.1 Update parent type handling** — Everywhere we check `parent.type === "database_id"`, add handling for `"data_source_id"`. This includes the page display logic, the `integration pages` root-detection logic, and search result formatting. Grep for `database_id` in the commands layer to find all affected spots.

- [x] **1b.2 Update `database get` output** — Display the `data_sources` array (ID and name for each) so users can see data source IDs. These IDs are needed for the new query flow.

- [x] **1b.3 Update `database list` to extract data source ID** — Before querying, call `databases.retrieve()` first, extract the data source ID from `data_sources[0].id`, then call `dataSources.query()` with that ID. This is the migration path for the removed `/v1/databases/{id}/query` endpoint.

- [x] **1b.4 Surface `in_trash` in page/database output** — Minor. Show `In trash: true` when present, alongside the existing `Archived` field.

### Phase 2: New data source clients & commands

- [x] **2.1 Generate data source clients** (5 new clients):
  - `data-sources/retrieve-data-source/client.ts`
  - `data-sources/update-data-source/client.ts`
  - `data-sources/query-data-source/client.ts`
  - `data-sources/list-data-source-templates/client.ts`
  - `data-sources/create-data-source/client.ts`

- [x] **2.2 Add `dataSources` namespace to `index.ts`** — Methods: `retrieve`, `update`, `query`, `create`, `listTemplates`

- [x] **2.3 Update `database list` command** — Change to a two-step flow: retrieve database → extract data source ID → query data source. The command output should remain the same.

- [x] **2.4 Add `datasource` CLI commands** — New top-level command group:
  - `datasource get <data-source-id>` — retrieve a data source
  - `datasource query <data-source-id>` — query entries from a data source
  - `datasource templates <data-source-id>` — list page templates
  - `datasource create <database-id> --title "..."` — create a data source in a database
  - `datasource update <data-source-id> --title "..."` — update a data source

### Phase 3: New page, comment, and file upload clients & commands

- [x] **3.1 Generate `move-page` client** — `pages/move-page/client.ts`

- [x] **3.2 Add `page move` command** — `notion-cli page move <page-id> --parent <new-parent-id>`

- [x] **3.3 Generate `retrieve-comment` client** — `comments/retrieve-comment/client.ts`

- [x] **3.4 Add `comment get` command** — `notion-cli comment get <comment-id>`

- [x] **3.5 Generate file upload clients** (5 new clients):
  - `file-uploads/create-file-upload/client.ts`
  - `file-uploads/send-file-upload/client.ts`
  - `file-uploads/complete-file-upload/client.ts`
  - `file-uploads/retrieve-file-upload/client.ts`
  - `file-uploads/list-file-uploads/client.ts`

- [x] **3.6 Add `fileUploads` namespace to `index.ts`** — Methods: `create`, `send`, `complete`, `retrieve`, `list`

- [x] **3.7 Add `file` CLI commands**:
  - `file upload <path>` — creates upload, sends via multipart/form-data, reports result
  - `file list` — list file uploads
  - `file get <file-upload-id>` — retrieve a file upload

### Phase 4: OAuth clients

- [x] **4.1 Generate OAuth clients** (3 new clients):
  - `oauth/token/client.ts`
  - `oauth/revoke/client.ts`
  - `oauth/introspect/client.ts`

  Note: these use Basic auth, not Bearer token. The clients will need a different auth mechanism than the rest.

- [x] **4.2 Add `oauth` namespace to `index.ts`** — Methods: `token`, `revoke`, `introspect`

- [x] **4.3 Add OAuth CLI commands** — `oauth token`, `oauth introspect`, `oauth revoke`. All require `NOTION_OAUTH_CLIENT_ID` and `NOTION_OAUTH_CLIENT_SECRET` env vars. The interactive `oauth login` browser flow is not yet built.

### Phase 5: Cleanup & testing

- [ ] **5.1 Consider consolidating comment clients** — The old "add-comment-to-page" and "add-comment-to-discussion" could become a single "create-comment" client. Low priority since existing behavior works.

- [x] **5.2 Update integration tests** — Added tests for `page move`, `comment get` (formatted + raw), `datasource` (get, query, update, templates — all with raw variants), `file` (upload, list, get — all with raw variants). Updated OAuth tests to cover CLI commands alongside client tests. 43 tests across 10 suites, all passing.

- [x] **5.3 Update README.md** — Documented all new commands (datasource, file, oauth, page move, comment get), the data source concept, file uploads, OAuth, and the API version. Updated the intro paragraph to mention 2025-09-03.

- [x] **5.4 Update the command table in README** — Added rows for all 13 new commands with collection request links and generated client paths.

---

## New collection request ID reference

For use with `postman-code client install -c 52041987-03f70d8f-b6e5-4306-805c-f95f7cdf05b9 -r <request-id>`:

### Existing endpoints (new request IDs)

| Endpoint | Request UID |
|----------|-------------|
| Retrieve bot user | `52041987-30ad8b7b-5eb0-4bbe-bfbf-509d7f961cae` |
| Retrieve a user | `52041987-e23bf76f-cb3a-4bbc-9e5a-0a39cd59e909` |
| List all users | `52041987-1f6b9bec-dc7d-4412-9e80-46a33b8b11c6` |
| Retrieve a page property item | `52041987-e3c019ad-9c8b-4975-a142-5549ef771028` |
| Retrieve a page | `52041987-d7e520f6-0c75-4fe0-9b23-990f742d496e` |
| Create a page | `52041987-a2ef9963-62e0-4e87-a12b-f899f695280c` |
| Update page properties | `52041987-de2726f0-1465-4fdc-81d5-bd35415848b4` |
| Retrieve block children | `52041987-039ea5be-709a-4539-b021-170a63eba771` |
| Append block children | `52041987-a9376866-eb97-4cfa-b08d-5fc49f09ef26` |
| Retrieve a block | `52041987-30ea7fcd-b8b4-441f-935a-c9d143d59d66` |
| Update a block | `52041987-1a96de40-de2c-49c8-9697-fc91b077d06d` |
| Delete a block | `52041987-95e3f732-e993-42b4-8451-70178b3d2ac9` |
| Retrieve a database | `52041987-73359528-2278-415f-98f2-4d20274cc69e` |
| Create a database | `52041987-85ab373b-2fc1-4b9a-a8a6-ee6b9e72728c` |
| Update a database | `52041987-5febd2f6-c9ff-486d-8a4b-71e5c58f82ef` |
| Search | `52041987-0e8a4f2d-d453-4bc1-b4c6-286905b87f4a` |
| Create a comment | `52041987-9261f5ec-6b04-4d13-83a0-d12fe1b188c7` |
| Retrieve comments | `52041987-4def4425-319e-418c-9d96-56a4807a8ce7` |

### New endpoints

| Endpoint | Request UID |
|----------|-------------|
| Move page | `52041987-9686de7b-77c0-4d53-b800-bf6c748bc668` |
| Retrieve a comment | `52041987-2f312153-d16c-459b-9d51-88358a96fe03` |
| Retrieve a data source | `52041987-dfeeac14-f85e-4527-ad2e-d85f79284dd9` |
| Update a data source | `52041987-29f06253-bd7e-4c3c-b0d8-a36b285c4e0e` |
| Query a data source | `52041987-aa498c21-f7e7-4839-bbe7-78957fb7379d` |
| List data source templates | `52041987-f38c907f-36d5-40c7-b057-e4811b4b5cde` |
| Create a data source | `52041987-9c41977a-1606-4c76-a4e0-d094a3d0b4c7` |
| Create a file upload | `52041987-1548ae35-ac12-4fc3-a337-416ed2a92088` |
| Send file upload | `52041987-aaf29c9a-7236-432d-97e8-beebee88b3cd` |
| Complete file upload | `52041987-80549896-30b1-43a4-add0-a73958b602e1` |
| Retrieve a file upload | `52041987-2f30fd9c-c12b-40fc-bb98-03d153c3e353` |
| List file uploads | `52041987-d6b82f81-aaf2-4cc0-b92c-c8cdf709e67d` |
| OAuth Token | `52041987-ced3cc2e-170e-40fa-8f39-fee0f6a464d7` |
| OAuth Revoke | `52041987-2e4a8940-5ef0-42b2-9c3c-d56c1752e9ac` |
| OAuth Introspect | `52041987-3070c020-0b6d-402f-bd18-88e9e1348521` |

---

## Upgrade log

What actually happened when the agent executed this upgrade, in order.

### 1. Assessed what needed to change vs. what didn't

Before touching code, read the existing `search/search/client.ts` to check whether `notionVersion` was hardcoded or passed as a parameter. It's a parameter — injected from `shared/variables.ts` via `index.ts` at client creation time. This meant the 21 existing client functions didn't need code changes, only header metadata updates (collection UID, request UID, modified timestamp). The actual HTTP code is identical between the old and new collections for every existing endpoint.

This was the key insight that shaped the whole approach: the generated client layer is a thin, parameterized HTTP wrapper. The version upgrade flows through `variables.ts` → `index.ts` → every client call. No per-client code changes needed for existing endpoints.

### 2. Updated `shared/variables.ts`

Changed `NOTION_VERSION` from `2022-02-22` to `2025-09-03`. Added the three new collection variables: `COMMENT_ID`, `DATA_SOURCE_ID`, `FILE_UPLOAD_ID`. Updated the collection UID in the file header.

### 3. Updated all 21 existing client headers

Used the request ID reference table (already in this document) to map each existing client file to its new request UID in the new collection. Updated in a single batch:

- **Collection name**: `Notion API` → `Notion API (2025-09-03)`
- **Collection UID**: `15568543-d990f9b7-...` → `52041987-03f70d8f-...`
- **Request UIDs**: each mapped individually to the new collection's request ID
- **Request paths**: updated where names changed (e.g., "Add comment to page" → "Create a comment")

Special cases:
- `archive-page` — no dedicated request in the new collection. Mapped to "Update page properties" with a note, since archive is just `PATCH /v1/pages/{id}` with `{ archived: true }`.
- `query-database` — endpoint removed in the new API. Header updated with deprecation note; the client is kept for fallback but `database list` now uses the data source flow.
- Both comment clients (`add-comment-to-page`, `add-comment-to-discussion`) — now map to the same "Create a comment" request UID, since the new collection consolidated them.

### 4. Updated `shared/types.ts` for new response shapes

Four changes to existing types:
- `PageParent.type` — added `"data_source_id"` to the union and `data_source_id?: string` field
- `NotionPage` — added `in_trash?: boolean`
- `NotionDatabase` — added `is_locked?: boolean`, `in_trash?: boolean`, `data_sources?: DataSourceReference[]`
- New `DataSourceReference` interface (`id`, `name`)

New types added:
- `QueryDataSourceParams` / `QueryDataSourceResponse` — mirrors the old database query types
- `CreateDataSourceParams` / `UpdateDataSourceParams`
- `MovePageParams`

### 5. Generated 15 new client files

Used `postman-code client install` to fetch the API context for each new endpoint, then wrote client code matching the existing project conventions (same patterns as the 21 existing clients: explicit function parameters, typed responses, `NotionError` handling, JSDoc with `@see` links).

**Data sources** (5 clients — `data-sources/` directory):
- `query-data-source` — POST `/v1/data_sources/{id}/query`
- `retrieve-data-source` — GET `/v1/data_sources/{id}`
- `update-data-source` — PATCH `/v1/data_sources/{id}`
- `create-data-source` — POST `/v1/data_sources`
- `list-data-source-templates` — GET `/v1/data_sources/{id}/templates`

**Pages & comments** (2 clients):
- `move-page` — POST `/v1/pages/{id}/move`
- `retrieve-comment` — GET `/v1/comments/{id}`

**File uploads** (5 clients — `file-uploads/` directory):
- `create-file-upload` — POST `/v1/file_uploads`
- `send-file-upload` — POST `/v1/file_uploads/{id}/send`
- `complete-file-upload` — POST `/v1/file_uploads/{id}/complete`
- `retrieve-file-upload` — GET `/v1/file_uploads/{id}`
- `list-file-uploads` — GET `/v1/file_uploads`

**OAuth** (3 clients — `oauth/` directory):
- `token` — POST `/v1/oauth/token` (Basic auth, not Bearer)
- `revoke` — POST `/v1/oauth/revoke` (Basic auth)
- `introspect` — POST `/v1/oauth/introspect` (Basic auth)

The OAuth clients are the only ones that don't use the standard Bearer token auth pattern — they accept `clientId` and `clientSecret` parameters and use Basic auth, matching the Notion OAuth spec.

### 6. Rewrote `index.ts` with new namespaces

Added four new namespaces to the `createNotionClient()` return object:
- `dataSources` — `retrieve`, `query`, `create`, `update`, `listTemplates`
- `pages.move` — added to existing pages namespace
- `comments.retrieve` — added to existing comments namespace
- `fileUploads` — `create`, `send`, `complete`, `retrieve`, `list`
- `oauth` — `token`, `revoke`, `introspect`

Marked `databases.query()` as `@deprecated` with a pointer to `dataSources.query()`.

Re-exported all new types.

### 7. Updated command layer for response shape changes

**Parent type handling** (`page.ts`, `search.ts`, `integration.ts`):
- Added `parent.type === "data_source_id"` branches wherever `"database_id"` was checked
- In `integration.ts`, the root-detection filter now explicitly handles `data_source_id` parents as non-roots (same as `database_id`)

**`database get`** (`database.ts`):
- Now displays the `data_sources` array with IDs and names
- Shows `is_locked` and `in_trash` fields when present
- Hints the data source ID in the "To list entries" footer

**`database list`** (`database.ts`):
- Changed to a two-step flow: first retrieves the database to extract `data_sources[0].id`, then calls `dataSources.query()` with that ID
- Falls back to the legacy `databases.query()` if no data sources array is present

**`page get`** (`page.ts`):
- Now shows `Archived` and `In trash` fields in output

### 8. Build verification

Ran `npm run build` (TypeScript compiler). Clean build, no errors. All 36 client files (21 existing + 15 new), the updated `index.ts`, and the updated command files compile without issues.

### 9. Integration tests and additional breaking changes

Updated the integration test suite to account for API version changes and new response shapes.

**Additional breaking changes discovered by running the tests:**

- **Search filter value**: The 2025-09-03 API changed the search filter value from `"database"` to `"data_source"`. Updated `SearchFilter` type and added a `FILTER_API_VALUE` mapping in `search.ts` so the CLI's `--filter database` flag maps to the new API value transparently.
- **Database create parent requires explicit `type`**: The new API rejects `{ page_id: id }` and requires `{ type: "page_id", page_id: id }`. Updated `CreateDatabaseParams` type and `database.ts` command.
- **Database `properties` may be absent**: Freshly created databases no longer include a `properties` field in the response. Added a guard (`database.properties || {}`) in the `database get` display.
- **`archived` field on databases**: May be absent in the 2025-09-03 response. Now only displayed when present.

**Test changes** (`integration.test.ts`):
- Added `Archived:` assertion to `page get` test
- Added new `database get shows data sources when present` test
- Relaxed `database get` schema assertion (new API may not return properties on fresh databases)

**OAuth test suite** (`oauth.test.ts`):
- New file with env var gating — skips cleanly when `NOTION_OAUTH_CLIENT_ID` / `NOTION_OAUTH_CLIENT_SECRET` are not set
- Tests: token exchange error handling, introspect (when token provided), revoke (commented out — destructive)
- Added `test:oauth` npm script
- OAuth redirect URI convention: `http://localhost:9876/callback` (CLI will spin up a temp local server)

All 29 integration tests pass. OAuth tests skip cleanly.

### 10. Wired up all new CLI commands and fixed clients

Added 10 new subcommands across 5 areas:

**New command groups** (3 new files in `commands/`):
- `datasource` — `get`, `query`, `templates`, `create`, `update`. Operates directly on data source IDs. Keeps a clean boundary with `database` commands (no crossing API resources).
- `file` — `upload`, `list`, `get`. The `upload` command handles the full create → send → complete lifecycle in one step.
- `oauth` — `token`, `introspect`, `revoke`. All gated on `NOTION_OAUTH_CLIENT_ID` and `NOTION_OAUTH_CLIENT_SECRET` env vars.

**Added to existing command groups:**
- `page move` — moves a page to a new parent via `--parent <id>`
- `comment get` — retrieves a single comment by ID

**Client fixes** (3 clients had mismatches between the Postman collection definitions and the real Notion API):
- `create-file-upload` — collection had `{ name, size }` but API expects `{ mode, filename, content_type }`. Rewrote params and response type.
- `send-file-upload` — collection had JSON body with base64 data but API expects `multipart/form-data` with raw binary. Rewrote to use FormData/Blob.
- `list-data-source-templates` — response shape is `{ templates: [...] }` not `{ object: "list", results: [...] }`. Fixed response type, added query params support.

**File upload workflow refinement:**
- For `single_part` mode, the send step auto-transitions the upload to `uploaded` status, so the complete step is skipped. Complete is only called for `multi_part` uploads.

**Tests:**
- Added `page move` test (create two pages, move one under the other, verify, move back)
- Added `comment get` tests (formatted + raw)
- New `datasource.test.ts` — 6 tests covering get, query, update, templates (all with raw variants)
- New `file.test.ts` — 6 tests covering upload, list, get (all with raw variants)
- Updated `oauth.test.ts` to test CLI commands alongside client-level tests
- Added `test:datasource` and `test:file` npm scripts

All 43 integration tests pass across 10 suites. OAuth tests skip cleanly without credentials.

**README updates:**
- Intro mentions API version `2025-09-03` and OAuth support
- "What you can do" section covers data sources, file uploads, OAuth, page move
- Full usage documentation for all new commands
- Command table has rows for all 13 new commands
- Test coverage table updated with new suites

### What's left

- [x] **5.1 Consolidate comment clients** — Replaced `add-comment-to-page` and `add-comment-to-discussion` with a single `create-comment` client. The `CreateCommentParams` interface accepts either `parent.page_id` (new thread) or `discussion_id` (reply). The CLI commands (`comment add`, `comment reply`) now both call `notion.comments.create()`.
- [ ] **OAuth login flow** — An interactive `oauth login` command that opens the browser, spins up a local HTTP server for the redirect callback, exchanges the code, and stores the token. The building blocks (`oauth token`, `introspect`, `revoke`) are in place.
