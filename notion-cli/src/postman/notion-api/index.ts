/**
 * Notion API SDK-style client
 *
 * Generated from Postman Code — re-exports all API functions
 * grouped by resource namespace for ergonomic usage:
 *
 *   import { createNotionClient } from "./src/postman/notion-api/index.js";
 *
 *   const notion = createNotionClient(token);
 *   const db = await notion.databases.retrieve(id);
 *   const results = await notion.databases.query(id);
 *   const page = await notion.pages.retrieve(id);
 *   const children = await notion.blocks.retrieveChildren(id);
 *   const hits = await notion.search();
 *
 * The bearer token and collection-level variables like the Notion API
 * version are provided at instantiation — callers only need to supply
 * resource IDs and optional request parameters.
 */

import { retrieveBlockChildren as _retrieveBlockChildren } from "./blocks/retrieve-block-children/client.js";
import { queryDatabase as _queryDatabase } from "./databases/query-database/client.js";
import { retrieveDatabase as _retrieveDatabase } from "./databases/retrieve-database/client.js";
import { retrievePage as _retrievePage } from "./pages/retrieve-page/client.js";
import { search as _search } from "./search/search/client.js";
import { variables } from "./shared/variables.js";

import type {
  RetrieveBlockChildrenParams,
  RetrieveBlockChildrenResponse,
  QueryDatabaseParams,
  QueryDatabaseResponse,
  NotionDatabase,
  NotionPage,
  SearchParams,
  SearchResponse,
} from "./shared/types.js";

const { NOTION_VERSION } = variables.collection;

/**
 * Create a Notion API client bound to the given bearer token.
 *
 * Collection-level variables (like the API version) are read from
 * shared/variables.ts and injected into every request automatically.
 *
 * @param bearerToken - Notion API bearer token (integration secret)
 */
export function createNotionClient(bearerToken: string) {
  return {
    blocks: {
      retrieveChildren: (
        blockId: string,
        params?: RetrieveBlockChildrenParams
      ): Promise<RetrieveBlockChildrenResponse> =>
        _retrieveBlockChildren(blockId, bearerToken, NOTION_VERSION, params),
    },
    databases: {
      retrieve: (databaseId: string): Promise<NotionDatabase> =>
        _retrieveDatabase(databaseId, bearerToken, NOTION_VERSION),
      query: (
        databaseId: string,
        params?: QueryDatabaseParams
      ): Promise<QueryDatabaseResponse> =>
        _queryDatabase(databaseId, bearerToken, NOTION_VERSION, params),
    },
    pages: {
      retrieve: (pageId: string): Promise<NotionPage> =>
        _retrievePage(pageId, bearerToken, NOTION_VERSION),
    },
    search: (params?: SearchParams): Promise<SearchResponse> =>
      _search(bearerToken, NOTION_VERSION, params),
  } as const;
}

// Re-export all types for convenient access
export type {
  // Core objects
  NotionPage,
  NotionBlock,
  NotionDatabase,
  NotionError,
  // Building blocks
  UserReference,
  PageParent,
  RichTextAnnotations,
  RichTextItem,
  PropertyValue,
  DatabasePropertySchema,
  DatabaseParent,
  // Request params
  RetrieveBlockChildrenParams,
  QueryDatabaseParams,
  SearchParams,
  SearchFilter,
  SearchSort,
  // Response types
  RetrieveBlockChildrenResponse,
  QueryDatabaseResponse,
  SearchResponse,
} from "./shared/types.js";

// Re-export collection variables
export { variables } from "./shared/variables.js";
