"""
VINote MCP server.
"""
import json
import sys
import uuid
from pathlib import Path
from typing import List

sys.path.insert(0, str(Path(__file__).parent))

from app.llm.prompts import STYLE_MAP, SUMMARY_MODE_MAP
from app.services.note_service import NoteService


class VINoteMCP:
    def __init__(self):
        self.note_service = NoteService()

    def list_tools(self) -> List[dict]:
        return [
            {
                "name": "generate_video_note",
                "description": "Generate a Markdown note from a video URL.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "video_url": {
                            "type": "string",
                            "description": "Video URL, for example https://www.bilibili.com/video/BV1xxx",
                        },
                        "style": {
                            "type": "string",
                            "description": "Note style.",
                            "default": "detailed",
                        },
                        "summary_mode": {
                            "type": "string",
                            "description": "Summarization strategy.",
                            "enum": ["default", "accurate", "oneshot"],
                            "default": "default",
                        },
                        "extras": {
                            "type": "string",
                            "description": "Extra note-generation instructions.",
                        },
                        "output_language": {
                            "type": "string",
                            "description": "Output note language.",
                            "enum": ["zh-CN", "en"],
                        },
                    },
                    "required": ["video_url"],
                },
            },
            {
                "name": "list_note_styles",
                "description": "List supported note styles.",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                },
            },
        ]

    def generate_note(
        self,
        video_url: str,
        style: str = "detailed",
        summary_mode: str = "default",
        extras: str | None = None,
        output_language: str | None = None,
    ) -> dict:
        if not video_url:
            return {"success": False, "error": "Missing required argument: video_url"}

        try:
            task_id = str(uuid.uuid4())
            result = self.note_service.generate(
                video_url=video_url,
                task_id=task_id,
                style=style,
                summary_mode=summary_mode,
                extras=extras,
                output_language=output_language,
            )
            return {
                "success": True,
                "task_id": task_id,
                "title": result.audio_meta.title,
                "duration": result.audio_meta.duration,
                "platform": result.audio_meta.platform,
                "video_id": result.audio_meta.video_id,
                "summary_mode": result.summary_mode,
                "markdown": result.markdown,
                "output_path": result.output_dir,
            }
        except Exception as exc:
            print(f"[MCP] generate_note failed: {exc}", file=sys.stderr)
            return {"success": False, "error": str(exc)}

    def list_styles(self) -> dict:
        styles = [{"value": key, "description": value} for key, value in STYLE_MAP.items()]
        summary_modes = [
            {"value": key, "description": descriptions["en"]}
            for key, descriptions in SUMMARY_MODE_MAP.items()
        ]
        return {"styles": styles, "summary_modes": summary_modes}


SERVER = VINoteMCP()


def handle_jsonrpc(request: dict) -> dict:
    method = request.get("method")
    request_id = request.get("id")

    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {"tools": SERVER.list_tools()},
        }

    if method == "tools/call":
        tool_name = request.get("params", {}).get("name")
        arguments = request.get("params", {}).get("arguments", {})

        if tool_name == "generate_video_note":
            result = SERVER.generate_note(
                video_url=arguments.get("video_url"),
                style=arguments.get("style", "detailed"),
                summary_mode=arguments.get("summary_mode", "default"),
                extras=arguments.get("extras"),
                output_language=arguments.get("output_language"),
            )
        elif tool_name == "list_note_styles":
            result = SERVER.list_styles()
        else:
            result = {"error": f"Unknown tool: {tool_name}"}

        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "content": [{"type": "text", "text": json.dumps(result, ensure_ascii=False)}]
            },
        }

    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "serverInfo": {"name": "vinote", "version": "1.0.0"},
            },
        }

    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "error": {"code": -32601, "message": f"Method not found: {method}"},
    }


def main():
    print("VINote MCP Server started", file=sys.stderr)

    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break

            request = json.loads(line.strip())
            response = handle_jsonrpc(request)
            print(json.dumps(response), flush=True)
        except Exception as exc:
            print(f"Error: {exc}", file=sys.stderr)


if __name__ == "__main__":
    main()
