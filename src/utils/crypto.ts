/**
 * Hash a string using SHA-256, return hex digest.
 * Used to store webhook auth tokens without exposing plaintext in D1.
 */
export async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Encrypt a string using AES-256-GCM.
 * Returns a "base64(iv):base64(ciphertext)" string.
 * The key must be a 64-character hex string (32 bytes).
 */
export async function encryptAesGcm(plaintext: string, keyHex: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    hexToBytes(keyHex),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return (
    btoa(String.fromCharCode(...iv)) +
    ":" +
    btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  );
}

/**
 * Decrypt an AES-256-GCM encrypted string.
 * Expects a "base64(iv):base64(ciphertext)" string produced by encryptAesGcm.
 * The key must be a 64-character hex string (32 bytes).
 */
export async function decryptAesGcm(encrypted: string, keyHex: string): Promise<string> {
  const [ivB64, ctB64] = encrypted.split(":");
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "raw",
    hexToBytes(keyHex),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}
