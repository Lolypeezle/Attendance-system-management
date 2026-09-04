import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "fuoye-sams-super-secure-key-2026";

/**
 * Generates a memorable, unique 6-character alphanumeric verification token
 * Example: FY-9X2, A7K2P9
 */
export function generateAttendanceToken(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // exclude easily confused chars (0, O, 1, I)
  let result = "";
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * Creates a cryptographically signed QR code token for an active session
 */
export function signSessionQrToken(sessionId: string, expiresAtTimestamp: number): string {
  const payload = `${sessionId}:${expiresAtTimestamp}`;
  const hmac = crypto.createHmac("sha256", JWT_SECRET);
  hmac.update(payload);
  const signature = hmac.digest("hex").slice(0, 16);
  return `${expiresAtTimestamp}.${signature}`;
}

/**
 * Verifies that a QR token is valid and has not expired
 */
export function verifySessionQrToken(sessionId: string, token: string): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [expiresStr, providedSignature] = parts;
  const expiresAt = parseInt(expiresStr, 10);
  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return false; // Expired
  }

  const payload = `${sessionId}:${expiresAt}`;
  const hmac = crypto.createHmac("sha256", JWT_SECRET);
  hmac.update(payload);
  const expectedSignature = hmac.digest("hex").slice(0, 16);

  const provBuffer = Buffer.from(providedSignature);
  const expBuffer = Buffer.from(expectedSignature);

  if (provBuffer.length !== expBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(provBuffer, expBuffer);
}
export const ATTENDANCE_WINDOW_MINUTES = 20;

/**
 * Calculates the 20-minute expiration timestamp (in milliseconds) from session start
 */
export function getSessionQrExpiry(openedAt: string | Date | number): number {
  const startTimeMs =
    typeof openedAt === "number"
      ? openedAt
      : new Date(openedAt).getTime();
  return startTimeMs + ATTENDANCE_WINDOW_MINUTES * 60 * 1000;
}

/**
 * Checks if the 20-minute window from class start has expired
 */
export function isSessionAttendanceExpired(openedAt: string | Date | number): boolean {
  return Date.now() > getSessionQrExpiry(openedAt);
}

/**
 * Returns remaining seconds in the 20-minute window (0 if expired)
 */
export function getRemainingExpirySeconds(openedAt: string | Date | number): number {
  const diffMs = getSessionQrExpiry(openedAt) - Date.now();
  return Math.max(0, Math.floor(diffMs / 1000));
}

const MEMORABLE_WORDS = [
  "ALGORITHM",
  "SPECTRUM",
  "NEURON",
  "VECTOR",
  "SYNAPSE",
  "KINETIC",
  "CIPHER",
  "QUANTUM",
  "NEXUS",
  "BINARY",
  "CIRCUIT",
  "DYNAMICS",
  "PRISM",
  "MATRIX",
  "OASIS",
  "HORIZON",
  "APEX",
  "CRYPTO",
  "SUMMIT",
  "LOGIC",
];

/**
 * Generates an engaging, easy-to-announce unique word for the lecture session
 */
export function generateRandomSecretWord(): string {
  const index = Math.floor(Math.random() * MEMORABLE_WORDS.length);
  return MEMORABLE_WORDS[index];
}
