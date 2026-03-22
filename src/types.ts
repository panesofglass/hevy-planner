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
  videoURL?: string;
  searchTerms?: string;
  tags?: string[];
  subtitle?: string;
  description?: string;
}

export interface Session {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  color?: string;
  isDaily?: boolean;
  sortOrder?: number;
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
  description?: string;
  sortOrder?: number;
  days: TemplateDay[];
}

// ──────────────────────────────────────────────────────────────────
// Extended program types — used by fragments for rendering
// ──────────────────────────────────────────────────────────────────

export interface Program {
  meta: { title: string; subtitle?: string; description?: string; durationWeeks?: number };
  sessions: Session[];
  weekTemplates: WeekTemplate[];
  progressions: Progression[];
  roadmap?: RoadmapPhase[];
  skills?: Skill[];
  benchmarks?: Benchmark[];
  foundations?: Foundation[];
}

export interface Progression {
  id: string;
  phaseName: string;
  weekRange: string;
  focus?: string;
  details?: string[];
  weekStart?: number;
  weekEnd?: number;
}

export interface RoadmapPhase {
  id: string;
  name: string;
  weeks?: string;
  status?: "current" | "future" | "completed";
  summary?: string;
  gateTests?: string[];
  sortOrder?: number;
}

export interface Skill {
  id: string;
  name: string;
  priority?: number;
  icon?: string;
  color?: string;
  currentState?: string;
  requirements?: string;
  gapAnalysis?: string;
  timeline?: string;
  milestones?: Array<{ name: string; description?: string; targetWeek?: number }>;
}

export interface Benchmark {
  id: string;
  name: string;
  howTo: string;
  target?: string;
  frequency?: string;
}

export interface Foundation {
  id: string;
  title: string;
  description?: string;
  steps?: Array<{ name: string; instructions: string }>;
  practice?: string;
}
