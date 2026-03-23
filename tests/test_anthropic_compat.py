import json
import unittest

import httpx

from app.llm.anthropic_compat import build_anthropic_headers, post_anthropic_compatible


def make_response(status_code: int, payload: dict | None = None) -> httpx.Response:
    content = json.dumps(payload or {})
    request = httpx.Request("POST", "https://example.com/v1/messages")
    return httpx.Response(status_code=status_code, content=content, request=request)


class AnthropicCompatTest(unittest.TestCase):
    def test_build_anthropic_headers_supports_both_strategies(self):
        self.assertEqual(
            build_anthropic_headers("secret", "x-api-key"),
            {
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01",
                "x-api-key": "secret",
            },
        )
        self.assertEqual(
            build_anthropic_headers("secret", "authorization-bearer"),
            {
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01",
                "Authorization": "Bearer secret",
            },
        )

    def test_post_anthropic_compatible_retries_with_authorization_header_on_auth_error(self):
        calls: list[dict[str, str]] = []
        responses = iter(
            [
                make_response(
                    401,
                    {
                        "type": "error",
                        "error": {
                            "type": "authentication_error",
                            "message": "Please carry the API secret key in the Authorization field.",
                        },
                    },
                ),
                make_response(
                    200,
                    {
                        "content": [{"type": "text", "text": "ok"}],
                    },
                ),
            ]
        )

        def fake_post(url, headers, json, timeout):
            calls.append(headers)
            return next(responses)

        response = post_anthropic_compatible(
            url="https://example.com/v1/messages",
            api_key="secret",
            json_body={"model": "test", "messages": []},
            timeout=10.0,
            post=fake_post,
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(calls[0]["x-api-key"], "secret")
        self.assertEqual(calls[1]["Authorization"], "Bearer secret")

    def test_post_anthropic_compatible_does_not_retry_non_auth_errors(self):
        calls: list[dict[str, str]] = []

        def fake_post(url, headers, json, timeout):
            calls.append(headers)
            return make_response(429, {"error": {"message": "rate limited"}})

        with self.assertRaises(httpx.HTTPStatusError):
            post_anthropic_compatible(
                url="https://example.com/v1/messages",
                api_key="secret",
                json_body={"model": "test", "messages": []},
                timeout=10.0,
                post=fake_post,
            )

        self.assertEqual(len(calls), 1)


if __name__ == "__main__":
    unittest.main()
