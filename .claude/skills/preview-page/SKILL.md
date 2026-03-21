---
name: preview-page
description: Use when checking the HTML output of a Datastar fragment or page without opening a browser
---

# Preview Page

Render a page or fragment from the local dev server and display the HTML output for quick visual verification.

## Steps

1. Ensure `wrangler dev` is running (use `/dev` skill if not).
2. Fetch the page as HTML:
   ```bash
   curl -s -H "Accept: text/html" http://localhost:8787/<path>
   ```
3. Display a summary: document title, number of fragment containers, key data-* attributes found.
4. For SSE fragment preview, fetch the event stream and show the first batch of fragments:
   ```bash
   curl -s -N -H "Accept: text/event-stream" http://localhost:8787/<path> | head -100
   ```
5. Optionally render to a temp HTML file and open in browser for visual inspection:
   ```bash
   curl -s -H "Accept: text/html" http://localhost:8787/<path> > /tmp/preview.html && open /tmp/preview.html
   ```

## Available Pages

| Path | Page |
|------|------|
| `/` | Today (Home) |
| `/progress` | Progress (Skills, Roadmap, Benchmarks) |
| `/program` | Program reference |
| `/bodi` | BODi integration |
| `/resources` | Resources |
| `/foundations` | Foundations |

## Checking Specific Fragments

To inspect a single SSE fragment (e.g., after a push or pull action):

```bash
curl -s -X POST http://localhost:8787/push/<session-id> | head -50
```

## Common Issues

- **Empty response**: Dev server may not be running. Check with `curl -s http://localhost:8787/` first.
- **No SSE events**: Ensure you're sending `Accept: text/event-stream` header. Without it, you get the HTML shell.
- **Stale data**: Run `/seed` to reset the database if the page shows unexpected state.
