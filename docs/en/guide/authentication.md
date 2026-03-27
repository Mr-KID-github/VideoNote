---
title: Authentication
description: VINote session model and protected API access.
---

# Authentication

VINote uses backend-issued JWT session cookies.

## Main endpoints

- `POST /api/auth/sign-up`
- `POST /api/auth/sign-in`
- `POST /api/auth/sign-out`
- `GET /api/auth/session`
- `GET /api/auth/me`

## Notes

- Browser clients should use `credentials: include`.
- First-load session probing should use `GET /api/auth/session`.
