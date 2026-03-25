// ──────────────────────────────────────────────────────────────────
// D1 row types — mirror the schema in migrations/
// ──────────────────────────────────────────────────────────────────

export interface UserRow {
  readonly id: string;
  readonly hevy_api_key: string | null;
  readonly active_program: string;
  readonly template_id: string;
  readonly start_date: string;
  readonly created_at: string;
  readonly daily_completed_date: string | null;
  readonly webhook_id: string | null;
  readonly webhook_auth_token: string | null;
  readonly last_sync_at: string | null;
  readonly timezone: string | null;
}

export interface QueueItemRow {
  readonly id: number;
  readonly user_id: string;
  readonly routine_id: string;
  readonly position: number;
  readonly status: "pending" | "completed";
  readonly completed_date: string | null;
  readonly hevy_routine_id: string | null;
  readonly hevy_workout_id: string | null;
  readonly hevy_workout_data: string | null;
}

export interface ExerciseTemplateMappingRow {
  readonly user_id: string;
  readonly program_template_id: string;
  readonly hevy_template_id: string;
  readonly is_custom: number;
}

export interface RoutineMappingRow {
  readonly user_id: string;
  readonly program_routine_id: string;
  readonly hevy_routine_id: string;
}

export interface ProgramRow {
  readonly id: number;
  readonly user_id: string;
  readonly json_data: string;
  readonly is_active: number;
  readonly created_at: string;
}

// ──────────────────────────────────────────────────────────────────
// Program domain types — used by queue and reflow logic
// ──────────────────────────────────────────────────────────────────

/** All Hevy equipment categories + program-specific extensions (mapped to "other" at sync time) */
export type ExtendedEquipmentCategory =
  | "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight"
  | "band" | "kettlebell" | "other" | "weighted_bodyweight"
  | "assisted_bodyweight" | "cardio" | "duration" | "resistance_band" | "none"
  | "foam_roller" | "pull_up_bar";

/** All Hevy muscle groups + program-specific extensions (mapped at sync time) */
export type ExtendedMuscleGroup =
  | "abdominals" | "abductors" | "adductors" | "biceps" | "calves"
  | "cardio" | "chest" | "forearms" | "full_body" | "glutes"
  | "hamstrings" | "lats" | "lower_back" | "neck" | "other"
  | "quadriceps" | "shoulders" | "triceps" | "traps" | "upper_back"
  | "hip_flexors" | "obliques";

export interface ExerciseTemplate {
  id: string;
  title: string;
  /** Hevy exercise type */
  type: "duration" | "reps_only" | "bodyweight_reps" | "weight_reps" | "weight_duration";
  equipmentCategory: ExtendedEquipmentCategory;
  primaryMuscleGroup: ExtendedMuscleGroup;
  secondaryMuscleGroups?: ExtendedMuscleGroup[];
  /** Coaching fields — not in Hevy */
  notes?: string;
  videoURL?: string;
  searchTerms?: string;
  tags?: string[];
  progressionByPhase?: Record<string, { sets?: string; notes?: string }>;
}

export interface RoutineExercise {
  exerciseTemplateId: string;
  /** The prescription for this routine context */
  sets: string;
  /** Override of template notes, if needed */
  notes?: string;
}

export interface Routine {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  color?: string;
  isDaily?: boolean;
  sortOrder?: number;
  folderGroup?: string;
  exercises: RoutineExercise[];
}

export interface TemplateDay {
  dayOfWeek: number;
  label?: string;
  routineIDs?: string[];
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

export interface Resource {
  id: string;
  title: string;
  url?: string;
  description?: string;
  category?: string;
}

export interface BodiIntegration {
  id: string;
  title: string;
  description?: string;
  schedule?: string;
  notes?: string;
}

export interface Program {
  meta: { title: string; subtitle?: string; description?: string; durationWeeks?: number };
  exerciseTemplates: ExerciseTemplate[];
  routines: Routine[];
  weekTemplates: WeekTemplate[];
  progressions: Progression[];
  roadmap?: RoadmapPhase[];
  skills?: Skill[];
  benchmarks?: Benchmark[];
  foundations?: Foundation[];
  resources?: Resource[];
  bodi?: BodiIntegration[];
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
  steps?: Array<{ step?: number; name: string; instructions: string; videoSearch?: string }>;
  practice?: string;
  activeDuringWeeks?: { start: number; end: number };
}
