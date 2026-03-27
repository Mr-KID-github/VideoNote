---
title: MCP 接入
description: VINote 的 HTTP MCP 入口与适用场景。
---

# MCP 接入

VINote 通过 HTTP JSON-RPC 暴露 MCP。

## 接口

- `GET /mcp`
- `POST /mcp`

默认本地地址：

- `http://127.0.0.1:8900/mcp`

## 什么时候用 MCP

- 当调用方本身就是 agent / tool runner
- 当你需要 tool discovery 和 MCP 语义，而不是直接走 REST

如果只是浏览器或普通后端系统集成，REST 往往更直接。
