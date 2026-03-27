---
title: 本地部署
description: 本地开发和局域网部署的入口说明。
---

# 本地部署

## 本地开发

后端：

```bash
uvicorn main:app --host 0.0.0.0 --port 8900 --reload
```

前端：

```bash
cd frontend
npm run dev
```

文档站：

```bash
cd docs
npm run docs:dev
```

## 默认端口

- 后端 API / Swagger：`8900`
- 前端应用：`3100`
- 文档站：`3101`

## 局域网说明

- 当 `SHARE_BASE_URL` 为空时，后端会尝试推断局域网分享地址
- Pi 部署辅助脚本在 `deploy/pi/`
- 如果前端要链接到独立文档站，配置 `VITE_DOCS_BASE_URL`

