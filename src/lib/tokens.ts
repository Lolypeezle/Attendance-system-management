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

