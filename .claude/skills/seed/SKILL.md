---
name: seed
description: Use when needing a fresh local database, after schema changes, or before testing queue and reflow logic
---

# Seed Local Database

Reset the local D1 database, apply all migrations, and load the bundled program data.

## Steps

1. Stop `wrangler dev` if running:
   ```bash
   lsof -ti:8787 | xargs kill 2>/dev/null || true
   ```
2. Delete existing local state:
   ```bash
   rm -rf .wrangler/state
   ```
3. Apply all migrations:
   ```bash
   npx wrangler d1 migrations apply hevy-planner-db --local
   ```
4. Run the seed script to load the bundled program and generate initial queue:
   ```bash
   npx wrangler d1 execute hevy-planner-db --local --file=seed/seed.sql
   ```
5. Verify by querying row counts:
   ```bash
   npx wrangler d1 execute hevy-planner-db --local --command="SELECT 'queue_items' as tbl, count(*) as n FROM queue_items UNION ALL SELECT 'users', count(*) FROM users;"
   ```

## Common Issues

- **Seed file missing**: If `seed/seed.sql` doesn't exist yet, generate seed SQL from the program JSON using the domain logic.
- **Migration conflicts**: If migrations fail, check for out-of-order files in `migrations/`. Files are applied in filename-sorted order.
