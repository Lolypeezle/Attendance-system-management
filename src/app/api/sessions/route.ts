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

  const courseObj = s.course || {
    id: s.course_id || "",
    course_code: "Course",
    course_title: "Lecture Session",
    level: "300L",
  };

  const lecturerObj = s.lecturer || s.course?.lecturer || {
    name: "Faculty Lecturer",
    email: "",
  };

  return {
    ...s,
    course: courseObj,
    lecturer: lecturerObj,
    secretWord: secretWord.toUpperCase(),
    signedQrToken,
    remainingSeconds,
    isExpired,
    expiryTimestamp,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

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
        course:Course(id, course_code, course_title, level, lecturer:User(id, name, email)),
        lecturer:User(id, name, email)
      `)
      .order("opened_at", { ascending: false });

    if (courseId) {
      query = query.eq("course_id", courseId);
    }

    const { data: sessions, error } = await query;

    if (error) {
      console.error("Fetch sessions Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const enriched = (sessions || []).map(enrichSession);
    return NextResponse.json({ sessions: enriched });
  } catch (error) {
    console.error("Fetch sessions error:", error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "LECTURER" && user.role !== "HOD" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized. Admin or Lecturer access required." }, { status: 403 });
    }

    const {
      courseId,
      lectureDate, // e.g. "2026-09-04"
      lectureStartTime, // e.g. "09:00" in WAT
      durationMinutes = 90,
      lateThresholdMinutes = 15,
      secretWord, // e.g. "ALGORITHM"
    } = await req.json();

    if (!courseId) {
      return NextResponse.json({ error: "Please select a course to schedule." }, { status: 400 });
    }

    if (!secretWord || !secretWord.trim()) {
      return NextResponse.json({ error: "Please provide a unique secret word for class attendance." }, { status: 400 });
    }

    // Resolve start timestamp in Nigeria Time (WAT: UTC+1)
    let openedAt: string;
    if (lectureDate && lectureStartTime) {
      // Parse ISO string with +01:00 (Nigeria WAT)
      openedAt = new Date(`${lectureDate}T${lectureStartTime}:00+01:00`).toISOString();
    } else {
      openedAt = new Date().toISOString();
    }

    const cleanSecretWord = secretWord.trim().toUpperCase();

    // Check if an active session already exists for this course
    const { data: existingSession } = await supabase
      .from("Session")
      .select("id")
      .eq("course_id", courseId)
      .eq("status", "OPEN")
      .maybeSingle();

    if (existingSession) {
      // Update existing session with new secret word and schedule
      const { data: updated, error: updateError } = await supabase
        .from("Session")
        .update({
          opened_at: openedAt,
          duration_minutes: parseInt(durationMinutes, 10),
          late_threshold_minutes: parseInt(lateThresholdMinutes, 10),
          qr_token: cleanSecretWord,
          status: "OPEN",
        })
        .eq("id", existingSession.id)
        .select(`
          *,
          course:Course(id, course_code, course_title, level)
        `)
        .single();

      if (updateError) throw updateError;
      return NextResponse.json({ success: true, session: enrichSession(updated), updated: true });
    }

    // Insert new scheduled session
    const sessionId = `ses_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const { data: newSession, error: insertError } = await supabase
      .from("Session")
      .insert({
        id: sessionId,
        course_id: courseId,
        opened_by: user.userId,
        opened_at: openedAt,
        duration_minutes: parseInt(durationMinutes, 10),
        late_threshold_minutes: parseInt(lateThresholdMinutes, 10),
        qr_token: cleanSecretWord,
        status: "OPEN",
      })
      .select(`
        *,
        course:Course(id, course_code, course_title, level)
      `)
      .single();

    if (insertError) {
      console.error("Session insert error:", insertError);
      throw insertError;
    }

    return NextResponse.json({ success: true, session: enrichSession(newSession) });
  } catch (error: any) {
    console.error("Create/update session error:", error);
    return NextResponse.json({ error: error.message || "Failed to schedule session" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "LECTURER" && user.role !== "HOD" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const { sessionId, action, secretWord } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    if (action === "CLOSE") {
      const { data: updated, error } = await supabase
        .from("Session")
        .update({
          status: "CLOSED",
          closed_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, session: enrichSession(updated) });
    }

    if (action === "UPDATE_SECRET_WORD") {
      if (!secretWord || !secretWord.trim()) {
        return NextResponse.json({ error: "Secret word is required." }, { status: 400 });
      }

      const { data: updated, error } = await supabase
        .from("Session")
        .update({
          qr_token: secretWord.trim().toUpperCase(),
        })
        .eq("id", sessionId)
        .select(`
          *,
          course:Course(id, course_code, course_title, level)
        `)
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, session: enrichSession(updated) });
    }

    return NextResponse.json({ error: "Unsupported session action" }, { status: 400 });
  } catch (error: any) {
    console.error("Update session error:", error);
    return NextResponse.json({ error: error.message || "Failed to update session" }, { status: 500 });
  }
}
