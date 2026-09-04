import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
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

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "LECTURER" && user.role !== "HOD" && user.role !== "SUPERADMIN")) {
      return NextResponse.json(
        { error: "Access denied. Lecturer access required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    const courseId = searchParams.get("courseId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // If a specific session's detailed student attendance sheet is requested:
    if (sessionId) {
      const { data: session, error: sessErr } = await supabase
        .from("Session")
        .select(`
          *,
          course:Course(id, course_code, course_title, units, level),
          lecturer:User(id, name, email)
        `)
        .eq("id", sessionId)
        .maybeSingle();

      if (sessErr || !session) {
        return NextResponse.json({ error: "Session not found." }, { status: 404 });
      }

      // If user is LECTURER, verify they own the session or teach the course
      if (user.role === "LECTURER" && session.opened_by !== user.userId) {
        return NextResponse.json({ error: "Unauthorized to view this session." }, { status: 403 });
      }

      const { data: records, error: recErr } = await supabase
        .from("AttendanceRecord")
        .select(`
          id,
          session_id,
          student_id,
          matric_number,
          full_name,
          status,
          clock_in_time,
          attendance_token,
          is_flagged,
          flag_reason,
          notes
        `)
        .eq("session_id", sessionId)
        .order("clock_in_time", { ascending: false });

      if (recErr) {
        console.error("Error fetching session records:", recErr);
      }

      const enriched = enrichSession(session);
      const attendeeList = records || [];

      const stats = {
        total: attendeeList.length,
        present: attendeeList.filter((r) => r.status === "PRESENT").length,
        late: attendeeList.filter((r) => r.status === "LATE").length,
        excused: attendeeList.filter((r) => r.status === "EXCUSED").length,
      };

      return NextResponse.json({
        session: enriched,
        records: attendeeList,
        stats,
      });
    }

    // Query all sessions for this lecturer (or all if admin/HOD)
    let query = supabase
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
        status,
        created_at,
        course:Course(id, course_code, course_title, units, level),
        lecturer:User(id, name, email)
      `)
      .order("opened_at", { ascending: false });

    if (user.role === "LECTURER") {
      query = query.eq("opened_by", user.userId);
    }

    if (courseId && courseId !== "ALL") {
      query = query.eq("course_id", courseId);
    }

    if (status && status !== "ALL") {
      query = query.eq("status", status);
    }

    const { data: sessions, error: fetchErr } = await query;

    if (fetchErr) {
      console.error("Supabase fetch lecturer sessions error:", fetchErr);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    // Fetch attendance records counts for these sessions
    const sessionIds = (sessions || []).map((s: any) => s.id);
    let attendanceCountsMap: Record<string, { total: number; present: number; late: number; excused: number }> = {};

    if (sessionIds.length > 0) {
      const { data: recordsData } = await supabase
        .from("AttendanceRecord")
        .select("session_id, status")
        .in("session_id", sessionIds);

      (recordsData || []).forEach((rec: any) => {
        if (!attendanceCountsMap[rec.session_id]) {
          attendanceCountsMap[rec.session_id] = { total: 0, present: 0, late: 0, excused: 0 };
        }
        attendanceCountsMap[rec.session_id].total += 1;
        if (rec.status === "PRESENT") attendanceCountsMap[rec.session_id].present += 1;
        else if (rec.status === "LATE") attendanceCountsMap[rec.session_id].late += 1;
        else if (rec.status === "EXCUSED") attendanceCountsMap[rec.session_id].excused += 1;
      });
    }

    let enrichedSessions = (sessions || []).map((s: any) => {
      const enriched = enrichSession(s);
      const counts = attendanceCountsMap[s.id] || { total: 0, present: 0, late: 0, excused: 0 };
      return {
        ...enriched,
        counts,
      };
    });

    // Optional text search for secret word, course code, or course title
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      enrichedSessions = enrichedSessions.filter((s: any) => {
        return (
          s.secretWord?.toLowerCase().includes(q) ||
          s.course?.course_code?.toLowerCase().includes(q) ||
          s.course?.course_title?.toLowerCase().includes(q)
        );
      });
    }

    const totalSessions = enrichedSessions.length;
    const totalClockedIn = enrichedSessions.reduce((sum: number, s: any) => sum + s.counts.total, 0);
    const uniqueSecretWords = new Set(enrichedSessions.map((s: any) => s.secretWord)).size;

    return NextResponse.json({
      sessions: enrichedSessions,
      stats: {
        totalSessions,
        totalClockedIn,
        uniqueSecretWords,
      },
    });
  } catch (error: any) {
    console.error("Lecturer history API error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
