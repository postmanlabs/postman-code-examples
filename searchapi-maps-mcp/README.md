# SearchApi Maps MCP Server

An MCP server that gives AI coding agents access to Google Maps data via [SearchApi](https://www.searchapi.io). Built with [FastMCP](https://gofastmcp.com) and [Postman Code](https://www.postman.com/explore/code).

Search for places, get details, read reviews, view photos, and get directions — all through Google Maps data.

## Getting started

### Prerequisites

- A SearchApi API key — get one at [searchapi.io](https://www.searchapi.io)
- [uv](https://docs.astral.sh/uv/getting-started/installation/) for dependency management:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

That's it — `uv` handles the virtual environment and dependencies automatically.

### Add to your MCP client

Add it to your MCP client config (e.g. Claude Desktop, Cursor). Replace `/path/to` with the actual path to this directory:

```json
{
  "mcpServers": {
    "searchapi-maps": {
      "command": "uv",
      "args": [
        "run",
        "--project", "/path/to/searchapi-maps-mcp",
        "python", "/path/to/searchapi-maps-mcp/server.py"
      ],
      "env": {
        "SEARCHAPI_API_KEY": "your_key"
      }
    }
  }
}
```

Or run it directly from the terminal:

```bash
cd searchapi-maps-mcp
SEARCHAPI_API_KEY=your_key uv run python server.py
```

## Tools

| Tool | Description |
|------|-------------|
| `search_places` | Search Google Maps for businesses, restaurants, landmarks, or any place |
| `get_place_details` | Get detailed info about a place — hours, ratings, amenities, popular times |
| `get_place_reviews` | Get user reviews and ratings, with filtering and sorting |
| `get_place_photos` | Get photos for a place, organized by category |
| `get_directions` | Get directions between locations with multiple travel modes |

The tools are connected: `search_places` returns `place_id` values that feed into the other tools.

### Example prompts

**Single tool**

- "Find vegan restaurants in Brooklyn"
- "Get the hours and rating for the MoMA"
- "How do I get from LAX to Santa Monica by transit?"

**Multi-tool (search + drill down)**

- "Find the best-rated ramen spot near Shibuya and show me their reviews" — `search_places` to find ramen restaurants, then `get_place_reviews` on the top-rated result.
- "I'm looking for a coworking space in Lisbon — find some options, show me photos of the top 3, and tell me which one has the best reviews" — `search_places` for coworking spaces, `get_place_photos` and `get_place_reviews` on each of the top 3, then compare.
- "Find coffee shops near the Eiffel Tower that are open now and give me walking directions from the tower to the closest one" — `search_places` for coffee shops, filter by open status, then `get_directions` with walking mode.
- "I need a hotel in downtown Chicago — find options, get detailed info on the top 3, compare their review scores, and show me directions from O'Hare to the best one" — chains all five tools: `search_places` → `get_place_details` × 3 → `get_place_reviews` × 3 → `get_directions`.
- "Plan a food tour in Mexico City — find the best taco spots, the best mole restaurant, and a mezcal bar, then give me walking directions between all three" — multiple `search_places` calls for different cuisines, then `get_directions` with waypoints.

## How it was built

This project was built by a human and an AI coding agent working together. The human came in with a general idea — "let's build an MCP server using SearchApi" — and the agent used [Postman Code](https://www.postman.com/explore/code) to figure out the rest.

**Discovery.** The agent searched Postman's API Network for SearchApi and found their [official workspace](https://go.postman.co/workspace/5c2599ec-ce0a-46d1-a4e7-2c7e1c73a507) with 82 collections covering search engines, shopping, maps, travel, social media, and more. Together we narrowed it down to "local/maps toolkit" and identified 5 collections that work as a connected set — linked by `place_id` so results from search flow naturally into details, reviews, photos, and directions. A sixth collection (Google Place API) was considered but dropped because it uses Knowledge Graph IDs instead of Maps IDs, so it doesn't connect to the others.

**Code generation.** For each of the 5 collections, the agent fetched the full request context via `postman-code request context` and generated a typed Python client. Each client faithfully represents its Postman request — parameters, auth, URL construction — without adding business logic. Response models (`TypedDict` classes) were derived from the saved response examples in each collection, and error handling maps the documented status codes (400, 401, 429, 500, 503) to specific exception types.

**Server layer.** `server.py` wraps the generated clients as MCP tools using [FastMCP](https://gofastmcp.com). The tool names and descriptions were designed for agent usability — `search_places`, `get_place_details`, etc. — with docstrings that explain how tools connect to each other ("use the `place_id` from `search_places` results").

### Source collections

- [Google Maps Search API](https://go.postman.co/collection/45090949-36a5cde4-8b66-450f-b3d5-d28cfb535b56) — search for places
- [Google Maps Place API](https://go.postman.co/collection/45090949-0fe19c7c-d780-47f7-9aa9-b9657be38fa9) — place details
- [Google Maps Reviews API](https://go.postman.co/collection/45090949-3caef9d4-da80-440f-a797-797da2899bd5) — user reviews
- [Google Maps Photos API](https://go.postman.co/collection/45090949-d1f6b805-2641-4ef3-bad7-6877b3f16348) — place photos
- [Google Maps Directions API](https://go.postman.co/collection/45090949-c8e76bd2-c6bf-4a5a-92a5-44da51c77e93) — routing and directions

## License

[MIT](LICENSE)
