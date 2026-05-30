---
name: schema-check
description: Use when editing program JSON files or modifying the program schema, to validate program data against the JSON Schema
---

# Schema Check

Validate a program JSON file against `schema/program.schema.json`.

## Steps

1. Identify the target file. Default to `programs/mobility-joint-restoration.json` if none specified.
2. Validate with ajv-cli:
   ```bash
   npx ajv validate -s schema/program.schema.json -d <target-file> --spec=draft2020 --all-errors
   ```
3. If validation fails, show each error with its JSON path and the expected constraint.
4. If validation passes, confirm and show a count of top-level keys as a sanity check.

## After Schema Changes

When you modify `schema/program.schema.json`:

1. Validate ALL program files:
   ```bash
   npx ajv validate -s schema/program.schema.json -d "programs/*.json" --spec=draft2020 --strict=false --all-errors
   ```
2. Regenerate the compiled validator (REQUIRED — the app uses this, not the schema file directly):
   ```bash
   npm run build:schema
   ```
   Do NOT use `npx ajv compile` — it outputs CJS. The `build:schema` script uses the AJV Node API with `{ esm: true }` to produce proper ESM output for Cloudflare Workers.

## Common Issues

- **Validation passes locally but fails in the app**: The compiled validator at `src/domain/compiled-validator.mjs` is stale. Run `npm run build:schema`.
- **Build error "No matching export … for import default"**: `compiled-validator.mjs` has CJS exports. It was generated with `npx ajv compile` instead of `npm run build:schema`. Regenerate with the script.
- **Draft version mismatch**: The schema uses Draft 2020-12. Always pass `--spec=draft2020`.
- **Unknown format "uri" warning**: Expected — pass `--strict=false` to suppress.
