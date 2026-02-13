# Known Issues

## OAuth tokens cannot read comments

**Status:** Unresolved — reported 2026-02-13

**Summary:** Comment read operations fail when using an OAuth access token, despite the token having `read_comment` scope and the integration having "Read comments" capability enabled. The same operations work correctly with an internal integration token on the same pages.

### Symptoms

| Endpoint | OAuth token | Internal token |
|----------|------------|----------------|
| `POST /v1/comments` (create) | 200, but partial response: `{ object, id, request_id }` | 200, full response with `discussion_id`, `rich_text`, etc. |
| `GET /v1/comments/:id` (retrieve) | 200, but partial response: `{ object, id, request_id }` | 200, full response |
| `GET /v1/comments?block_id=:id` (list) | 404 "Could not find block" | 200, full list |

The partial response matches Notion's documented [Option 1 / `partialCommentObjectResponse`](https://developers.notion.com/reference/retrieve-comment) — the shape returned when the token lacks read comment permissions.

### What we verified

- **Token scope:** `read_comment` is present (confirmed via `POST /v1/oauth/introspect`)
- **Integration capabilities:** "Read comments" and "Insert comments" both enabled in the [integration dashboard](https://www.notion.so/profile/integrations)
- **Page-level permissions:** Page shows "Can read comments" for the OAuth integration in the Notion UI (Connections panel)
- **Page accessibility:** The same page returns 200 for `GET /v1/pages/:id`, `GET /v1/blocks/:id`, and `GET /v1/blocks/:id/children` with the OAuth token
- **Comment creation works:** `POST /v1/comments` succeeds (comments appear in the Notion UI), but the response is partial
- **API version:** Same behavior with both `2022-06-28` and `2025-09-03`
- **Fresh token:** Revoked and re-authorized — same behavior with a new token
- **Internal token on same page:** All comment operations work correctly with an internal integration token (`owner.type: "workspace"`) on the exact same page

### Workaround

Use an internal integration token for comment operations. The CLI supports both auth methods:

```bash
# Switch to internal auth
notion-cli auth-internal set

# Switch back to OAuth
notion-cli auth-public login
```

### Impact on tests

The `comment` test suite requires an internal integration token to pass. When authenticated via OAuth, all 5 comment tests that read comment data will fail. Other test suites (block, page, database, search, user, etc.) are unaffected.
