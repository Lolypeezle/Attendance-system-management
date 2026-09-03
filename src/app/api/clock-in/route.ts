import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { generateAttendanceToken, verifySessionQrToken } from "@/lib/tokens";
import { isWithinFuoyeCampus } from "@/lib/geofence";
import { AttendanceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sessionId,
      matricNumber,
      fullName,
      secretWord,
      deviceFingerprint,
      latitude,
      longitude,
      qrToken,
    } = body;

    if (!sessionId || !matricNumber || !fullName) {
      return NextResponse.json(
        { error: "Please fill in all required fields (Course, Matric Number, and Full Name)." },
        { status: 400 }
      );
    }

    const cleanMatric = matricNumber.trim().toUpperCase();
    const cleanName = fullName.trim();

    // 1. Fetch Session or Course from Supabase
    let session: any = null;

    const { data: directSession } = await supabase
      .from("Session")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (directSession) {
      session = directSession;
      const { data: courseData } = await supabase
        .from("Course")
        .select("*")
        .eq("id", directSession.course_id)
        .maybeSingle();
      session.course = courseData;
    } else {
      // Find course by ID or course code
      const { data: course } = await supabase
        .from("Course")
        .select("*")
        .or(`id.eq.${sessionId},course_code.eq.${sessionId}`)
        .maybeSingle();

      if (course) {
        // Find existing open session or create one on the fly
        const { data: openSession } = await supabase
          .from("Session")
          .select("*")
          .eq("course_id", course.id)
          .eq("status", "OPEN")
          .order("opened_at", { ascending: false })
          .maybeSingle();

        if (openSession) {
          session = openSession;
          session.course = course;
        } else {
          const { data: newSession } = await supabase
            .from("Session")
            .insert({
              course_id: course.id,
              opened_by: course.lecturer_id || "usr_lec_01",
              status: "OPEN",
              duration_minutes: 240,
              late_threshold_minutes: 45,
              qr_token: `token-${course.course_code.toLowerCase().replace(/\s+/g, "")}`,
              require_qr: false,
              require_geo: false,
            })
            .select()
            .single();

          session = newSession;
          if (session) session.course = course;
        }
      }
    }



    if (!session) {
      return NextResponse.json({ error: "Selected course/session does not exist." }, { status: 404 });
    }

function parseTimestamp(ts: any): number {
  if (!ts) return Date.now();
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === "string") {
    const trimmed = ts.trim();
    if (!trimmed.endsWith("Z") && !trimmed.includes("+") && !trimmed.slice(10).includes("-")) {
      return new Date(`${trimmed}Z`).getTime();
    }
    return new Date(trimmed).getTime();
  }
  return new Date(ts).getTime();
}

    // 1.3. Enforce 1-Hour Code Expiration Window from Lecture Start Time
    const nowTime = Date.now();
    const sessionStartTimeMs = parseTimestamp(session.opened_at);
    const sessionStartTime = new Date(sessionStartTimeMs);
    const elapsedMinutesFromStart = (nowTime - sessionStartTimeMs) / (1000 * 60);

    // If student arrives more than 1 hour (60 mins) after class started, lock them out!
    if (elapsedMinutesFromStart > 60) {
      const startTimeWAT = sessionStartTime.toLocaleTimeString("en-NG", {
        timeZone: "Africa/Lagos",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      return NextResponse.json(
        {
          error: `Attendance Locked! This lecture started at ${startTimeWAT} (WAT). The unique attendance code expires strictly 1 hour after class start time. You arrived ${Math.round(
            elapsedMinutesFromStart
          )} minutes late and can no longer clock in.`,
        },
        { status: 403 }
      );
    }

    // 1.5. Validate Unique Secret Word (Announced by Lecturer in Physical Class)

    const requiredSecretWord = (session.qr_token || "").trim();
    if (requiredSecretWord && !requiredSecretWord.startsWith("token-")) {
      const providedWord = (secretWord || qrToken || "").trim().toUpperCase();
      if (!providedWord || providedWord !== requiredSecretWord.toUpperCase()) {
        return NextResponse.json(
          {
            error:
              "Invalid Class Attendance Secret Word! You must physically attend the lecture to obtain the unique secret word from your lecturer in class.",
          },
          { status: 403 }
        );
      }
    }

    // 2. Real-time Matric Validation & Universal Acceptance

    let { data: student } = await supabase
      .from("StudentProfile")
      .select("*, enrollments:Enrollment(*)")
      .eq("matric_number", cleanMatric)
      .maybeSingle();

    // Auto-create student profile if matric is new
    if (!student) {
      const { data: newStudent } = await supabase
        .from("StudentProfile")
        .insert({
          matric_number: cleanMatric,
          full_name: cleanName,
          level: "300L",
        })
        .select("*, enrollments:Enrollment(*)")
        .single();

      student = newStudent;
    }

    // Ensure student is enrolled in this course
    if (student) {
      const enrollments = Array.isArray(student.enrollments) ? student.enrollments : [];
      const isEnrolled = enrollments.some((e: any) => e.course_id === session.course_id);
      if (!isEnrolled) {
        await supabase.from("Enrollment").insert({
          student_id: student.id,
          course_id: session.course_id,
          academic_session: "2025/2026",
          semester: "SECOND",
        });
      }
    }


    // 4. Duplicate Prevention check
    const { data: existing } = await supabase
      .from("AttendanceRecord")
      .select("id")
      .eq("session_id", session.id)
      .eq("matric_number", cleanMatric)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "You have already clocked in for this session." },
        { status: 409 }
      );
    }

    // 5. Automatic Punctuality & Late Categorization
    const elapsedMinutes = Math.max(0, Math.round(elapsedMinutesFromStart));

    const lateThreshold = session.late_threshold_minutes || 15;
    const isLate = elapsedMinutes > lateThreshold;
    const status: AttendanceStatus = isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

    const punctualityNote = isLate
      ? `Late (+${elapsedMinutes - lateThreshold}m past threshold; +${elapsedMinutes}m from start)`
      : `On-Time / Early (+${elapsedMinutes}m from start)`;

    // 6. Device Fingerprint & IP Logging
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : req.headers.get("x-real-ip") || "127.0.0.1";

    let isFlagged = false;
    const flagReasons: string[] = [];

    if (deviceFingerprint) {
      const { count } = await supabase
        .from("AttendanceRecord")
        .select("id", { count: "exact", head: true })
        .eq("session_id", session.id)
        .eq("device_fingerprint", deviceFingerprint);

      if (count && count >= 3) {
        isFlagged = true;
        flagReasons.push(`Device fingerprint shared by ${count + 1} different matric submissions`);
      }
    }

    // 7. Optional Campus Geofence Validation
    if (session.require_geo || (latitude && longitude)) {
      if (latitude && longitude) {
        const geoCheck = isWithinFuoyeCampus(parseFloat(latitude), parseFloat(longitude));
        if (!geoCheck.within) {
          isFlagged = true;
          flagReasons.push(`Outside campus perimeter (${(geoCheck.distanceMeters / 1000).toFixed(1)} km away)`);
        }
      } else if (session.require_geo) {
        isFlagged = true;
        flagReasons.push("Campus location permission was declined or unavailable");
      }
    }

    // 8. Generate 6-Character Unique Attendance Token
    const attendanceToken = generateAttendanceToken();

    // 9. Save Attendance Record to Supabase with Punctuality Tracking
    const { data: record, error: insertError } = await supabase
      .from("AttendanceRecord")
      .insert({
        session_id: session.id,
        student_id: student.id,
        matric_number: cleanMatric,
        full_name: cleanName,
        status,
        clock_in_time: now.toISOString(),
        device_fingerprint: deviceFingerprint || null,
        ip_address: ipAddress,
        attendance_token: attendanceToken,
        is_flagged: isFlagged,
        flag_reason: flagReasons.length > 0 ? flagReasons.join("; ") : null,
        notes: punctualityNote,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Supabase insert error:", insertError);
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "You have already clocked in for this session." },
          { status: 409 }
        );
      }
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      message: isLate
        ? `Clocked in (Marked LATE — ${elapsedMinutes} mins after class start)`
        : `Clock-in Successful (Marked ON-TIME / EARLY)!`,
      record: {
        id: record.id,
        courseCode: session.course?.course_code,
        courseTitle: session.course?.course_title,
        lecturerName: session.lecturer?.name,
        studentName: cleanName,
        matricNumber: cleanMatric,
        clockInTime: record.clock_in_time,
        status: record.status,
        attendanceToken: record.attendance_token,
        isFlagged: record.is_flagged,
        isLate,
        elapsedMinutes,
        punctualityNote,
      },
    });

  } catch (error: any) {
    console.error("Clock-in error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while recording attendance. Please try again." },
      { status: 500 }
    );
  }
}

