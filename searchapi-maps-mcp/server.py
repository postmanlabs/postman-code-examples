import os

from fastmcp import FastMCP

from postman.google_maps_search_api.search.google_maps_search.client import (
    google_maps_search,
)
from postman.google_maps_place_api.search.google_maps_place_details.client import (
    google_maps_place_details,
)
from postman.google_maps_reviews_api.search.google_maps_reviews_search.client import (
    google_maps_reviews_search,
)
from postman.google_maps_photos_api.search.google_maps_photos_search.client import (
    google_maps_photos_search,
)
from postman.google_maps_directions_api.search.google_maps_directions_search.client import (
    google_maps_directions_search,
)
from postman.google_maps_search_api.shared.variables import variables

BASE_URL = variables["collection"]["baseUrl"]

mcp = FastMCP(
    "SearchApi Maps",
    instructions=(
        "A local maps toolkit powered by SearchApi. Search for places, get details, "
        "read reviews, view photos, and get directions — all through Google Maps data. "
        "Start with search_places to find locations, then use the place_id from results "
        "to drill into details, reviews, or photos. Use get_directions for routing."
    ),
)


def _get_api_key() -> str:
    key = os.environ.get("SEARCHAPI_API_KEY", "")
    if not key:
        raise ValueError(
            "SEARCHAPI_API_KEY environment variable is required. "
            "Get one at https://www.searchapi.io"
        )
    return key


@mcp.tool()
def search_places(
    query: str,
    coordinates: str | None = None,
    language: str = "en",
    country: str | None = None,
    page: int = 1,
) -> dict:
    """Search Google Maps for businesses, restaurants, landmarks, or any place.

    Use the place_id from results with get_place_details, get_place_reviews,
    or get_place_photos for more information about a specific place.

    Args:
        query: What to search for — e.g. "coffee shops", "hotels near Times Square".
        coordinates: GPS coordinates with zoom, e.g. "@40.7128,-74.0060,14z".
            Focuses results around this location.
        language: Results language (default "en").
        country: Country code to scope results (e.g. "us", "gb").
        page: Page number for pagination (default 1).
    """
    return google_maps_search(
        base_url=BASE_URL,
        api_key=_get_api_key(),
        q=query,
        ll=coordinates,
        hl=language,
        gl=country,
        page=page,
    )


@mcp.tool()
def get_place_details(
    place_id: str | None = None,
    data_id: str | None = None,
    language: str = "en",
) -> dict:
    """Get comprehensive details about a specific place on Google Maps.

    Returns address, phone, ratings, hours, amenities, popular times, pricing,
    and more. Provide either place_id or data_id from search_places results.

    Args:
        place_id: The place_id from search_places results.
        data_id: The data_id from search_places results.
        language: Results language (default "en").
    """
    return google_maps_place_details(
        base_url=BASE_URL,
        api_key=_get_api_key(),
        place_id=place_id,
        data_id=data_id,
        hl=language,
    )


@mcp.tool()
def get_place_reviews(
    place_id: str | None = None,
    data_id: str | None = None,
    language: str = "en",
    search_query: str | None = None,
    sort_by: str = "most_relevant",
    num: int = 10,
    next_page_token: str | None = None,
) -> dict:
    """Get user reviews and ratings for a place on Google Maps.

    Provide either place_id or data_id from search_places results.

    Args:
        place_id: The place_id from search_places results.
        data_id: The data_id from search_places results.
        language: Results language (default "en").
        search_query: Filter reviews by keyword (e.g. "parking", "food").
        sort_by: Sort order — "most_relevant", "newest", "highest_rating",
            or "lowest_rating".
        num: Number of reviews per page (default 10).
        next_page_token: Token from a previous response for pagination.
    """
    return google_maps_reviews_search(
        base_url=BASE_URL,
        api_key=_get_api_key(),
        place_id=place_id,
        data_id=data_id,
        hl=language,
        search_query=search_query,
        sort_by=sort_by,
        num=num,
        next_page_token=next_page_token,
    )


@mcp.tool()
def get_place_photos(
    place_id: str | None = None,
    data_id: str | None = None,
    language: str = "en",
    category_id: str | None = None,
    next_page_token: str | None = None,
) -> dict:
    """Get photos for a place on Google Maps.

    Returns photo URLs organized by category. Provide either place_id or
    data_id from search_places results.

    Args:
        place_id: The place_id from search_places results.
        data_id: The data_id from search_places results.
        language: Results language (default "en").
        category_id: Filter by photo category (from the categories in response).
        next_page_token: Token from a previous response for pagination.
    """
    return google_maps_photos_search(
        base_url=BASE_URL,
        api_key=_get_api_key(),
        place_id=place_id,
        data_id=data_id,
        hl=language,
        category_id=category_id,
        next_page_token=next_page_token,
    )


@mcp.tool()
def get_directions(
    from_location: str,
    to_location: str,
    travel_mode: str = "best",
    waypoints: str | None = None,
    avoid: str | None = None,
    distance_units: str = "automatic",
    language: str = "en",
    country: str = "us",
) -> dict:
    """Get directions between two locations via Google Maps.

    Returns routes with distances, durations, and turn-by-turn instructions.
    Supports driving, transit, walking, cycling, and flying.

    Args:
        from_location: Starting point — address, place name, or "lat,long".
        to_location: Destination — address, place name, or "lat,long".
        travel_mode: How to travel — "best", "driving", "transit", "walking",
            "cycling", or "flying" (default "best").
        waypoints: JSON array of intermediate stops (max 8),
            e.g. '["Times Square", "Central Park"]'.
        avoid: JSON array of features to avoid,
            e.g. '["tolls", "highways", "ferries"]'.
        distance_units: "automatic", "km", or "miles" (default "automatic").
        language: Results language (default "en").
        country: Country code (default "us").
    """
    return google_maps_directions_search(
        base_url=BASE_URL,
        api_key=_get_api_key(),
        from_location=from_location,
        to_location=to_location,
        travel_mode=travel_mode,
        waypoints=waypoints,
        avoid=avoid,
        distance_units=distance_units,
        gl=country,
        hl=language,
    )


if __name__ == "__main__":
    mcp.run()
