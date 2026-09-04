import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  signSessionQrToken,
  getSessionQrExpiry,
  getRemainingExpirySeconds,
  isSessionAttendanceExpired,
  ATTENDANCE_WINDOW_MINUTES,
} from "@/lib/tokens";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;

    // Fetch Session from Supabase
    const { data: session, error: sessionError } = await supabase
      .from("Session")
      .select(`
        *,
        course:Course(id, course_code, course_title, level),
        lecturer:User(id, name, email)
      `)
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError) {
      console.error("Supabase fetch session error:", sessionError);
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Auto-close check if total session duration exceeded
    const elapsedMinutes = (Date.now() - new Date(session.opened_at).getTime()) / (1000 * 60);
    if (session.status === "OPEN" && elapsedMinutes > session.duration_minutes) {
      await supabase
        .from("Session")
        .update({ status: "CLOSED", closed_at: new Date().toISOString() })
        .eq("id", session.id);
      session.status = "CLOSED";
    }

    // Attendance records from Supabase
    const { data: recordsData, error: recordsError } = await supabase
      .from("AttendanceRecord")
      .select("*")
      .eq("session_id", sessionId)
      .order("clock_in_time", { ascending: false });

    if (recordsError) {
      console.error("Supabase fetch records error:", recordsError);
    }

    const records = recordsData || [];

    // Course Enrollments from Supabase
    const { data: enrollmentsData, error: enrollmentsError } = await supabase
      .from("Enrollment")
      .select(`
        student:StudentProfile(id, matric_number, full_name, level)
      `)
      .eq("course_id", session.course_id);

    if (enrollmentsError) {
      console.error("Supabase fetch enrollments error:", enrollmentsError);
    }

    const enrolledStudents = (enrollmentsData || [])
      .map((e: any) => e.student)
      .filter(Boolean);

    const totalEnrolled = enrolledStudents.length;
    const presentCount = records.filter((r) => r.status === "PRESENT").length;
    const lateCount = records.filter((r) => r.status === "LATE").length;
    const excusedCount = records.filter((r) => r.status === "EXCUSED").length;
    const flaggedCount = records.filter((r) => r.is_flagged).length;

    // Clocked-in students set
    const clockedInMatrics = new Set(records.map((r) => r.matric_number));
    const unclockedStudents = enrolledStudents.filter(
      (s: any) => !clockedInMatrics.has(s.matric_number)
    );

    const remainingMinutes = Math.max(
      0,
      Math.round(session.duration_minutes - elapsedMinutes)
    );

    // 20-Minute Attendance Window details
    const expiryTimestamp = getSessionQrExpiry(session.opened_at);
    const signedQrToken = signSessionQrToken(session.id, expiryTimestamp);
    const remainingExpirySeconds = getRemainingExpirySeconds(session.opened_at);
    const isAttendanceExpired = isSessionAttendanceExpired(session.opened_at);

    // Extract clean secret word
    const rawSecret = (session.qr_token || "").trim();
    let secretWord = rawSecret;
    if (rawSecret.startsWith("{")) {
      try {
        const parsed = JSON.parse(rawSecret);
        secretWord = parsed.secretWord || rawSecret;
      } catch {}
    }

    return NextResponse.json({
      session: {
        id: session.id,
        courseId: session.course?.id || session.course_id,
        courseCode: session.course?.course_code,
        courseTitle: session.course?.course_title,
        level: session.course?.level,
        lecturerName: session.lecturer?.name || "Lecturer",
        openedAt: session.opened_at,
        closedAt: session.closed_at,
        durationMinutes: session.duration_minutes,
        lateThresholdMinutes: session.late_threshold_minutes,
        requireQr: session.require_qr,
        requireGeo: session.require_geo,
        qrToken: session.qr_token,
        secretWord: secretWord.toUpperCase(),
        signedQrToken,
        remainingMinutes,
        remainingExpirySeconds,
        isAttendanceExpired,
        expiryTimestamp,
        attendanceWindowMinutes: ATTENDANCE_WINDOW_MINUTES,
        status: session.status,
      },
      stats: {
        totalEnrolled,
        totalClockedIn: records.length,
        presentCount,
        lateCount,
        excusedCount,
        flaggedCount,
        unclockedCount: unclockedStudents.length,
      },
      records: records.map((r) => ({
        id: r.id,
        studentId: r.student_id,
        matricNumber: r.matric_number,
        fullName: r.full_name,
        status: r.status,
        clockInTime: r.clock_in_time,
        deviceFingerprint: r.device_fingerprint,
        ipAddress: r.ip_address,
        attendanceToken: r.attendance_token,
        isFlagged: r.is_flagged,
        flagReason: r.flag_reason,
        notes: r.notes,
      })),
      unclockedStudents: unclockedStudents.map((s: any) => ({
        id: s.id,
        matricNumber: s.matric_number,
        fullName: s.full_name,
        level: s.level,
      })),
    });
  } catch (error: any) {
    console.error("Live session fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch live session data" },
      { status: 500 }
    );
  }
}
