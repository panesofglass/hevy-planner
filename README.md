# Hevy Planner

A training companion for [Hevy](https://www.hevyapp.com/) that adds queue-based scheduling, automatic reflow, multi-phase roadmaps, benchmark tracking, and an open program schema.

Built with [Cloudflare Workers](https://workers.cloudflare.com/) and [Datastar](https://data-star.dev/). Installable as a PWA on mobile and desktop.

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- [Hevy API key](https://api.hevyapp.com/) (from Hevy settings)

## Setup

1. **Clone and install**

   ```sh
   git clone https://github.com/panesofglass/hevy-planner.git
   cd hevy-planner
   npm install
   ```

2. **Create a D1 database**

   ```sh
   npx wrangler d1 create hevy-planner
   ```

   Copy the `database_id` into `wrangler.toml` under `[[d1_databases]]`.

3. **Apply migrations**

   ```sh
   npx wrangler d1 migrations apply hevy-planner --local   # local dev
   npx wrangler d1 migrations apply hevy-planner --remote  # remote
   ```

4. **Set secrets**

   ```sh
   # AES-256 key for encrypting Hevy API keys at rest (64 hex chars)
   npx wrangler secret put ENCRYPTION_KEY

   # Cloudflare Access audience tag (from Zero Trust dashboard)
   npx wrangler secret put CF_ACCESS_AUD
   ```

5. **Run locally**

   ```sh
   npm run dev
   ```

   Open `http://localhost:8787`. Local dev uses a dev user bypass (no Cloudflare Access needed).

## Deployment

```sh
npx wrangler deploy                    # dev
npx wrangler deploy --env production   # production
```

After deploying, apply migrations to the remote database:

```sh
npx wrangler d1 migrations apply hevy-planner --remote
npx wrangler d1 migrations apply hevy-planner --remote --env production
```

## Cloudflare Access

The app uses [Cloudflare Access](https://www.cloudflare.com/zero-trust/products/access/) for authentication (free for up to 50 users). Configure a self-hosted Access application for your Worker domain with an allowlist of permitted email addresses.

**Required bypass rules** (separate Access applications with Bypass action):

| Path | Reason |
|------|--------|
| `api/webhooks/hevy` | Hevy webhook callbacks (bearer token auth, not CF Access) |
| `manifest.json` | PWA manifest must load without auth for install prompts |

## PWA Installation

- **iOS**: Safari > Share > Add to Home Screen (set "Open as Web App" to true)
- **Android**: Chrome shows an install prompt automatically after a few visits
- **Desktop**: Chrome/Edge show an install icon in the address bar

## Program Schema

Training programs are defined as JSON. See [schema/program.schema.json](schema/program.schema.json) for the schema and [programs/](programs/) for examples.

## Testing

```sh
npx vitest run                           # domain unit tests
npx playwright test                      # E2E browser tests (requires npm run dev)
```

## Documentation

- [SPEC.md](SPEC.md) — product spec (screens, user flows, queue/reflow rules)
- [schema/program.schema.json](schema/program.schema.json) — program data schema

## License

[MIT](LICENSE)
