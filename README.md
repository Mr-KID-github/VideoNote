# VINote

[English README](./README.en.md)

VINote 是一个将视频或音频内容转换为结构化 Markdown 笔记的全栈应用，适合用在视频学习、会议记录、课程整理和内容沉淀等场景。

当前技术栈：

- 前端：React 18 + Vite + TypeScript
- 后端：FastAPI
- 数据库：PostgreSQL
- 认证：FastAPI 签发 JWT，并通过 HttpOnly Cookie 保存会话
- 部署：本地 Docker 与 Raspberry Pi 局域网 Docker

## 核心能力

- 从视频 URL 生成结构化 Markdown 笔记
- 支持多种总结模式：`default`、`accurate`、`oneshot`
- 生成关键时刻、时间戳跳转和截图
- 保存笔记并继续在编辑器中修改
- 支持公开只读分享链接
- 支持模型配置管理
- 提供独立文档站和 OpenAPI / Swagger 接口参考
- 文档站支持中英文双语，默认中文

## 架构概览

高层流程：

```text
浏览器
  -> 前端应用（React）
  -> FastAPI API
     -> 认证服务
     -> 笔记生成流程
     -> 笔记 / 偏好 / 模型配置仓储
     -> PostgreSQL
     -> output/ 任务产物
```

后端主要职责：

- `app/routers/`
  - 提供 HTTP 路由
- `app/services/note_service.py`
  - 编排笔记生成任务
- `app/services/note_media_service.py`
  - 从生成结果中提取关键时刻，并补充时间戳跳转与截图占位
- `app/services/auth_service.py`
  - 邮箱密码认证、JWT 签发与校验、Cookie 处理
- `app/services/note_repository.py`
  - 已保存笔记 CRUD
- `app/services/preferences_repository.py`
  - 用户偏好持久化
- `app/services/model_profile_repository.py`
  - 加密保存模型配置
- `app/downloaders/`、`app/transcribers/`、`app/llm/`
  - 负责媒体获取、语音转写与总结生成

前端主要职责：

- `frontend/src/pages/`
  - 页面级路由
- `frontend/src/pages/Home.tsx`
  - 工作台首页，提供主操作、系统状态、开发者入口与最近笔记
- `frontend/src/stores/authStore.ts`
  - 基于 Cookie 的会话生命周期管理
- `frontend/src/stores/noteLibraryStore.ts`
  - 笔记库 CRUD
- `frontend/src/components/Notes/VideoReferencePanel.tsx`
  - 预览侧媒体面板，支持时间戳跳转
- `frontend/src/components/Notes/KeyMomentsRail.tsx`
  - 关键时刻、截图和时间戳展示
- `frontend/src/stores/languageStore.ts`
  - 语言偏好同步
- `frontend/src/stores/modelProfileStore.ts`
  - 模型配置管理

更多架构细节见 [docs/architecture.md](./docs/architecture.md)。

## 仓库结构

```text
VINote/
├─ app/
│  ├─ downloaders/
│  ├─ llm/
│  ├─ models/
│  ├─ routers/
│  ├─ services/
│  ├─ transcribers/
│  ├─ config.py
│  ├─ db.py
│  └─ db_models.py
├─ frontend/
│  ├─ src/
│  └─ docker/
├─ docs/
├─ deploy/pi/
├─ data/
├─ output/
├─ Dockerfile
├─ docker-compose.yml
├─ main.py
└─ mcp_server.py
```

## 文档说明

项目包含两类文档：

- 使用文档站：位于 `docs/`，由 VitePress 构建
- 接口参考：由 FastAPI 自动生成 Swagger / ReDoc

文档站说明：

- 中文默认入口：`/`
- 英文入口：`/en/`
- 本地默认地址：`http://localhost:3101`

接口参考说明：

- Swagger：`http://127.0.0.1:8900/docs`
- ReDoc：`http://127.0.0.1:8900/redoc`

如果文档站中的描述和 Swagger 不一致，以 Swagger 为准，然后再修正文档。

## 本地开发

依赖要求：

- Python 3.10+
- Node.js 18+
- FFmpeg
- Docker Desktop 或 Docker Engine（如果要使用容器）

### 1. 启动后端

```bash
pip install -r requirements.txt
cp .env.example .env
python main.py
```

如果需要使用 `TRANSCRIBER_TYPE=faster-whisper`，还要安装可选依赖：

```bash
pip install -r requirements.local-transcribers.txt
```

支持热重载的启动方式：

```bash
uvicorn main:app --host 0.0.0.0 --port 8900 --reload
```

### 2. 启动前端

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev -- --host 0.0.0.0 --port 3100
```

### 3. 启动文档站

```bash
cd docs
npm install
npm run docs:dev
```

### 4. 一键启动

Windows 下可以直接运行：

```powershell
.\start-dev.ps1
```

它会同时启动：

- 后端
- 前端
- 文档站

默认本地地址：

- 前端：`http://localhost:3100`
- 后端：`http://127.0.0.1:8900`
- 文档站：`http://localhost:3101`

当本地前端运行在 `3100` 端口时，侧栏左下角 `Document` 会默认跳到 `3101` 文档站。

## 环境变量

后端重要变量：

- `APP_JWT_SECRET`
- `DATABASE_URL`
- `SHARE_BASE_URL`
- `MODEL_PROFILE_ENCRYPTION_KEY`
- `LLM_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL`
- `TRANSCRIBER_TYPE`
- `SUMMARY_DEFAULT_MAX_CHARS`
- `SUMMARY_DEFAULT_MAX_SEGMENTS`
- `SUMMARY_CHUNK_MAX_CHARS`
- `SUMMARY_CHUNK_MAX_SEGMENTS`
- `SUMMARY_CHUNK_OVERLAP_SEGMENTS`

前端运行时变量：

- `VITE_API_BASE_URL`
- `VITE_DOCS_BASE_URL`

说明：

- 本地 Vite 开发时，`VITE_API_BASE_URL` 可以留空，直接用代理到后端
- 如果前端需要指向单独部署的文档站，配置 `VITE_DOCS_BASE_URL`

## Docker

当前 Docker 编排包含以下服务：

- `postgres`
- `backend`
- `frontend`
- `docs`

启动方式：

```bash
docker compose up --build
```

默认端口：

- 前端：`http://localhost:3100`
- 后端：`http://localhost:8900`
- 文档站：`http://localhost:3101`
- Postgres：`postgresql://vinote:<password>@127.0.0.1:54322/vinote`

说明：

- 后端容器会在启动时自动初始化数据库 Schema
- 前端运行时配置会在容器启动时注入，不需要每个环境单独重新构建前端
- 后端通过 `/mcp` 暴露 HTTP MCP 接口

## Raspberry Pi 局域网部署

项目提供了 `deploy/pi/` 下的部署辅助脚本。

推荐流程：

1. 从 `.env.example` 复制生成根目录 `.env`
2. 可选：从 `deploy/pi/local.env.example` 创建 `deploy/pi/local.env`
3. 执行部署脚本

PowerShell：

```powershell
.\deploy\pi\deploy-pi.ps1
```

Bash：

```bash
./deploy/pi/deploy-pi.sh
```

部署后可访问：

- Web 应用：`http://<pi-lan-ip>:<FRONTEND_PORT>`
- MCP 接口：`http://<pi-lan-ip>:<BACKEND_PORT>/mcp`

更多说明见 [deploy/pi/lan.env.example](./deploy/pi/lan.env.example)。

## 认证模型

VINote 当前不再依赖 Supabase 进行浏览器认证。

认证接口：

- `POST /api/auth/sign-up`
- `POST /api/auth/sign-in`
- `POST /api/auth/sign-out`
- `GET /api/auth/session`
- `GET /api/auth/me`

说明：

- 登录或注册成功后，后端会设置 HttpOnly Cookie
- 浏览器请求需要带上 `credentials: 'include'`
- `GET /api/auth/session` 可用于无报错的会话探测

受保护的浏览器数据接口包括：

- `/api/notes`
- `/api/preferences`
- `/api/model-profiles`

## API 说明

核心生成接口：

- `POST /api/generate`
- `GET /api/task/{task_id}`
- `GET /api/task/{task_id}/artifacts/{asset_path}`
- `POST /mcp`
- `GET /mcp`

生成请求支持可选的 `summary_mode`：

- `default`
- `accurate`
- `oneshot`

已保存笔记相关接口：

- `GET /api/notes`
- `GET /api/notes/{id}`
- `POST /api/notes`
- `PATCH /api/notes/{id}`
- `DELETE /api/notes/{id}`
- `GET /api/notes/{id}/share`
- `POST /api/notes/{id}/share`
- `DELETE /api/notes/{id}/share`

公开分享接口：

- `GET /share/{token}`
- `GET /api/public/notes/{token}`

偏好设置接口：

- `GET /api/preferences`
- `PATCH /api/preferences`

## 媒体预览行为

- 只在选中的关键时刻附加可点击时间戳，而不是给每个标题都加
- 关键时刻可同时显示截图缩略图
- 点击标题时间戳、关键时刻卡片、内联时间戳或截图时，会尝试驱动预览侧媒体跳转
- YouTube、Bilibili 等可嵌入源会以 iframe 方式展示
- 音频源或无法嵌入的视频源会回退到 `/api/notes/{note_id}/media`
- 笔记编辑器支持左右分栏，并提供可拖拽分隔条

## 验证建议

常用检查项：

- 文档站构建：`cd docs && npm run docs:build`
- Swagger：打开 `http://127.0.0.1:8900/docs`
- 后端健康检查：`GET /healthz`
- 前端构建：

```bash
cd frontend
npm run build
```

- Python 导入 / 语法检查：

```bash
python -m compileall app main.py
```

## 历史文档说明

`docs/plans/` 下的一些旧规划文档仍然保留了早期 Supabase 方案，它们属于历史设计材料，不代表当前运行架构。
