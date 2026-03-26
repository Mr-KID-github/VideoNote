# VideoNote

VideoNote 是一个“视频/音频 -> 结构化 Markdown 笔记”的全栈项目。

它包含：

- FastAPI 后端：下载媒体、转写音频、调用 LLM 生成笔记、管理任务产物
- Vite + React 前端：登录、生成笔记、笔记库、编辑器、模型配置
- Supabase：用户认证、笔记存储、模型配置存储、用户偏好
- MCP Server：允许其他 AI 客户端通过 MCP 调用笔记生成能力

## 项目架构

### 1. 整体分层

```text
Frontend (React + Supabase Auth)
        |
        v
FastAPI Routers
        |
        v
Application Services
  |- NoteService
  |- TranscriptionService
  |- LLMService
  |- ModelProfileService
  |- TaskArtifactService
        |
        +--> yt-dlp / ffmpeg / ffprobe
        +--> Whisper / Faster-Whisper / Groq / SenseVoice
        +--> OpenAI-compatible / Anthropic-compatible / Azure OpenAI / Ollama
        +--> Supabase REST API
        +--> output/ task artifacts
```

### 2. 核心生成流程

1. 前端提交视频链接到 `/api/generate`，或后端直接调用同步接口。
2. `NoteService` 创建任务目录，下载音频或准备本地音频文件。
3. `TranscriptionService` 选择转写器，对长音频按时长和文件大小自动分段。
4. `LLMService` 解析最终使用的模型配置并生成 Markdown 笔记。
5. 如果 Markdown 内包含 `[[Screenshot:mm:ss]]` 占位符，`ScreenshotService` 会抽帧并回填图片。
6. `TaskArtifactService` 将状态、转写结果、Markdown 和最终结果写入 `output/`。
7. 前端轮询 `/api/task/{task_id}`，成功后把笔记保存到 Supabase `notes` 表。

### 3. 当前能力边界

- 后端支持“视频 URL 生成笔记”和“本地音频文件生成笔记”两条链路。
- 当前前端页面只开放了视频 URL 生成；本地文件生成功能在浏览器端仍是关闭状态。
- 模型配置支持按用户保存多个 Provider/Profile，并可设定默认模型。

## 技术栈

### Backend

- FastAPI
- Uvicorn
- yt-dlp
- ffmpeg / ffprobe
- faster-whisper
- OpenAI SDK
- Anthropic SDK
- httpx
- PyJWT
- cryptography

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- React Router
- Supabase JS

### Infrastructure

- Supabase Auth + Postgres
- MCP JSON-RPC server

## 目录结构

```text
VideoNote/
├─ app/
│  ├─ routers/                  # FastAPI 路由
│  ├─ services/                 # 核心业务编排与集成
│  ├─ downloaders/              # yt-dlp 下载与抽帧封装
│  ├─ transcribers/             # 多种 ASR 提供方实现
│  ├─ llm/                      # LLM Summarizer 与 Prompt
│  ├─ models/                   # 请求/响应/领域模型
│  └─ config.py                 # 环境变量与目录配置
├─ frontend/
│  ├─ src/
│  │  ├─ pages/                 # 页面级路由
│  │  ├─ components/            # UI 组件
│  │  ├─ stores/                # Zustand 状态管理
│  │  └─ lib/                   # API / Supabase / i18n 工具
│  └─ vite.config.ts
├─ supabase/
│  ├─ migrations/              # 本地数据库迁移
│  └─ start-local.ps1/.sh      # 启动本地 Supabase
├─ tests/                      # 后端测试
├─ docs/plans/                 # 设计与实现说明
├─ data/                       # 下载缓存、分段转写临时文件
├─ output/                     # 任务结果产物
├─ main.py                     # FastAPI 启动入口
├─ mcp_server.py               # MCP 服务入口
├─ start-dev.ps1              # Windows 一键启动
└─ AGENTS.md                   # 仓库协作约束
```

## 环境要求

- Python 3.10+
- Node.js 18+
- FFmpeg
- 可选：Supabase CLI + Docker Desktop

如果你需要完整体验“登录 / 笔记库 / 模型配置”能力，建议把本地 Supabase 一起启动。

## 快速开始

### 1. 安装后端依赖

```bash
pip install -r requirements.txt
```

### 2. 安装前端依赖

```bash
cd frontend
npm install
```

### 3. 配置后端环境变量

复制根目录环境变量模板：

```bash
cp .env.example .env
```

至少需要确认这些变量：

- `LLM_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL`
- `TRANSCRIBER_TYPE`
- `GROQ_API_KEY` 或本地 Whisper 相关配置

如果要启用登录态、模型配置管理、受保护接口，还需要：

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `MODEL_PROFILE_ENCRYPTION_KEY`

### 4. 配置前端环境变量

复制前端模板：

```bash
cd frontend
cp .env.example .env.local
```

前端实际使用以下变量：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL`

本地开发时，`VITE_API_BASE_URL` 可以留空，Vite 会通过代理将 `/api` 转发到 `http://localhost:8900`。

### 5. 启动本地 Supabase（可选但推荐）

```powershell
.\supabase\start-local.ps1
```

或：

```bash
./supabase/start-local.sh
```

脚本会依次执行：

1. `supabase start`
2. `supabase db push`
3. `supabase status`

默认本地端口：

- API: `http://127.0.0.1:55321`
- Studio: `http://127.0.0.1:55323`
- DB: `postgresql://postgres:postgres@127.0.0.1:55322/postgres`

### 6. 启动服务

#### 方式 A：分别启动

后端：

```bash
uvicorn main:app --host 0.0.0.0 --port 8900 --reload
```

前端：

```bash
cd frontend
npm run dev -- --host 0.0.0.0 --port 3100
```

#### 方式 B：Windows 一键启动

```powershell
.\start-dev.ps1
```

或：

```powershell
.\start-dev.bat
```

默认访问地址：

- 后端 API / Swagger: `http://127.0.0.1:8900/docs`
- 前端: `http://localhost:3100`

## 关键后端配置

### 默认 LLM

- `LLM_PROVIDER`: 当前默认值为 `openai-compatible`
- `LLM_BASE_URL`
- `LLM_MODEL`
- `LLM_API_KEY`

### 转写器

`TRANSCRIBER_TYPE` 支持：

- `groq`
- `whisper`
- `faster-whisper`
- `sensevoice`
- `sensevoice-local`

### 长音频分段

这些参数用于避免云端 ASR 413 或超长任务失败：

- `TRANSCRIPTION_CHUNKING_ENABLED`
- `TRANSCRIPTION_CHUNK_MAX_DURATION_SECONDS`
- `TRANSCRIPTION_CHUNK_OVERLAP_SECONDS`
- `TRANSCRIPTION_CHUNK_TARGET_FILE_SIZE_MB`
- `TRANSCRIPTION_CHUNK_MIN_CORE_SECONDS`
- `TRANSCRIPTION_CHUNK_BITRATE_KBPS`

## API 概览

### 笔记生成

- `POST /api/generate`
  - 异步生成视频笔记
- `POST /api/generate_sync`
  - 同步生成视频笔记
- `POST /api/generate_from_file`
  - 异步生成本地音频笔记
- `POST /api/generate_from_file_sync`
  - 同步生成本地音频笔记
- `GET /api/task/{task_id}`
  - 查询任务状态与结果
- `GET /api/styles`
  - 查询支持的笔记风格

### 模型配置

这些接口需要有效的 Supabase Access Token：

- `GET /api/model-profiles`
- `POST /api/model-profiles`
- `PATCH /api/model-profiles/{profile_id}`
- `DELETE /api/model-profiles/{profile_id}`
- `POST /api/model-profiles/{profile_id}/set-default`
- `POST /api/model-profiles/test`
- `POST /api/model-profiles/{profile_id}/test`

### 同步生成示例

```bash
curl -X POST http://127.0.0.1:8900/api/generate_sync \
  -H "Content-Type: application/json" \
  -d '{
    "video_url": "https://www.youtube.com/watch?v=VIDEO_ID",
    "style": "detailed",
    "output_language": "zh-CN"
  }'
```

### 查询风格示例

```bash
curl http://127.0.0.1:8900/api/styles
```

## 笔记风格

后端通过 `app/llm/prompts.py` 维护风格映射，实际可用风格以 `/api/styles` 返回为准。

常见风格包括：

- `minimal`
- `detailed`
- `academic`
- `tutorial`
- `meeting`
- `xiaohongshu`

## 产物输出

每个任务会在 `output/` 下生成独立目录，通常包含：

- `status.json`
- `audio_meta.json`
- `transcript.json`
- `note.md`
- `result.json`
- `.task_id`
- `screenshots/`（若启用了截图占位符）

`data/` 用于缓存下载音频、视频和长音频分段临时文件。

## Supabase 数据结构

本地迁移位于 `supabase/migrations/`，当前主要包含：

- `001_initial.sql`
  - `teams`
  - `team_members`
  - `folders`
  - `notes`
  - `shared_links`
- `002_model_profiles.sql`
  - `model_profiles`
- `003_user_preferences.sql`
  - `user_preferences`

其中当前前端已明确使用：

- `notes`
- `model_profiles`
- `user_preferences`
- Supabase Auth 用户表

## MCP 支持

项目可作为 MCP Server 被其他 AI 客户端调用。

### 启动方式

```bash
python mcp_server.py
```

### MCP 配置示例

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

### 当前暴露的工具

- `generate_video_note`
- `list_note_styles`

## 测试与验证

项目已经包含后端测试，不再是“无测试状态”。

建议的检查方式：

```bash
pytest tests
```

```bash
cd frontend
npm run build
```

再做一次人工 smoke test：

1. 打开 `http://127.0.0.1:8900/docs`
2. 请求 `GET /api/styles`
3. 跑一条真实视频生成链路
4. 检查 `output/` 中的任务产物

## 文档现状说明

这次更新主要修正了以下问题：

- 修复原 `README.md` 中文乱码
- 修正前端端口为 `3100`，与启动脚本和 Vite 配置一致
- 补充前端、Supabase、模型配置和认证说明
- 修正“没有测试”的过期描述
- 把项目从“纯后端工具”更新为“全栈工作台”的真实状态
