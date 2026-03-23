#!/usr/bin/env node
/**
 * Pre-compiles the program JSON Schema into a standalone Ajv validator module.
 * The output runs in Cloudflare Workers without needing `new Function()`.
 *
 * Usage: node scripts/compile-schema.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import standaloneCode from "ajv/dist/standalone/index.js";

const schema = JSON.parse(
  readFileSync("schema/program.schema.json", "utf-8")
);

const ajv = new Ajv2020({ code: { source: true, esm: true }, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const code = standaloneCode(ajv, validate);

writeFileSync("src/domain/compiled-validator.mjs", code);
console.log("Wrote src/domain/compiled-validator.mjs");
