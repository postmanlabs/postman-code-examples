# Notion CLI — Task Tracker

Worklist for expanding the CLI to cover the full Notion API collection.

Collection: **Notion API** (`15568543-d990f9b7-98d3-47d3-9131-4866ab9c6df2`)

## What's done

| Command | Client | Request ID |
|---------|--------|------------|
| `search` | `search/search/client.ts` | `15568543-816435ec-1d78-4c55-a85e-a1a4a8a24564` |
| `page get` | `pages/retrieve-page/client.ts` | `15568543-8a70cbd1-7dbe-4699-a04e-108084a9c31b` |
| `page create` | `pages/create-page/client.ts` | `15568543-d23f8f9c-e220-46d8-9ac2-aab80b909a42` |
| `page update` | `pages/update-page-properties/client.ts` | `15568543-3f95deb8-805c-4c1c-a487-a090f06da32f` |
| `page archive` | `pages/archive-page/client.ts` | `15568543-5911c414-b183-49d7-8c22-72f60a2d0a98` |
| `page property` | `pages/retrieve-page-property/client.ts` | `15568543-d1bc0b09-7043-4c5d-823f-186fa9110c0f` |
| `database get` | `databases/retrieve-database/client.ts` | `15568543-095c448d-2373-4aee-9b9e-ed3cf58afbe3` |
| `database list` | `databases/query-database/client.ts` | `15568543-cddcc0aa-d534-4744-b37a-ddf36dee7d8f` |
| `database create` | `databases/create-database/client.ts` | `15568543-a027e2d4-11f2-4068-a82c-cb9fb8562036` |
| `database update` | `databases/update-database/client.ts` | `15568543-4ed21a83-c1aa-4e3b-b35e-2133faf2ea51` |
| `block get` | `blocks/retrieve-block/client.ts` | `15568543-9142406e-2a57-4861-9f3e-86fd5c847813` |
| `block children` | `blocks/retrieve-block-children/client.ts` | `15568543-228caaa0-074b-4487-a515-efcea60e5906` |
| `block append` | `blocks/append-block-children/client.ts` | `15568543-dcab1db7-5157-406b-b4ad-65699dc32900` |
| `block update` | `blocks/update-block/client.ts` | `15568543-730dedda-9c55-41e8-9a06-7393f7c8b1c4` |
| `block delete` | `blocks/delete-block/client.ts` | `15568543-b13eff7b-ac0a-4cd8-bce2-080d4211be86` |
| `comment list` | `comments/retrieve-comments/client.ts` | `15568543-a578d9ef-3e9e-4303-b83e-a1ce660ec699` |
| `comment add` | `comments/add-comment-to-page/client.ts` | `15568543-262fbf44-6031-44b5-b91a-a919fea9b311` |
| `comment reply` | `comments/add-comment-to-discussion/client.ts` | `15568543-d78e06cd-6fd2-45b1-af60-1e0b703455df` |
| `user me` | `users/retrieve-bot-user/client.ts` | `15568543-e3aad8e1-2357-4174-92c2-d8ae56637d60` |
| `user get` | `users/retrieve-user/client.ts` | `15568543-c8944457-5f3a-4eb0-add2-8aeb15d9765b` |
| `user list` | `users/list-users/client.ts` | `15568543-f7bf2b64-2739-4539-aee0-326f61b9bfbf` |

## What's left

All Notion API collection requests are covered. No remaining tasks.

> "Sort a database" (`15568543-a3840c38-d152-494c-b62c-cfee89347524`) and "Filter a database" (`15568543-ce121c40-153d-4a00-aade-25eb6cf5245a`) are variants of Query — already covered by `query-database/client.ts`.

> "Update database properties" (`15568543-9d6773b2-72f5-4e81-929c-94498848cc4e`) is the same endpoint as "Update a database" — covered by `update-database/client.ts`.

## Summary

| Resource | Done | Remaining |
|----------|------|-----------|
| Users | 3 | 0 |
| Pages | 5 | 0 |
| Databases | 4 | 0 |
| Blocks | 5 | 0 |
| Comments | 3 | 0 |
| Search | 1 | 0 |
| **Total** | **21** | **0** |

## Utility commands (not collection-backed)

These commands exist in the CLI but are not direct mappings to a Notion API collection request, so they are not counted above:

- `set-token` — stores the Notion token locally
- `integration pages` — derives root pages by paginating the Search API

## Workflow per task

1. `postman-code client install -c 15568543-d990f9b7-98d3-47d3-9131-4866ab9c6df2 -r <request-id> -l typescript`
2. Create `client.ts` in the path listed above (follow the pattern in existing clients)
3. Add any new types to `shared/types.ts` (reuse existing types like `NotionUser` when they already cover the response shape)
4. Wire into `index.ts` (import function, import types, add to client object, add to type re-exports)
5. Add CLI command in `commands/<resource>.ts`
6. Register in `cli.ts` if new command group
7. Add integration test(s) in `test/integration.test.ts` — follow the existing pattern: use `--raw` for commands that need to capture IDs, formatted output for others. If the new command needs an ID from a prior command, add it in the right position in the test sequence.
8. Build and run `npm run test:integration` to verify
9. Update this file: move task to "What's done" table, remove from "What's left", update summary counts
10. Update `README.md`: add usage docs for the new command, update the testing table, update project structure if new directories were created
