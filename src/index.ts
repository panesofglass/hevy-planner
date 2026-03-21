export interface Env {
  DB: D1Database;
  ENVIRONMENT: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response("hevy-planner is running");
  },
};
