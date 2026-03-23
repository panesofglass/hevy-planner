// @ts-expect-error — generated module has no type declarations
import validate from "../domain/compiled-validator.mjs";
import type { Program } from "../types";

export type ValidationResult =
  | { valid: true; program: Program }
  | { valid: false; errors: string[] };

export function validateProgram(data: unknown): ValidationResult {
  if (validate(data)) {
    return { valid: true, program: data as unknown as Program };
  }

  const errors = (validate.errors ?? []).map(
    (e: { instancePath?: string; message?: string }) => {
      const path = e.instancePath || "/";
      return `${path}: ${e.message ?? "unknown error"}`;
    }
  );

  return { valid: false, errors };
}
