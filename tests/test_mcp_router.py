import json
import unittest
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import mcp


class MCPRouterTest(unittest.TestCase):
    def setUp(self):
        self.app = FastAPI()
        self.app.include_router(mcp.router)
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()

    def test_get_mcp_info(self):
        response = self.client.get("/mcp")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["endpoint"], "/mcp")

    def test_initialize_returns_tool_capability(self):
        response = self.client.post(
            "/mcp",
            json={"jsonrpc": "2.0", "id": "1", "method": "initialize", "params": {}},
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["result"]["serverInfo"]["name"], "vinote")
        self.assertIn("tools", payload["result"]["capabilities"])

    def test_tools_call_accepts_json_encoded_arguments(self):
        fake_result = {
            "success": True,
            "task_id": "task-1",
            "title": "Demo",
            "duration": 12.3,
            "platform": "youtube",
            "video_id": "video-1",
            "summary_mode": "default",
            "markdown": "# Demo",
            "output_path": "/tmp/task-1",
        }

        with patch.object(mcp.mcp_server, "generate_note", return_value=fake_result) as mock_generate:
            response = self.client.post(
                "/mcp",
                json={
                    "jsonrpc": "2.0",
                    "id": "2",
                    "method": "tools/call",
                    "params": {
                        "name": "generate_video_note",
                        "arguments": json.dumps({"video_url": "https://example.com/video"}),
                    },
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(mock_generate.call_count, 1)
        payload = response.json()
        content = payload["result"]["content"][0]["text"]
        self.assertEqual(json.loads(content)["task_id"], "task-1")

    def test_invalid_json_returns_400(self):
        response = self.client.post(
            "/mcp",
            data="{invalid",
            headers={"content-type": "application/json"},
        )

        self.assertEqual(response.status_code, 400)


if __name__ == "__main__":
    unittest.main()
