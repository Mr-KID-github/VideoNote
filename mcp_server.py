"""
VideoNote MCP Server
让其他 AI 助手可以调用视频笔记生成功能

启动方式:
    python mcp_server.py

配置到其他 AI 助手时，需要使用 MCP 客户端运行
"""
import json
import os
import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from datetime import timedelta, datetime
import re
from typing import Any, List

from app.config import settings
from app.downloaders.ytdlp_downloader import YtdlpDownloader
from app.transcribers.groq_transcriber import GroqWhisperTranscriber
from app.llm.openai_llm import AnthropicLLM, OpenAILLM
from app.llm.prompts import build_user_prompt, SYSTEM_PROMPT, STYLE_MAP


class VideoNoteMCP:
    """VideoNote MCP 服务器核心类"""

    def __init__(self):
        self.downloader = YtdlpDownloader()

    def list_tools(self) -> List[dict]:
        """列出可用工具"""
        return [
            {
                "name": "generate_video_note",
                "description": "生成视频笔记 - 输入视频URL，返回结构化的Markdown笔记。支持YouTube、Bilibili等平台。",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "video_url": {
                            "type": "string",
                            "description": "视频链接，如 https://www.bilibili.com/video/BV1xxx"
                        },
                        "style": {
                            "type": "string",
                            "description": "笔记风格: minimal(精简), detailed(详细), academic(学术), tutorial(教程), meeting(会议), xiaohongshu(小红书)",
                            "default": "detailed"
                        },
                        "extras": {
                            "type": "string",
                            "description": "额外提示词要求"
                        }
                    },
                    "required": ["video_url"]
                }
            },
            {
                "name": "list_note_styles",
                "description": "获取支持的笔记风格列表",
                "inputSchema": {
                    "type": "object",
                    "properties": {}
                }
            },
        ]

    def generate_note(self, video_url: str, style: str = "detailed", extras: str = None) -> dict:
        """生成视频笔记"""
        if not video_url:
            return {"success": False, "error": "缺少 video_url 参数"}

        try:
            # 1. 下载音频
            print(f"[MCP] 下载音频: {video_url}", file=sys.stderr)
            audio_meta = self.downloader.download(
                video_url=video_url,
                output_dir=str(settings.data_dir),
            )

            # 2. 转写
            print(f"[MCP] 转写中...", file=sys.stderr)
            transcriber = GroqWhisperTranscriber(api_key=settings.groq_api_key)
            transcript = transcriber.transcribe(file_path=audio_meta.file_path)

            # 3. LLM 总结
            print(f"[MCP] 生成笔记中...", file=sys.stderr)

            # 根据 base_url 选择 LLM
            if "minimaxi.com/anthropic" in settings.llm_base_url:
                llm = AnthropicLLM(
                    api_key=settings.llm_api_key,
                    base_url=settings.llm_base_url,
                    model=settings.llm_model,
                )
            else:
                llm = OpenAILLM(
                    api_key=settings.llm_api_key,
                    base_url=settings.llm_base_url,
                    model=settings.llm_model,
                )

            # 构建 prompt
            segment_text = self._format_segments(transcript.segments)
            user_prompt = build_user_prompt(
                title=audio_meta.title,
                segment_text=segment_text,
                style=style,
                extras=extras,
            )

            # 调用 LLM
            response = llm.client.messages.create(
                model=llm.model,
                max_tokens=8192,
                system=SYSTEM_PROMPT,
                messages=[
                    {"role": "user", "content": [{"type": "text", "text": user_prompt}]}
                ],
                temperature=llm.temperature,
            )

            # 解析结果
            markdown = ""
            for block in response.content:
                if block.type == "text":
                    markdown = block.text.strip()
                    break

            # 4. 保存到本地（和 API 一样）
            output_dir = Path(settings.output_dir)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_title = self._sanitize_filename(audio_meta.title)
            note_dir = output_dir / f"{timestamp}_{safe_title}"
            note_dir.mkdir(parents=True, exist_ok=True)

            # 保存 note.md
            (note_dir / "note.md").write_text(markdown, encoding="utf-8")

            # 保存 result.json
            result_data = {
                "title": audio_meta.title,
                "duration": audio_meta.duration,
                "platform": audio_meta.platform,
                "video_id": audio_meta.video_id,
                "cover_url": audio_meta.cover_url,
                "markdown": markdown,
            }
            (note_dir / "result.json").write_text(
                json.dumps(result_data, ensure_ascii=False, indent=2),
                encoding="utf-8"
            )

            print(f"[MCP] 笔记已保存到: {note_dir}", file=sys.stderr)

            return {
                "success": True,
                "title": audio_meta.title,
                "duration": audio_meta.duration,
                "platform": audio_meta.platform,
                "video_id": audio_meta.video_id,
                "markdown": markdown,
                "output_path": str(note_dir),
            }

        except Exception as e:
            import traceback
            error_msg = f"生成笔记失败: {str(e)}\n{traceback.format_exc()}"
            print(error_msg, file=sys.stderr)
            return {"success": False, "error": str(e)}

    def list_styles(self) -> dict:
        """获取笔记风格列表"""
        styles = [
            {"value": key, "description": val}
            for key, val in STYLE_MAP.items()
        ]
        return {"styles": styles}

    def _format_time(self, seconds: float) -> str:
        """格式化时间"""
        td = timedelta(seconds=int(seconds))
        total_seconds = int(td.total_seconds())
        minutes = total_seconds // 60
        secs = total_seconds % 60
        return f"{minutes:02d}:{secs:02d}"

    def _sanitize_filename(self, name: str) -> str:
        """清理文件名，移除非法字符"""
        name = re.sub(r'[<>:"/\\|?*]', '', name)
        return name[:50] if len(name) > 50 else name

    def _format_segments(self, segments: List) -> str:
        """格式化转写分段"""
        lines = []
        for seg in segments:
            time_str = self._format_time(seg.start)
            lines.append(f"{time_str} - {seg.text}")
        return "\n".join(lines)


# MCP 协议处理
def handle_jsonrpc(request: dict) -> dict:
    """处理 JSON-RPC 请求"""
    method = request.get("method")
    request_id = request.get("id")

    videonote = VideoNoteMCP()

    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {"tools": videonote.list_tools()}
        }
    elif method == "tools/call":
        tool_name = request.get("params", {}).get("name")
        arguments = request.get("params", {}).get("arguments", {})

        if tool_name == "generate_video_note":
            result = videonote.generate_note(
                video_url=arguments.get("video_url"),
                style=arguments.get("style", "detailed"),
                extras=arguments.get("extras"),
            )
        elif tool_name == "list_note_styles":
            result = videonote.list_styles()
        else:
            result = {"error": f"Unknown tool: {tool_name}"}

        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "content": [
                    {"type": "text", "text": json.dumps(result, ensure_ascii=False)}
                ]
            }
        }
    elif method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "serverInfo": {"name": "videonote", "version": "1.0.0"}
            }
        }
    else:
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {"code": -32601, "message": f"Method not found: {method}"}
        }


def main():
    """MCP 服务器主循环"""
    print("VideoNote MCP Server 启动中...", file=sys.stderr)

    # 检查配置
    if not settings.groq_api_key:
        print("警告: GROQ_API_KEY 未配置", file=sys.stderr)
    if not settings.llm_api_key:
        print("警告: LLM_API_KEY 未配置", file=sys.stderr)

    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break

            request = json.loads(line.strip())
            response = handle_jsonrpc(request)

            print(json.dumps(response), flush=True)
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
