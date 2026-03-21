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

When you modify `schema/program.schema.json`, validate ALL program files:

```bash
npx ajv validate -s schema/program.schema.json -d "programs/*.json" --spec=draft2020 --all-errors
```

## Common Issues

- **Missing ajv-cli**: Install with `npm install -g ajv-cli ajv-formats`.
- **Draft version mismatch**: The schema uses Draft 2020-12. Always pass `--spec=draft2020`.
- **$ref resolution**: If the schema uses `$ref`, ensure referenced files are resolvable relative to the schema location.
