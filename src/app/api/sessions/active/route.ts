import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

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
        activeSessions.push(session);
      }
    }

    return NextResponse.json({ sessions: activeSessions });
  } catch (error) {
    console.error("Failed to fetch active sessions from Supabase:", error);
    return NextResponse.json({ sessions: [] });
  }
}

