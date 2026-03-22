// ──────────────────────────────────────────────────────────────────
// D1 row types — mirror the schema in migrations/0001_initial.sql
// ──────────────────────────────────────────────────────────────────

export interface UserRow {
  readonly id: string;
  readonly hevy_api_key_encrypted: string | null;
  readonly active_program: string;
  readonly template_id: string;
  readonly start_date: string;
  readonly created_at: string;
}

export interface QueueItemRow {
  readonly id: number;
  readonly user_id: string;
  readonly session_id: string;
  readonly position: number;
  readonly status: "pending" | "completed";
  readonly completed_date: string | null;
  readonly hevy_routine_id: string | null;
  readonly hevy_workout_id: string | null;
}

export interface ExerciseMappingRow {
  readonly user_id: string;
  readonly program_exercise_name: string;
  readonly hevy_exercise_id: string;
  /** SQLite boolean: 0 = false, 1 = true */
  readonly confirmed_by_user: number;
}

// ──────────────────────────────────────────────────────────────────
// Program domain types — used by queue and reflow logic
// ──────────────────────────────────────────────────────────────────

export interface Exercise {
  id: string;
  name: string;
  /** Either a count (e.g. 3) or a sets×reps/duration string (e.g. "3×30 sec") */
  sets?: number | string;
  reps?: string;
  notes?: string;
}

export interface Session {
  id: string;
  title: string;
  color?: string;
  isDaily?: boolean;
  exercises: Exercise[];
}

export interface TemplateDay {
  dayOfWeek: number;
  label?: string;
  sessionIDs?: string[];
}

export interface WeekTemplate {
  id: string;
  name: string;
  days: TemplateDay[];
}
