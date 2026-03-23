export interface HevyExerciseTemplate {
  id: string;
  title: string;
  type: string;
  primary_muscle_group: string;
  equipment_category: string;
  other_muscles: string[];
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
  reps: number | null;
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
      const errorBody = await res.text().catch(() => "");
      console.error(`Hevy API ${res.status} ${res.statusText} ${url}: ${errorBody}`);
      throw new Error(`Hevy API error: ${res.status} ${res.statusText}: ${errorBody}`);
    }

    const text = await res.text();
    try {
      return JSON.parse(text) as T;
    } catch {
      console.error(`Hevy API response not JSON (${url}): ${text.slice(0, 200)}`);
      throw new Error(`Hevy API returned non-JSON: ${text.slice(0, 100)}`);
    }
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
        `/exercise_templates?page=${page}&pageSize=100`
      );
      all.push(...data.exercise_templates);
      if (page >= data.page_count) break;
      page++;
    }
    return all;
  }

  async getRoutineFolders(): Promise<{ id: number; title: string }[]> {
    const all: { id: number; title: string }[] = [];
    let page = 1;
    while (page <= HevyClient.MAX_PAGES) {
      const data = await this.request<{ page: number; page_count: number; routine_folders: { id: number; title: string }[] }>(
        `/routine_folders?page=${page}&pageSize=10`
      );
      all.push(...data.routine_folders);
      if (page >= data.page_count) break;
      page++;
    }
    return all;
  }

  async createRoutineFolder(name: string): Promise<{ id: number; title: string }> {
    const data = await this.request<unknown>("/routine_folders", {
      method: "POST",
      body: JSON.stringify({ routine_folder: { title: name } }),
    });
    const obj = data as { routine_folder: { id: number; title: string } };
    return obj.routine_folder;
  }

  async getOrCreateRoutineFolder(name: string): Promise<{ id: number; title: string }> {
    const folders = await this.getRoutineFolders();
    const existing = folders.find((f) => f.title === name);
    if (existing) return existing;
    return this.createRoutineFolder(name);
  }

  async createRoutine(routine: { title: string; folder_id?: number; exercises: HevyRoutineExercise[] }): Promise<HevyRoutine> {
    const payload = { routine };
    const data = await this.request<unknown>("/routines", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    // Hevy returns { routine: [ { id, ... } ] }
    const obj = data as Record<string, unknown>;
    const routines = obj.routine as HevyRoutine[] | undefined;
    if (Array.isArray(routines) && routines.length > 0) return routines[0];
    throw new Error(`Unexpected createRoutine response: ${JSON.stringify(data).slice(0, 200)}`);
  }

  async updateRoutine(routineId: string, routine: { title: string; exercises: HevyRoutineExercise[] }): Promise<HevyRoutine> {
    const payload = { routine };
    const data = await this.request<{ routine: HevyRoutine }>(`/routines/${routineId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    return data.routine;
  }

  async createExerciseTemplate(template: {
    title: string;
    exercise_type: string;
    equipment_category: string;
    muscle_group: string;
    other_muscles: string[];
  }): Promise<{ id: string }> {
    const url = `${this.baseUrl}/exercise_templates`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "api-key": this.apiKey,
        "accept": "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ exercise: template }),
    });

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      console.error(`Hevy API ${res.status} ${res.statusText} ${url}: ${errorBody}`);
      throw new Error(`Hevy API error: ${res.status} ${res.statusText}: ${errorBody}`);
    }

    // Hevy returns just the ID as a plain string
    const id = await res.text();
    return { id: id.trim() };
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
