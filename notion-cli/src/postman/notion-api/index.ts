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
 *   const results = await notion.dataSources.query(dataSourceId);
 *   const page = await notion.pages.retrieve(id);
 *   const children = await notion.blocks.retrieveChildren(id);
 *   const hits = await notion.search();
 *
 * The bearer token and collection-level variables like the Notion API
 * version are provided at instantiation — callers only need to supply
 * resource IDs and optional request parameters.
 */

import { retrieveComments as _retrieveComments } from "./comments/retrieve-comments/client.js";
import { createComment as _createComment } from "./comments/create-comment/client.js";
import { retrieveComment as _retrieveComment } from "./comments/retrieve-comment/client.js";
import { retrieveBlock as _retrieveBlock } from "./blocks/retrieve-block/client.js";
import { retrieveBlockChildren as _retrieveBlockChildren } from "./blocks/retrieve-block-children/client.js";
import { appendBlockChildren as _appendBlockChildren } from "./blocks/append-block-children/client.js";
import { updateBlock as _updateBlock } from "./blocks/update-block/client.js";
import { deleteBlock as _deleteBlock } from "./blocks/delete-block/client.js";
import { queryDatabase as _queryDatabase } from "./databases/query-database/client.js";
import { retrieveDatabase as _retrieveDatabase } from "./databases/retrieve-database/client.js";
import { createDatabase as _createDatabase } from "./databases/create-database/client.js";
import { updateDatabase as _updateDatabase } from "./databases/update-database/client.js";
import { queryDataSource as _queryDataSource } from "./data-sources/query-data-source/client.js";
import { retrieveDataSource as _retrieveDataSource } from "./data-sources/retrieve-data-source/client.js";
import { updateDataSource as _updateDataSource } from "./data-sources/update-data-source/client.js";
import { createDataSource as _createDataSource } from "./data-sources/create-data-source/client.js";
import { listDataSourceTemplates as _listDataSourceTemplates } from "./data-sources/list-data-source-templates/client.js";
import { createPage as _createPage } from "./pages/create-page/client.js";
import { archivePage as _archivePage } from "./pages/archive-page/client.js";
import { updatePageProperties as _updatePageProperties } from "./pages/update-page-properties/client.js";
import { retrievePage as _retrievePage } from "./pages/retrieve-page/client.js";
import { retrievePageProperty as _retrievePageProperty } from "./pages/retrieve-page-property/client.js";
import { movePage as _movePage } from "./pages/move-page/client.js";
import { search as _search } from "./search/search/client.js";
import { retrieveBotUser as _retrieveBotUser } from "./users/retrieve-bot-user/client.js";
import { retrieveUser as _retrieveUser } from "./users/retrieve-user/client.js";
import { listUsers as _listUsers } from "./users/list-users/client.js";
import { createFileUpload as _createFileUpload } from "./file-uploads/create-file-upload/client.js";
import { sendFileUpload as _sendFileUpload } from "./file-uploads/send-file-upload/client.js";
import { completeFileUpload as _completeFileUpload } from "./file-uploads/complete-file-upload/client.js";
import { retrieveFileUpload as _retrieveFileUpload } from "./file-uploads/retrieve-file-upload/client.js";
import { listFileUploads as _listFileUploads } from "./file-uploads/list-file-uploads/client.js";
import { oauthToken as _oauthToken } from "./oauth/token/client.js";
import { oauthRevoke as _oauthRevoke } from "./oauth/revoke/client.js";
import { oauthIntrospect as _oauthIntrospect } from "./oauth/introspect/client.js";
import { variables } from "./shared/variables.js";

import type {
  NotionComment,
  RetrieveCommentsParams,
  RetrieveCommentsResponse,
  NotionBlock,
  RetrieveBlockChildrenParams,
  RetrieveBlockChildrenResponse,
  AppendBlockChildrenResponse,
  QueryDatabaseParams,
  QueryDatabaseResponse,
  QueryDataSourceParams,
  QueryDataSourceResponse,
  CreateDatabaseParams,
  UpdateDatabaseParams,
  CreateDataSourceParams,
  UpdateDataSourceParams,
  MovePageParams,
  ListUsersParams,
  ListUsersResponse,
  NotionDatabase,
  CreatePageParams,
  UpdatePageParams,
  NotionPage,
  NotionUser,
  PagePropertyItemResponse,
  SearchParams,
  SearchResponse,
} from "./shared/types.js";

import type { CreateCommentParams } from "./comments/create-comment/client.js";
import type { ListDataSourceTemplatesResponse, ListDataSourceTemplatesParams } from "./data-sources/list-data-source-templates/client.js";
import type { CreateFileUploadParams, FileUpload } from "./file-uploads/create-file-upload/client.js";
import type { ListFileUploadsParams, ListFileUploadsResponse } from "./file-uploads/list-file-uploads/client.js";
import type { OAuthTokenParams, OAuthTokenResponse } from "./oauth/token/client.js";
import type { OAuthIntrospectResponse } from "./oauth/introspect/client.js";

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
    comments: {
      list: (
        blockId: string,
        params?: RetrieveCommentsParams
      ): Promise<RetrieveCommentsResponse> =>
        _retrieveComments(blockId, bearerToken, NOTION_VERSION, params),
      retrieve: (commentId: string): Promise<NotionComment> =>
        _retrieveComment(commentId, bearerToken, NOTION_VERSION),
      create: (params: CreateCommentParams): Promise<NotionComment> =>
        _createComment(params, bearerToken, NOTION_VERSION),
    },
    blocks: {
      retrieve: (blockId: string): Promise<NotionBlock> =>
        _retrieveBlock(blockId, bearerToken, NOTION_VERSION),
      retrieveChildren: (
        blockId: string,
        params?: RetrieveBlockChildrenParams
      ): Promise<RetrieveBlockChildrenResponse> =>
        _retrieveBlockChildren(blockId, bearerToken, NOTION_VERSION, params),
      appendChildren: (
        blockId: string,
        children: unknown[]
      ): Promise<AppendBlockChildrenResponse> =>
        _appendBlockChildren(blockId, children, bearerToken, NOTION_VERSION),
      update: (
        blockId: string,
        params: Record<string, unknown>
      ): Promise<NotionBlock> =>
        _updateBlock(blockId, params, bearerToken, NOTION_VERSION),
      delete: (blockId: string): Promise<NotionBlock> =>
        _deleteBlock(blockId, bearerToken, NOTION_VERSION),
    },
    databases: {
      retrieve: (databaseId: string): Promise<NotionDatabase> =>
        _retrieveDatabase(databaseId, bearerToken, NOTION_VERSION),
      /** @deprecated Use dataSources.query() instead — database query is removed in API 2025-09-03 */
      query: (
        databaseId: string,
        params?: QueryDatabaseParams
      ): Promise<QueryDatabaseResponse> =>
        _queryDatabase(databaseId, bearerToken, NOTION_VERSION, params),
      create: (params: CreateDatabaseParams): Promise<NotionDatabase> =>
        _createDatabase(params, bearerToken, NOTION_VERSION),
      update: (
        databaseId: string,
        params: UpdateDatabaseParams
      ): Promise<NotionDatabase> =>
        _updateDatabase(databaseId, params, bearerToken, NOTION_VERSION),
    },
    dataSources: {
      retrieve: (dataSourceId: string): Promise<NotionDatabase> =>
        _retrieveDataSource(dataSourceId, bearerToken, NOTION_VERSION),
      query: (
        dataSourceId: string,
        params?: QueryDataSourceParams
      ): Promise<QueryDataSourceResponse> =>
        _queryDataSource(dataSourceId, bearerToken, NOTION_VERSION, params),
      create: (params: CreateDataSourceParams): Promise<NotionDatabase> =>
        _createDataSource(params, bearerToken, NOTION_VERSION),
      update: (
        dataSourceId: string,
        params: UpdateDataSourceParams
      ): Promise<NotionDatabase> =>
        _updateDataSource(dataSourceId, params, bearerToken, NOTION_VERSION),
      listTemplates: (dataSourceId: string, params?: ListDataSourceTemplatesParams): Promise<ListDataSourceTemplatesResponse> =>
        _listDataSourceTemplates(dataSourceId, bearerToken, NOTION_VERSION, params),
    },
    pages: {
      create: (params: CreatePageParams): Promise<NotionPage> =>
        _createPage(params, bearerToken, NOTION_VERSION),
      update: (pageId: string, params: UpdatePageParams): Promise<NotionPage> =>
        _updatePageProperties(pageId, params, bearerToken, NOTION_VERSION),
      archive: (pageId: string): Promise<NotionPage> =>
        _archivePage(pageId, bearerToken, NOTION_VERSION),
      retrieve: (pageId: string): Promise<NotionPage> =>
        _retrievePage(pageId, bearerToken, NOTION_VERSION),
      retrieveProperty: (
        pageId: string,
        propertyId: string,
        params?: { start_cursor?: string; page_size?: number }
      ): Promise<PagePropertyItemResponse> =>
        _retrievePageProperty(pageId, propertyId, bearerToken, NOTION_VERSION, params),
      move: (pageId: string, params: MovePageParams): Promise<NotionPage> =>
        _movePage(pageId, params, bearerToken, NOTION_VERSION),
    },
    search: (params?: SearchParams): Promise<SearchResponse> =>
      _search(bearerToken, NOTION_VERSION, params),
    users: {
      me: (): Promise<NotionUser> =>
        _retrieveBotUser(bearerToken, NOTION_VERSION),
      retrieve: (userId: string): Promise<NotionUser> =>
        _retrieveUser(userId, bearerToken, NOTION_VERSION),
      list: (params?: ListUsersParams): Promise<ListUsersResponse> =>
        _listUsers(bearerToken, NOTION_VERSION, params),
    },
    fileUploads: {
      create: (params: CreateFileUploadParams): Promise<FileUpload> =>
        _createFileUpload(params, bearerToken, NOTION_VERSION),
      send: (fileUploadId: string, file: Blob, filename: string, partNumber?: number): Promise<FileUpload> =>
        _sendFileUpload(fileUploadId, file, filename, bearerToken, NOTION_VERSION, partNumber),
      complete: (fileUploadId: string): Promise<FileUpload> =>
        _completeFileUpload(fileUploadId, bearerToken, NOTION_VERSION),
      retrieve: (fileUploadId: string): Promise<FileUpload> =>
        _retrieveFileUpload(fileUploadId, bearerToken, NOTION_VERSION),
      list: (params?: ListFileUploadsParams): Promise<ListFileUploadsResponse> =>
        _listFileUploads(bearerToken, NOTION_VERSION, params),
    },
    oauth: {
      token: (params: OAuthTokenParams, clientId: string, clientSecret: string): Promise<OAuthTokenResponse> =>
        _oauthToken(params, clientId, clientSecret),
      revoke: (token: string, clientId: string, clientSecret: string): Promise<void> =>
        _oauthRevoke(token, clientId, clientSecret),
      introspect: (token: string, clientId: string, clientSecret: string): Promise<OAuthIntrospectResponse> =>
        _oauthIntrospect(token, clientId, clientSecret),
    },
  } as const;
}

// Re-export all types for convenient access
export type {
  // Core objects
  NotionPage,
  NotionBlock,
  NotionDatabase,
  NotionUser,
  NotionComment,
  NotionError,
  // Building blocks
  UserReference,
  PageParent,
  RichTextAnnotations,
  RichTextItem,
  PropertyValue,
  DatabasePropertySchema,
  DatabaseParent,
  DataSourceReference,
  // Page params/responses
  CreatePageParams,
  UpdatePageParams,
  MovePageParams,
  PagePropertyItemResponse,
  // Database params
  CreateDatabaseParams,
  UpdateDatabaseParams,
  // Data source params
  QueryDataSourceParams,
  QueryDataSourceResponse,
  CreateDataSourceParams,
  UpdateDataSourceParams,
  // Block responses
  AppendBlockChildrenResponse,
  // Request params
  RetrieveCommentsParams,
  RetrieveBlockChildrenParams,
  QueryDatabaseParams,
  ListUsersParams,
  SearchParams,
  SearchFilter,
  SearchSort,
  // Response types
  RetrieveCommentsResponse,
  RetrieveBlockChildrenResponse,
  QueryDatabaseResponse,
  ListUsersResponse,
  SearchResponse,
} from "./shared/types.js";

// Re-export file upload types
export type {
  CreateFileUploadParams,
  FileUpload,
} from "./file-uploads/create-file-upload/client.js";
export type {
  ListFileUploadsParams,
  ListFileUploadsResponse,
} from "./file-uploads/list-file-uploads/client.js";
export type { ListDataSourceTemplatesResponse, ListDataSourceTemplatesParams, DataSourceTemplate } from "./data-sources/list-data-source-templates/client.js";

// Re-export OAuth types
export type {
  OAuthTokenParams,
  OAuthTokenResponse,
} from "./oauth/token/client.js";
export type { OAuthIntrospectResponse } from "./oauth/introspect/client.js";

// Re-export comment types
export type { CreateCommentParams } from "./comments/create-comment/client.js";

// Re-export collection variables
export { variables } from "./shared/variables.js";
