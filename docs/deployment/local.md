---
title: 本地与树莓派部署
description: 本地开发、Docker 运行和 Raspberry Pi 局域网部署说明。
---

# 本地与树莓派部署

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

## Docker 本地运行

```bash
docker compose up --build
```

默认会启动：

- `postgres`
- `backend`
- `frontend`
- `docs`

## Raspberry Pi 部署

推荐顺序：

1. 从根目录 `.env.example` 生成 `.env`
2. 从 `deploy/pi/local.env.example` 生成 `deploy/pi/local.env`
3. 先执行 bootstrap，自动准备 Docker、Docker Compose 和远程目录
4. 再执行 deploy

### Bootstrap

PowerShell：

```powershell
.\deploy\pi\bootstrap-pi.ps1
```

Bash：

```bash
./deploy/pi/bootstrap-pi.sh
```

bootstrap 会做这些事情：

- 安装 Docker Engine（如果缺失）
- 优先安装 Docker Compose plugin，必要时回退到 `docker-compose`
- 启动并启用 Docker 服务
- 把目标用户加入 `docker` 用户组
- 创建远程应用目录、`data/` 和 `output/`

如果 bootstrap 提示用户组刚被修改，重新开一个 SSH 会话后再部署。

### Deploy

交互式 PowerShell：

```powershell
.\deploy\pi\deploy-pi-interactive.ps1
```

交互式 Bash：

```bash
./deploy/pi/deploy-pi-interactive.sh
```

非交互 PowerShell：

```powershell
.\deploy\pi\deploy-pi.ps1
```

非交互 Bash：

```bash
./deploy/pi/deploy-pi.sh
```

### 当前部署脚本的行为

- 兼容 `docker compose` 和 `docker-compose`
- 交互式脚本在检查失败时可直接触发 bootstrap
- `deploy/pi/local.env` 中的 `PI_REMOTE_DIR` 和 `PI_ENV_FILE` 会被保留
- Bash 脚本兼容由 PowerShell 写出的 UTF-8 BOM `local.env`

## 局域网说明

- 当 `SHARE_BASE_URL` 为空时，后端会尝试推断局域网分享地址
- Pi 部署辅助脚本位于 `deploy/pi/`
- 如果前端要链接到独立文档站，配置 `VITE_DOCS_BASE_URL`
- 额外说明可查看仓库内的 `deploy/pi/README.md`
