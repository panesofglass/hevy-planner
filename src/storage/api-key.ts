import { encryptAesGcm, decryptAesGcm } from "../utils/crypto";

/**
 * Store an encrypted Hevy API key for a user.
 * Encrypts using AES-256-GCM before writing to D1.
 */
export async function setEncryptedApiKey(
  db: D1Database,
  userId: string,
  apiKey: string,
  encryptionKey: string
): Promise<void> {
  const encrypted = await encryptAesGcm(apiKey, encryptionKey);
  await db.prepare("UPDATE users SET hevy_api_key = ? WHERE id = ?").bind(encrypted, userId).run();
}

/**
 * Read and decrypt the Hevy API key for a user.
 * Returns null if no key is stored.
 * Handles both legacy plaintext values and AES-GCM encrypted values transparently:
 * encrypted values contain a colon separator ("base64:base64"); Hevy API keys never do.
 */
export async function getDecryptedApiKey(
  db: D1Database,
  userId: string,
  encryptionKey: string
): Promise<string | null> {
  const row = await db
    .prepare("SELECT hevy_api_key FROM users WHERE id = ?")
    .bind(userId)
    .first<{ hevy_api_key: string | null }>();
  if (!row?.hevy_api_key) return null;
  // Legacy plaintext — Hevy API keys never contain a colon
  if (!row.hevy_api_key.includes(":")) {
    return row.hevy_api_key;
  }
  return decryptAesGcm(row.hevy_api_key, encryptionKey);
}
