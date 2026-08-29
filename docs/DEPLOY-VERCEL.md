# Deploying Proxigrid to Vercel

Proxigrid was originally built for a long-running server (SQLite + always-on
workers). These are the changes/steps that make it run on Vercel's serverless
platform.

## What changed in the repo

- **Database → Postgres.** `prisma/schema.prisma` now uses `postgresql`.
  Vercel's filesystem is ephemeral, so the old SQLite file DB can't be used.
- **`postinstall: prisma generate`** so Prisma Client is regenerated on Vercel's
  cached installs.
- **`vercel.json`** sets a Vercel-only build (`prisma db push --skip-generate &&
  next build`) and a cron job.
- **`next.config.ts`** only emits the standalone bundle when *not* on Vercel
  (`output` is unset when `VERCEL=1`); Vercel builds/serves its own way.
- **Workers → Vercel Cron.** The signal scan + automation sweep now run from
  `GET /api/cron/tick` (a shared `scanOnce()` + `sweep()` pass), scheduled in
  `vercel.json`, instead of `setInterval`. Don't set `ENABLE_SIGNAL_SCANNER` /
  `ENABLE_AUTOMATION_WORKER` on Vercel — those are for self-hosting.

## Steps

1. **Import the repo** in Vercel (New Project → import `TisoneK/proxigrid`).
2. **Add a Postgres database**: Storage → create a Postgres (Vercel Postgres or
   Neon) and connect it to the project. This sets `DATABASE_URL` automatically
   for all environments.
3. **Add env vars** (Project → Settings → Environment Variables):
   - `CRON_SECRET` — a long random string (protects `/api/cron/tick`).
   - Optional: `SIGNAL_SCAN_SYMBOLS`, `SIGNAL_SCAN_TIMEFRAME`,
     `SIGNAL_RETENTION_DAYS`, `COINBASE_ENABLED`, and Binance creds if trading.
   - See `.env.example` for the full list.
4. **Deploy.** The build runs `prisma db push` (creates the tables on the new
   Postgres) then `next build`.

## Notes

- **Cron frequency.** `vercel.json` schedules `/api/cron/tick` every 10 min. The
  **Hobby** plan restricts cron frequency (and count); **Pro** allows minutely.
  Adjust the schedule to your plan.
- **Local dev after this change** needs Postgres too (SQLite is gone). Point
  `DATABASE_URL` at a local Postgres or a Neon dev branch, then `npm run
  db:push`. `vercel env pull .env` will fetch the project's vars.
- **Trading stays dry-run** unless `ENABLE_LIVE_TRADING=true` and Binance creds
  are set — and Binance's signed endpoints may be geo-blocked from Vercel's
  region.
