"use client";

/**
 * Lightweight in-browser device fingerprinting
 * Combines screen, canvas, audio context, and navigator indicators
 */
export async function getBrowserFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "server-side";

  try {
    const components: string[] = [];

    // Screen & Display
    components.push(`${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`);
    components.push(`${window.devicePixelRatio || 1}`);

    // Navigator
    components.push(navigator.userAgent || "");
    components.push(navigator.language || "");
    components.push(`${new Date().getTimezoneOffset()}`);
    components.push(`${navigator.hardwareConcurrency || 2}`);

    // Canvas fingerprinting
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 200;
      canvas.height = 50;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial'";
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("FUOYE SAMS Attendance", 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText("CSC Dept 2026", 4, 17);
        components.push(canvas.toDataURL());
      }
    } catch {
      // Canvas blocked or unsupported
    }

    const rawString = components.join("###");
    return await sha256(rawString);
  } catch {
    return "fp-" + Math.random().toString(36).substring(2, 15);
  }
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
