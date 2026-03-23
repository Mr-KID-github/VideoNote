# Local Supabase

This repository uses the root `supabase/` directory as the only source of truth for local Supabase development.

## Prerequisites

- Install the [Supabase CLI](https://supabase.com/docs/guides/cli).
- Ensure Docker Desktop is running.

## Start local services

From the repository root:

```powershell
.\supabase\start-local.ps1
```

or

```bash
./supabase/start-local.sh
```

The scripts run:

1. `supabase start`
2. `supabase db push`
3. `supabase status`

## Port mapping

- API: `http://127.0.0.1:55321`
- Studio: `http://127.0.0.1:55323`
- DB: `postgresql://postgres:postgres@127.0.0.1:55322/postgres`

## Notes

- Do not use `frontend/supabase/`; that legacy duplicate has been removed.
- Keep migrations only under `supabase/migrations/`.
