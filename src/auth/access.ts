export interface AuthResult {
  userId: string;
  email: string;
}

export function getAuthenticatedUser(request: Request): AuthResult | null {
  const jwt = request.headers.get("cf-access-jwt-assertion");
  if (!jwt) return null;

  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    const email = payload.email;
    if (!email) return null;
    return { userId: email, email };
  } catch {
    return null;
  }
}

export function requireAuth(request: Request): AuthResult {
  const user = getAuthenticatedUser(request);
  if (!user) {
    throw new Response("Unauthorized", { status: 403 });
  }
  return user;
}

export function getAuthenticatedUserOrDev(
  request: Request,
  env: { ENVIRONMENT: string }
): AuthResult {
  const user = getAuthenticatedUser(request);
  if (user) return user;
  if (env.ENVIRONMENT === "development") {
    return { userId: "dev@local", email: "dev@local" };
  }
  throw new Response("Unauthorized", { status: 403 });
}
