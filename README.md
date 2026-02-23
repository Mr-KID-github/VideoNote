# VideoNote

纯后端视频总结系统 — 输入视频链接，输出结构化 Markdown 笔记。

## 🔧 技术栈

- **框架**: FastAPI + Uvicorn
- **视频下载**: yt-dlp (支持 YouTube / Bilibili / 抖音等)
- **音频转写**: OpenAI Whisper (本地推理) 或 Groq Cloud API
- **AI 总结**: OpenAI 兼容 API / Anthropic 兼容 API (支持 OpenAI / DeepSeek / MiniMax / Ollama)
- **MCP 支持**: 可作为 MCP 服务器被其他 AI 助手调用

## 🚀 快速开始

### 1. 安装依赖

```bash
cd VideoNote
pip install -r requirements.txt
```

> ⚠️ 需要系统安装 [FFmpeg](https://ffmpeg.org/download.html)

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入你的 API Keys
```

### 3. 启动服务

```bash
python main.py
```

访问 API 文档: http://127.0.0.1:8900/docs

## 📡 API 接口

### 同步生成笔记

```bash
curl -X POST http://127.0.0.1:8900/api/generate_sync \
  -H "Content-Type: application/json" \
  -d '{
    "video_url": "https://www.youtube.com/watch?v=VIDEO_ID",
    "style": "detailed"
  }'
```

### 异步生成笔记

```bash
# 1. 提交任务
curl -X POST http://127.0.0.1:8900/api/generate \
  -H "Content-Type: application/json" \
  -d '{"video_url": "https://www.youtube.com/watch?v=VIDEO_ID"}'

# 2. 轮询状态
curl http://127.0.0.1:8900/api/task/{task_id}
```

### 查看笔记风格

```bash
curl http://127.0.0.1:8900/api/styles
```

## 🤖 MCP 服务器

VideoNote 可作为 MCP 服务器被其他 AI 助手调用（如 Claude Code、Cursor 等）。

### 配置方法

在 `~/.mcp.json` 中添加：

```json
{
  "mcpServers": {
    "videonote": {
      "command": "python",
      "args": ["/path/to/VideoNote/mcp_server.py"]
    }
  }
}
```

### 可用工具

| 工具名 | 说明 |
|--------|------|
| `generate_video_note` | 生成视频笔记 |
| `list_note_styles` | 获取支持的笔记风格 |

### 使用示例

```json
{
  "video_url": "https://www.bilibili.com/video/BV1xxx",
  "style": "detailed"
}
```

## 📝 笔记风格

| 风格 | 说明 |
|------|------|
| `minimal` | 精简模式 — 仅记录核心要点 |
| `detailed` | 详细模式 — 完整记录内容 |
| `academic` | 学术模式 — 学术写作风格 |
| `tutorial` | 教程模式 — 按步骤记录 |
| `meeting` | 会议纪要 — 议题/决议/待办 |
| `xiaohongshu` | 小红书风格 — emoji + 轻松语气 |

## 📁 项目结构

```
VideoNote/
├── main.py                          # 入口
├── mcp_server.py                   # MCP 服务器
├── requirements.txt
├── .env.example
├── app/
│   ├── __init__.py                  # FastAPI app factory
│   ├── config.py                    # 配置
│   ├── models/                      # 数据模型
│   │   ├── audio.py                 #   音频下载结果
│   │   ├── transcript.py            #   转写结果
│   │   └── note.py                  #   笔记请求/响应
│   ├── downloaders/                 # 视频下载
│   │   ├── base.py                  #   下载器基类
│   │   └── ytdlp_downloader.py      #   yt-dlp 通用下载器
│   ├── transcribers/                # 音频转写
│   │   ├── base.py                  #   转写器基类
│   │   └── groq_transcriber.py     #   Groq Whisper 转写器
│   ├── llm/                         # LLM 总结
│   │   ├── base.py                  #   总结器基类
│   │   ├── openai_llm.py            #   OpenAI / Anthropic 兼容实现
│   │   └── prompts.py               #   Prompt 模板
│   ├── services/                    # 业务逻辑
│   │   └── note_service.py          #   Pipeline 编排
│   └── routers/                     # API 路由
│       └── note.py                  #   笔记接口
├── data/                            # 下载缓存
└── output/                          # 任务结果
```
