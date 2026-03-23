import json
import unittest
from unittest.mock import patch

import httpx

from app.llm.openai_llm import AnthropicLLM
from app.models.transcript import TranscriptSegment


def make_response(status_code: int, payload: dict) -> httpx.Response:
    request = httpx.Request("POST", "https://example.com/v1/messages")
    return httpx.Response(status_code=status_code, content=json.dumps(payload), request=request)


class AnthropicLLMTest(unittest.TestCase):
    def test_summarize_retries_with_authorization_header(self):
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
                        "content": [{"type": "text", "text": "summary ok"}],
                    },
                ),
            ]
        )

        def fake_post(url, headers, json, timeout):
            calls.append(headers)
            return next(responses)

        llm = AnthropicLLM(api_key="secret", base_url="https://example.com/anthropic", model="test-model")
        with patch("app.llm.anthropic_compat.httpx.post", side_effect=fake_post):
            summary = llm.summarize(
                title="Demo",
                segments=[TranscriptSegment(start=0.0, end=1.0, text="hello world")],
                output_language="en",
            )

        self.assertEqual(summary, "summary ok")
        self.assertEqual(calls[0]["x-api-key"], "secret")
        self.assertEqual(calls[1]["Authorization"], "Bearer secret")


if __name__ == "__main__":
    unittest.main()
