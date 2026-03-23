from collections.abc import Callable
from typing import Any

import httpx

AnthropicPost = Callable[..., httpx.Response]

_AUTH_STRATEGIES = ("x-api-key", "authorization-bearer")
_AUTH_ERROR_HINTS = (
    "authorization",
    "x-api-key",
    "api key",
    "api_key",
    "authentication",
    "unauthorized",
    "invalid api key",
    "login fail",
    "secret key",
    "access token",
)


def build_anthropic_headers(api_key: str, strategy: str) -> dict[str, str]:
    headers = {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
    }
    if strategy == "x-api-key":
        headers["x-api-key"] = api_key
        return headers
    if strategy == "authorization-bearer":
        headers["Authorization"] = f"Bearer {api_key}"
        return headers
    raise ValueError(f"Unsupported Anthropic auth strategy: {strategy}")


def is_auth_failure_response(response: httpx.Response) -> bool:
    if response.status_code in {401, 403, 407}:
        return True
    body = (response.text or "").lower()
    return any(hint in body for hint in _AUTH_ERROR_HINTS)


def post_anthropic_compatible(
    *,
    url: str,
    api_key: str,
    json_body: dict[str, Any],
    timeout: float,
    post: AnthropicPost | None = None,
) -> httpx.Response:
    request_post = post or httpx.post
    last_exc: httpx.HTTPStatusError | None = None

    for index, strategy in enumerate(_AUTH_STRATEGIES):
        response = request_post(
            url,
            headers=build_anthropic_headers(api_key, strategy),
            json=json_body,
            timeout=timeout,
        )
        try:
            response.raise_for_status()
            return response
        except httpx.HTTPStatusError as exc:
            last_exc = exc
            has_more_strategies = index < len(_AUTH_STRATEGIES) - 1
            if not has_more_strategies or not is_auth_failure_response(exc.response):
                raise

    if last_exc:
        raise last_exc
    raise RuntimeError("Anthropic-compatible request failed before a response was returned")
