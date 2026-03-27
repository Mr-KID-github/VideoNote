---
title: 已保存笔记
description: 生成完成后，如何管理持久化笔记与分享能力。
---

# 已保存笔记

## 主要接口

- `GET /api/notes`
- `GET /api/notes/{id}`
- `POST /api/notes`
- `PATCH /api/notes/{id}`
- `DELETE /api/notes/{id}`

## 分享接口

- `GET /api/notes/{id}/share`
- `POST /api/notes/{id}/share`
- `DELETE /api/notes/{id}/share`
- `GET /share/{token}`
- `GET /api/public/notes/{token}`

## 使用建议

- 生成完成后把 `task_id` 和笔记记录一起保存
- 需要本地媒体回放时使用保存笔记相关媒体接口
- 把公开分享链接当成只读分发能力，而不是协作编辑能力
