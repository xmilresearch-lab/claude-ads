"""Section 9 — OpenAPI SDK codegen hints.

Patches the generated schema after all routers are registered with:
  - x-mutation: true on all POST/PUT/PATCH/DELETE operations
  - x-paginated: true on endpoints returning PaginatedResponse
  - x-rate-limit: the effective rate limit string for each operation
  - info.x-api-conventions: shared API conventions for SDK generators
"""

from fastapi import FastAPI

_MUTATING_METHODS = frozenset({"post", "put", "patch", "delete"})

_PAGINATED_PATH_FRAGMENTS = frozenset({
    "/automations/",          # GET / list
    "/content/queue",
    "/integrations",          # GET / list
    "/audit/logs",
    "/analytics/automations",
})

_RATE_LIMIT_OVERRIDES: dict[str, str] = {
    "/api/v1/auth": "10/minute",
    "/automations/{automation_id}/run": "30/minute",
    "/webhooks/": "200/minute",
    "/analytics/export": "10/hour",
}

_DEFAULT_LIMITS = {
    "get": "300/minute",
    "post": "60/minute",
    "put": "60/minute",
    "patch": "60/minute",
    "delete": "60/minute",
}


def add_openapi_extras(app: FastAPI) -> None:
    schema = app.openapi()

    for path, path_item in schema.get("paths", {}).items():
        for method, operation in path_item.items():
            if not isinstance(operation, dict):
                continue

            # x-mutation
            if method in _MUTATING_METHODS:
                operation["x-mutation"] = True

            # x-paginated
            if method == "get" and any(frag in path for frag in _PAGINATED_PATH_FRAGMENTS):
                operation["x-paginated"] = True

            # x-rate-limit
            rate_limit = _DEFAULT_LIMITS.get(method, "60/minute")
            for pattern, limit in _RATE_LIMIT_OVERRIDES.items():
                if pattern in path:
                    rate_limit = limit
                    break
            operation["x-rate-limit"] = rate_limit

    schema["info"]["x-api-conventions"] = {
        "pagination": "offset-based via limit/offset query params",
        "dates": "ISO 8601 UTC",
        "ids": "UUID v4 strings",
        "envelope": "all responses wrapped in {data, meta}",
        "errors": "all errors wrapped in {errors: [{code, message, field}], meta}",
        "auth": "Bearer token in Authorization header",
    }

    app.openapi_schema = schema
