/**
 * Notion API SDK-style client
 *
 * Generated from Postman Code — re-exports all API functions
 * grouped by resource namespace for ergonomic usage:
 *
 *   import { notion } from "./src/postman/notion-api/index.js";
 *
 *   const db = await notion.databases.retrieve(id, token);
 *   const results = await notion.databases.query(id, token);
 *   const page = await notion.pages.retrieve(id, token);
 *   const children = await notion.blocks.retrieveChildren(id, token);
 *   const hits = await notion.search(token);
 */

import { retrieveBlockChildren } from "./blocks/retrieve-block-children/client.js";
import { queryDatabase } from "./databases/query-database/client.js";
import { retrieveDatabase } from "./databases/retrieve-database/client.js";
import { retrievePage } from "./pages/retrieve-page/client.js";
import { search } from "./search/search/client.js";

export const notion = {
  blocks: {
    retrieveChildren: retrieveBlockChildren,
  },
  databases: {
    retrieve: retrieveDatabase,
    query: queryDatabase,
  },
  pages: {
    retrieve: retrievePage,
  },
  search,
} as const;

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
