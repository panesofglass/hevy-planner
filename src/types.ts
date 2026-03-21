// ---------------------------------------------------------------------------
// Program JSON types (read-only, mirrors schema/program.schema.json)
// ---------------------------------------------------------------------------

/** Top-level program definition. */
export interface Program {
  readonly meta: ProgramMeta;
  readonly sessions: readonly Session[];
  readonly weekTemplates: readonly WeekTemplate[];
  readonly progressions: readonly Progression[];
  readonly roadmap?: readonly RoadmapPhase[];
  readonly skills?: readonly Skill[];
  readonly benchmarks?: readonly Benchmark[];
  readonly foundations?: readonly Foundation[];
  readonly theme?: Theme;
}

export interface ProgramMeta {
  readonly version: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly description?: string;
  readonly author?: string;
  readonly durationWeeks?: number;
  readonly tags?: readonly string[];
}

export interface Session {
  readonly id: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly description?: string;
  readonly isDaily?: boolean;
  readonly sortOrder?: number;
  readonly color?: string;
  readonly exercises: readonly Exercise[];
}

export interface Exercise {
  readonly id: string;
  readonly name: string;
  readonly sets: string;
  readonly notes?: string;
  readonly videoURL?: string | null;
  readonly searchTerms?: string | null;
  readonly tags?: readonly string[];
  readonly progressionByPhase?: Readonly<
    Record<string, { readonly sets?: string; readonly notes?: string }>
  >;
}

export interface WeekTemplate {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly sortOrder?: number;
  readonly days: readonly [DaySlot, DaySlot, DaySlot, DaySlot, DaySlot, DaySlot, DaySlot];
}

export interface DaySlot {
  readonly dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  readonly sessionIDs?: readonly string[];
  readonly note?: string | null;
}

export interface Progression {
  readonly id: string;
  readonly weekRange: string;
  readonly phaseName: string;
  readonly focus?: string;
  readonly details?: readonly string[];
  readonly weekStart?: number;
  readonly weekEnd?: number;
  readonly sortOrder?: number;
}

export interface RoadmapPhase {
  readonly id: string;
  readonly name: string;
  readonly weeks?: string;
  readonly status?: "current" | "future" | "completed";
  readonly summary?: string;
  readonly keyFocus?: string;
  readonly gateTests?: readonly string[];
  readonly color?: string;
  readonly sortOrder?: number;
}

export interface Skill {
  readonly id: string;
  readonly name: string;
  readonly priority?: number;
  readonly icon?: string;
  readonly color?: string;
  readonly currentState?: string;
  readonly requirements?: string;
  readonly gapAnalysis?: string;
  readonly timeline?: string;
  readonly milestones?: readonly SkillMilestone[];
}

export interface SkillMilestone {
  readonly name: string;
  readonly description?: string;
  readonly targetWeek?: number;
}

export interface Benchmark {
  readonly id: string;
  readonly name: string;
  readonly howTo: string;
  readonly target?: string;
  readonly frequency?: string;
  readonly unit?: string;
}

export interface Foundation {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly steps?: readonly FoundationStep[];
  readonly practice?: string;
  readonly activeDuringWeeks?: {
    readonly start?: number;
    readonly end?: number;
  };
}

export interface FoundationStep {
  readonly step?: number;
  readonly name: string;
  readonly instructions: string;
  readonly videoSearch?: string;
}

export interface Theme {
  readonly backgroundColor?: string;
  readonly textColor?: string;
  readonly accentColor?: string;
  readonly sessionColors?: Readonly<
    Record<string, { readonly background?: string; readonly accent?: string }>
  >;
}

// ---------------------------------------------------------------------------
// D1 row types (runtime state)
// ---------------------------------------------------------------------------

export interface UserRow {
  readonly id: string;
  readonly hevy_api_key_encrypted: string | null;
  readonly hevy_api_key_iv: string | null;
  readonly program_id: string;
  readonly week_template_id: string;
  readonly current_week: number;
  readonly start_date: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface QueueItemRow {
  readonly id: string;
  readonly user_id: string;
  readonly session_id: string;
  readonly scheduled_date: string;
  readonly status: "pending" | "completed" | "skipped";
  readonly hevy_workout_id: string | null;
  readonly sort_order: number;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface ExerciseMappingRow {
  readonly id: string;
  readonly user_id: string;
  readonly program_exercise_id: string;
  readonly hevy_exercise_id: string;
  readonly created_at: string;
}
