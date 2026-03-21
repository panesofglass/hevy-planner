---
name: hevy-test
description: Use when testing Hevy API connectivity, debugging sync issues, or verifying exercise mappings
---

# Hevy API Test

Hit the Hevy API to verify connectivity and inspect recent data.

## Steps

1. Read the API key. Check environment variable `HEVY_API_KEY` first, then fall back to `wrangler secret`:
   ```bash
   echo $HEVY_API_KEY
   ```
2. Fetch recent workouts:
   ```bash
   curl -s -H "api-key: $HEVY_API_KEY" "https://api.hevyapp.com/v1/workouts?page=1&pageSize=5" | jq '.data[] | {id, title, start_time, end_time}'
   ```
3. Fetch routines:
   ```bash
   curl -s -H "api-key: $HEVY_API_KEY" "https://api.hevyapp.com/v1/routines?page=1&pageSize=10" | jq '.data[] | {id, title, updated_at}'
   ```
4. Fetch exercise templates (for mapping verification):
   ```bash
   curl -s -H "api-key: $HEVY_API_KEY" "https://api.hevyapp.com/v1/exercise_templates?page=1&pageSize=20" | jq '.data[] | {id, title}'
   ```
5. Report: connection status, number of workouts/routines returned, most recent workout date.

## Searching for Exercise Mappings

To check if a program exercise name matches a Hevy exercise:

```bash
curl -s -H "api-key: $HEVY_API_KEY" "https://api.hevyapp.com/v1/exercise_templates?page=1&pageSize=100" | jq --arg q "<exercise name>" '.data[] | select(.title | test($q; "i")) | {id, title}'
```

## Common Issues

- **401 Unauthorized**: API key is wrong or expired. Re-check in Hevy Settings > Developer.
- **Rate limiting**: Hevy doesn't publish limits. If you get 429s, wait 60 seconds and retry.
- **No HEVY_API_KEY set**: Export it in your shell: `export HEVY_API_KEY=<your-key>`.
