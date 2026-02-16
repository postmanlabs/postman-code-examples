/**
 * datasource command group
 *   datasource get <id>            — retrieve a data source
 *   datasource query <id>          — query entries from a data source
 *   datasource templates <id>      — list available templates
 *   datasource create <database-id> — create a data source in a database
 *   datasource update <id>         — update title, schema, or properties
 */

import { Command } from "commander";
import { createNotionClient, type DatabasePropertySchema } from "../src/postman/notion-api/index.js";
import { getBearerToken, getPageTitle, formatDate, formatPropertyValue } from "../helpers.js";

// -- datasource get -----------------------------------------------------------

const datasourceGetCommand = new Command("get")
  .description("Retrieve a data source by ID")
  .argument("<datasource-id>", "data source ID")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .addHelpText(
    "after",
    `
Details:
  Retrieves a single data source and displays its metadata, parent
  database, and property schema.

  Data source IDs can be found in the output of "database get".

Examples:
  $ notion-cli datasource get <datasource-id>
  $ notion-cli datasource get <datasource-id> --raw
`,
  )
  .action(async (datasourceId: string, options: { raw?: boolean }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    try {
      const ds = await notion.dataSources.retrieve(datasourceId);

      if (options.raw) {
        console.log(JSON.stringify(ds, null, 2));
        return;
      }

      const title = ds.title?.map((t) => t.plain_text).join("") || "(Untitled)";

      console.log(`Title: ${title}`);
      console.log(`ID: ${ds.id}`);

      // Data sources return a parent object — display it generically
      const parent = ds.parent as unknown as Record<string, unknown>;
      if (parent) {
        if (parent.type === "database_id") {
          console.log(`Parent database: ${parent.database_id}`);
        } else if (parent.type === "page_id") {
          console.log(`Parent page: ${parent.page_id}`);
        }
      }

      console.log(`Created: ${formatDate(ds.created_time)}`);
      console.log(`Last edited: ${formatDate(ds.last_edited_time)}`);
      if (ds.archived !== undefined) {
        console.log(`Archived: ${ds.archived}`);
      }
      if (ds.in_trash) {
        console.log(`In trash: ${ds.in_trash}`);
      }

      const propEntries = Object.entries(ds.properties || {});
      if (propEntries.length > 0) {
        console.log(`\nSchema (${propEntries.length} properties):`);
        for (const [name, prop] of propEntries) {
          const schema = prop as DatabasePropertySchema;
          console.log(`  ${name}: ${schema.type}`);
        }
      }

      console.log(`\nTo query entries: notion-cli datasource query ${datasourceId}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- datasource query ---------------------------------------------------------

const datasourceQueryCommand = new Command("query")
  .description("Query entries from a data source")
  .argument("<datasource-id>", "data source ID")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .option("-n, --limit <number>", "max entries to return, 1-100", "20")
  .option("-c, --cursor <cursor>", "pagination cursor from a previous query")
  .addHelpText(
    "after",
    `
Details:
  Queries entries (pages) from a data source, with pagination.

  Each entry is a Notion page. To read an entry's full content,
  use "page get <entry-id>".

  Data source IDs can be found in the output of "database get".

Examples:
  $ notion-cli datasource query <datasource-id>
  $ notion-cli datasource query <datasource-id> --limit 50
  $ notion-cli datasource query <datasource-id> --raw
`,
  )
  .action(async (datasourceId: string, options: { raw?: boolean; limit: string; cursor?: string }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);
    const pageSize = Math.min(parseInt(options.limit, 10) || 20, 100);

    try {
      const response = await notion.dataSources.query(datasourceId, {
        page_size: pageSize,
        start_cursor: options.cursor,
      });

      if (options.raw) {
        console.log(JSON.stringify(response, null, 2));
        return;
      }

      if (response.results.length === 0) {
        console.log("No entries found.");
        return;
      }

      console.log(`Entries (${response.results.length}${response.has_more ? "+" : ""}):\n`);
      console.log("─".repeat(60));

      for (const page of response.results) {
        const pageTitle = getPageTitle(page);
        const lastEdited = formatDate(page.last_edited_time);

        console.log(`  📄 ${pageTitle}`);
        console.log(`     ID: ${page.id}`);
        console.log(`     Last edited: ${lastEdited}`);
        console.log(`     URL: ${page.url}`);

        for (const [name, prop] of Object.entries(page.properties)) {
          if (prop.type === "title") continue;
          const value = formatPropertyValue(prop);
          console.log(`     ${name}: ${value}`);
        }

        console.log();
      }

      console.log("─".repeat(60));

      if (response.has_more && response.next_cursor) {
        console.log(`\n📑 More entries available. Next page:`);
        console.log(`   notion-cli datasource query ${datasourceId} --cursor ${response.next_cursor}`);
      }

      console.log(`\nTo read an entry: notion-cli page get <entry-id>`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- datasource templates -----------------------------------------------------

const datasourceTemplatesCommand = new Command("templates")
  .description("List available page templates for a data source")
  .argument("<datasource-id>", "data source ID")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .option("-c, --cursor <cursor>", "pagination cursor from a previous request")
  .option("-n, --limit <number>", "max results per page, 1-100")
  .addHelpText(
    "after",
    `
Details:
  Lists page templates available for the data source. Templates are
  pages that serve as blueprints for new entries.

Examples:
  $ notion-cli datasource templates <datasource-id>
  $ notion-cli datasource templates <datasource-id> --raw
`,
  )
  .action(async (datasourceId: string, options: { raw?: boolean; cursor?: string; limit?: string }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    try {
      const response = await notion.dataSources.listTemplates(datasourceId, {
        start_cursor: options.cursor,
        page_size: options.limit ? Math.min(parseInt(options.limit, 10) || 100, 100) : undefined,
      });

      if (options.raw) {
        console.log(JSON.stringify(response, null, 2));
        return;
      }

      if (response.templates.length === 0) {
        console.log("No templates found.");
        return;
      }

      console.log(`Found ${response.templates.length} template(s):\n`);

      for (const template of response.templates) {
        console.log(`  📋 ${template.name || "(unnamed)"}`);
        console.log(`     ID: ${template.id}`);
        if (template.is_default) {
          console.log(`     Default: yes`);
        }
        console.log();
      }

      if (response.has_more && response.next_cursor) {
        console.log(`📑 More templates available. Use --cursor to get next page:`);
        console.log(`   notion-cli datasource templates ${datasourceId} --cursor ${response.next_cursor}`);
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- datasource create --------------------------------------------------------

const datasourceCreateCommand = new Command("create")
  .description("Create a data source in a database")
  .argument("<database-id>", "the ID of the parent database")
  .option("-t, --title <title>", "data source title")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .addHelpText(
    "after",
    `
Details:
  Creates a new data source in the specified database.

  Use "datasource templates" to see available templates first.

Examples:
  $ notion-cli datasource create <database-id> --title "Q1 Data"
  $ notion-cli datasource create <database-id> --title "Q1 Data" --raw
`,
  )
  .action(async (databaseId: string, options: { title?: string; raw?: boolean }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    try {
      const ds = await notion.dataSources.create({
        parent: { type: "database_id", database_id: databaseId },
        title: options.title ? [{ text: { content: options.title } }] : undefined,
        properties: {},
      });

      if (options.raw) {
        console.log(JSON.stringify(ds, null, 2));
        return;
      }

      const title = ds.title?.map((t) => t.plain_text).join("") || "(Untitled)";
      console.log(`Data source created.`);
      console.log(`  Title: ${title}`);
      console.log(`  ID: ${ds.id}`);
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- datasource update --------------------------------------------------------

/** Property types that can be added via --add-property */
const VALID_PROPERTY_TYPES = [
  "rich_text", "number", "select", "multi_select", "date",
  "checkbox", "url", "email", "phone_number", "status",
  "people", "files", "created_time", "created_by",
  "last_edited_time", "last_edited_by",
];

/**
 * Parse a "Name:type" string into a Notion property schema object.
 * For select/multi_select, accepts "Name:select:Option1,Option2,..." to pre-populate options.
 */
function parsePropertySpec(spec: string): { name: string; schema: Record<string, unknown> } {
  const parts = spec.split(":");
  if (parts.length < 2) {
    console.error(`Error: invalid property format "${spec}". Expected "Name:type" (e.g. "Artist:rich_text").`);
    process.exit(1);
  }

  const name = parts[0].trim();
  const type = parts[1].trim().toLowerCase();

  if (!name) {
    console.error(`Error: property name cannot be empty in "${spec}".`);
    process.exit(1);
  }

  if (!VALID_PROPERTY_TYPES.includes(type)) {
    console.error(`Error: unknown property type "${type}" in "${spec}".`);
    console.error(`Valid types: ${VALID_PROPERTY_TYPES.join(", ")}`);
    process.exit(1);
  }

  // For select/multi_select, support optional options after a third colon
  if ((type === "select" || type === "multi_select") && parts.length >= 3) {
    const optionNames = parts.slice(2).join(":").split(",").map((o) => o.trim()).filter(Boolean);
    if (optionNames.length > 0) {
      return {
        name,
        schema: { [type]: { options: optionNames.map((o) => ({ name: o })) } },
      };
    }
  }

  return { name, schema: { [type]: {} } };
}

const datasourceUpdateCommand = new Command("update")
  .description("Update a data source's title, schema, or properties")
  .argument("<datasource-id>", "the ID of the data source to update")
  .option("-t, --title <title>", "set a new title")
  .option("-p, --add-property <spec...>", 'add properties — format: "Name:type" (repeatable)')
  .option("--remove-property <name...>", "remove properties by name (repeatable)")
  .option("-r, --raw", "output raw JSON instead of formatted text")
  .addHelpText(
    "after",
    `
Details:
  Updates a data source's title and/or schema properties.
  Only the specified fields are updated; others remain unchanged.

  --add-property accepts "Name:type" where type is one of:
    rich_text, number, select, multi_select, date, checkbox,
    url, email, phone_number, status, people, files,
    created_time, created_by, last_edited_time, last_edited_by

  For select/multi_select, pre-populate options with "Name:select:Opt1,Opt2":
    --add-property "Genre:select:Lo-fi,Shoegaze,Post-rock"

  --remove-property removes a column by name (sets it to null).

Examples:
  $ notion-cli datasource update <id> --title "New Title"
  $ notion-cli datasource update <id> -p "Artist:rich_text" -p "Year:number"
  $ notion-cli datasource update <id> -p "Genre:select:Rock,Pop,Jazz"
  $ notion-cli datasource update <id> --remove-property "Old Column"
`,
  )
  .action(async (datasourceId: string, options: {
    title?: string;
    addProperty?: string[];
    removeProperty?: string[];
    raw?: boolean;
  }) => {
    const bearerToken = getBearerToken();
    const notion = createNotionClient(bearerToken);

    const params: Record<string, unknown> = {};
    if (options.title) {
      params.title = [{ text: { content: options.title } }];
    }

    // Build properties object from --add-property and --remove-property
    const properties: Record<string, unknown> = {};
    if (options.addProperty) {
      for (const spec of options.addProperty) {
        const { name, schema } = parsePropertySpec(spec);
        properties[name] = schema;
      }
    }
    if (options.removeProperty) {
      for (const name of options.removeProperty) {
        properties[name] = null;
      }
    }
    if (Object.keys(properties).length > 0) {
      params.properties = properties;
    }

    if (Object.keys(params).length === 0) {
      console.error("Error: nothing to update. Use --title, --add-property, or --remove-property.");
      process.exit(1);
    }

    try {
      const ds = await notion.dataSources.update(datasourceId, params);

      if (options.raw) {
        console.log(JSON.stringify(ds, null, 2));
        return;
      }

      const title = ds.title?.map((t) => t.plain_text).join("") || "(Untitled)";
      console.log(`Data source updated.`);
      console.log(`  Title: ${title}`);
      console.log(`  ID: ${ds.id}`);

      // Show updated schema summary
      const propEntries = Object.entries(ds.properties || {});
      if (propEntries.length > 0) {
        console.log(`  Schema (${propEntries.length} properties):`);
        for (const [pName, prop] of propEntries) {
          const schema = prop as DatabasePropertySchema;
          console.log(`    ${pName}: ${schema.type}`);
        }
      }
    } catch (error) {
      console.error(`Error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  });

// -- datasource command group -------------------------------------------------

export const datasourceCommand = new Command("datasource")
  .description("Work with data sources directly")
  .addCommand(datasourceGetCommand)
  .addCommand(datasourceQueryCommand)
  .addCommand(datasourceTemplatesCommand)
  .addCommand(datasourceCreateCommand)
  .addCommand(datasourceUpdateCommand);
