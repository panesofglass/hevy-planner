import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import type { Program } from "../types";
import schema from "../../schema/program.schema.json";

type CompiledValidator = ReturnType<InstanceType<typeof Ajv2020>["compile"]>;
let _validate: CompiledValidator | null = null;

function getValidator(): CompiledValidator {
  if (!_validate) {
    const ajv = new Ajv2020({ allErrors: true });
    addFormats(ajv);
    _validate = ajv.compile(schema);
  }
  return _validate;
}

export type ValidationResult =
  | { valid: true; program: Program }
  | { valid: false; errors: string[] };

export function validateProgram(data: unknown): ValidationResult {
  const validate = getValidator();
  if (validate(data)) {
    return { valid: true, program: data as unknown as Program };
  }

  const errors = (validate.errors ?? []).map((e) => {
    const path = e.instancePath || "/";
    return `${path}: ${e.message ?? "unknown error"}`;
  });

  return { valid: false, errors };
}
