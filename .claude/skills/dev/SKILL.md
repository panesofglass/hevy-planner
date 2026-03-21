---
name: dev
description: Use when starting local development, running the app locally, or needing to see changes in the browser
---

# Dev Server

Start the local Workers dev server with D1 persistence and open the app.

## Steps

1. Check if `wrangler dev` is already running (check for port 8787). If so, just report the URL.
2. Ensure local D1 migrations are applied:
   ```bash
   npx wrangler d1 migrations apply hevy-planner-db --local
   ```
3. Start the dev server with local persistence:
   ```bash
   npx wrangler dev --local --persist-to .wrangler/state
   ```
4. Wait for the "Ready on http://localhost:8787" message in output.
5. Open `http://localhost:8787` in the default browser:
   ```bash
   open http://localhost:8787
   ```

## Common Issues

- **Port in use**: Kill the existing process with `lsof -ti:8787 | xargs kill` and retry.
- **Missing migrations**: If D1 tables are missing, check `migrations/` directory for unapplied SQL files.
- **Stale state**: Delete `.wrangler/state` and re-run migrations for a clean slate.
