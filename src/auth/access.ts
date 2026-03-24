export interface AuthResult {
  userId: string;
  email: string;
}

const CF_ACCESS_CERTS_URL = "https://panesofglass-org.cloudflareaccess.com/cdn-cgi/access/certs";
const CF_ACCESS_AUD: Record<string, string> = {
  development: "7dfb68b023e5047e8aa19295e045bb1aa990dd7001a0f55c757cbb9012e98f1b",
  production: "6c816f78cb0b73fa1f0b5cf41d9b585489e8332b56397da15bdd4a9e0a3a1c49",
};

interface JWK {
  kid: string;
  kty: string;
  alg: string;
  n: string;
  e: string;
}

let cachedKeys: Map<string, CryptoKey> | null = null;
let cacheExpiry = 0;

async function getPublicKeys(): Promise<Map<string, CryptoKey>> {
  const now = Date.now();
  if (cachedKeys && now < cacheExpiry) return cachedKeys;

  const res = await fetch(CF_ACCESS_CERTS_URL);
  if (!res.ok) throw new Error(`Failed to fetch Access certs: ${res.status}`);
  const data = await res.json() as { keys: JWK[] };

  const keys = new Map<string, CryptoKey>();
  for (const jwk of data.keys) {
    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    keys.set(jwk.kid, key);
  }

  cachedKeys = keys;
  cacheExpiry = now + 5 * 60 * 1000; // cache 5 minutes
  return keys;
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function verifyAndDecode(jwt: string, environment: string): Promise<{ email: string } | null> {
  const parts = jwt.split(".");
  if (parts.length !== 3) return null;

  const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(parts[1])));

  // Verify audience
  const expectedAud = CF_ACCESS_AUD[environment];
  if (!expectedAud) return null;
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(expectedAud)) return null;

  // Verify expiry
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) return null;

  // Verify signature
  const keys = await getPublicKeys();
  const key = keys.get(header.kid);
  if (!key) return null;

  const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature = base64UrlDecode(parts[2]);

  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    signature,
    signingInput
  );

  if (!valid) return null;

  return { email: payload.email };
}

export async function getAuthenticatedUser(request: Request, environment: string): Promise<AuthResult | null> {
  const jwt = request.headers.get("cf-access-jwt-assertion");
  if (!jwt) return null;

  try {
    const result = await verifyAndDecode(jwt, environment);
    if (!result?.email) return null;
    return { userId: result.email, email: result.email };
  } catch {
    return null;
  }
}

export async function getAuthenticatedUserOrDev(
  request: Request,
  env: { ENVIRONMENT: string }
): Promise<AuthResult> {
  const user = await getAuthenticatedUser(request, env.ENVIRONMENT);
  if (user) return user;
  if (env.ENVIRONMENT === "development") {
    return { userId: "dev@local", email: "dev@local" };
  }
  throw new Response("Unauthorized", { status: 403 });
}
