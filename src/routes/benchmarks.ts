import type { Env } from "../types";
import { loadProgram, insertBenchmarkResult } from "../storage/queries";
import { todayString } from "../utils/date";

/** POST /api/log-benchmark/:id — record a benchmark result */
export async function handleLogBenchmark(
  request: Request,
  env: Env,
  userId: string,
  benchmarkId: string,
  tz?: string
): Promise<Response> {
  const { program, programId } = await loadProgram(env.DB, userId);

  const benchmark = program.benchmarks?.find((b) => b.id === benchmarkId);
  if (!benchmark) {
    return new Response("Benchmark not found", { status: 404 });
  }

  const formData = await request.formData();
  const value = formData.get("value") as string | null;
  const passedStr = formData.get("passed") as string | null;
  const side = formData.get("side") as string | null;
  const notes = formData.get("notes") as string | null;

  if (!value) {
    return new Response("value is required", { status: 400 });
  }

  const today = todayString(tz);

  await insertBenchmarkResult(env.DB, {
    userId,
    programId,
    benchmarkId,
    value,
    passed: passedStr === "true",
    side: side || null,
    notes: notes || null,
    testedAt: today,
  });

  return new Response(null, { status: 202 });
}
