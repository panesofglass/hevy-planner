export interface HevyExerciseTemplate {
  id: string;
  title: string;
  type: string;
  primary_muscle_group: string;
}

export interface HevyRoutine {
  id: string;
  title: string;
  exercises: HevyRoutineExercise[];
}

export interface HevyRoutineExercise {
  exercise_template_id: string;
  sets: HevySet[];
  notes?: string;
}

export interface HevySet {
  type: "normal" | "warmup" | "dropset" | "failure";
  weight_kg?: number;
  reps?: number;
  duration_seconds?: number;
}

export interface HevyWorkout {
  id: string;
  short_id: string;
  name: string;
  start_time: string;
  end_time: string;
  exercises: Array<{
    exercise_template_id: string;
    title: string;
    sets: HevySet[];
  }>;
}

export class HevyClient {
  private baseUrl = "https://api.hevyapp.com/v1";
  private apiKey: string;
  private static readonly MAX_PAGES = 50;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: {
        "api-key": this.apiKey,
        "accept": "application/json",
        "content-type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (res.status === 429) {
      throw new Error("RATE_LIMITED");
    }

    if (!res.ok) {
      throw new Error(`Hevy API error: ${res.status} ${res.statusText}`);
    }

    return res.json() as Promise<T>;
  }

  async getExerciseTemplates(page = 1, pageSize = 10): Promise<HevyExerciseTemplate[]> {
    const data = await this.request<{ page: number; page_count: number; exercise_templates: HevyExerciseTemplate[] }>(
      `/exercise_templates?page=${page}&pageSize=${pageSize}`
    );
    return data.exercise_templates;
  }

  async getAllExerciseTemplates(): Promise<HevyExerciseTemplate[]> {
    const all: HevyExerciseTemplate[] = [];
    let page = 1;
    while (page <= HevyClient.MAX_PAGES) {
      const data = await this.request<{ page: number; page_count: number; exercise_templates: HevyExerciseTemplate[] }>(
        `/exercise_templates?page=${page}&pageSize=10`
      );
      all.push(...data.exercise_templates);
      if (page >= data.page_count) break;
      page++;
    }
    return all;
  }

  async createRoutine(routine: { title: string; exercises: HevyRoutineExercise[] }): Promise<HevyRoutine> {
    const data = await this.request<{ routine: HevyRoutine }>("/routines", {
      method: "POST",
      body: JSON.stringify({ routine }),
    });
    return data.routine;
  }

  async updateRoutine(routineId: string, routine: { title: string; exercises: HevyRoutineExercise[] }): Promise<HevyRoutine> {
    const data = await this.request<{ routine: HevyRoutine }>(`/routines/${routineId}`, {
      method: "PUT",
      body: JSON.stringify({ routine }),
    });
    return data.routine;
  }

  async getRecentWorkouts(page = 1, pageSize = 5): Promise<HevyWorkout[]> {
    // Note: Workers are stateless per request, so in-memory rate limiting
    // doesn't work. Rate limiting should be done via D1 timestamp or caller logic.
    const data = await this.request<{ page: number; page_count: number; workouts: HevyWorkout[] }>(
      `/workouts?page=${page}&pageSize=${pageSize}`
    );
    return data.workouts;
  }
}
