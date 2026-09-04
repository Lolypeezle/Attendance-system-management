import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  signSessionQrToken,
  getSessionQrExpiry,
  getRemainingExpirySeconds,
  isSessionAttendanceExpired,
} from "@/lib/tokens";

export const dynamic = "force-dynamic";

function enrichSession(s: any) {
  if (!s) return s;
  const openedAt = s.opened_at || s.created_at || new Date().toISOString();
  const expiryTimestamp = getSessionQrExpiry(openedAt);
  const signedQrToken = signSessionQrToken(s.id, expiryTimestamp);
  const remainingSeconds = getRemainingExpirySeconds(openedAt);
  const isExpired = isSessionAttendanceExpired(openedAt);
  const rawSecret = (s.qr_token || "").trim();
  let secretWord = rawSecret;
  if (rawSecret.startsWith("{")) {
    try {
      const parsed = JSON.parse(rawSecret);
      secretWord = parsed.secretWord || rawSecret;
    } catch {}
  }

  return {
    ...s,
    secretWord: secretWord.toUpperCase(),
    signedQrToken,
    remainingSeconds,
    isExpired,
    expiryTimestamp,
  };
}

export async function GET() {
  try {
    const { data: rawSessions, error } = await supabase
      .from("Session")
      .select(`
        id,
        course_id,
        opened_by,
        opened_at,
        closed_at,
        duration_minutes,
        late_threshold_minutes,
        qr_token,
        require_qr,
        require_geo,
        status,
        course:Course(*),
        lecturer:User(id, name, email)
      `)
      .eq("status", "OPEN")
      .order("opened_at", { ascending: false });

    if (error) throw error;

    const now = Date.now();
    const activeSessions = [];

    for (const session of rawSessions || []) {
      const elapsedMinutes = (now - new Date(session.opened_at).getTime()) / (1000 * 60);
      if (elapsedMinutes > session.duration_minutes) {
        await supabase
          .from("Session")
          .update({ status: "CLOSED", closed_at: new Date().toISOString() })
          .eq("id", session.id);
      } else {
        activeSessions.push(enrichSession(session));
      }
    }

    return NextResponse.json({ sessions: activeSessions });
  } catch (error) {
    console.error("Failed to fetch active sessions from Supabase:", error);
    return NextResponse.json({ sessions: [] });
  }
}
