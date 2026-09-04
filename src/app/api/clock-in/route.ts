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

    const cleanMatric = matricNumber.trim().toUpperCase().replace(/\s*\/\s*/g, "/");
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

    const parseTimestamp = (ts: any): number => {
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
    };

    if (session.status === "CLOSED") {
      return NextResponse.json(
        { error: "This lecture session has already been closed by the lecturer." },
        { status: 403 }
      );
    }

    // 1. Strict 20-Minute Attendance Window from Lecture Start Time
    const nowTime = Date.now();
    const sessionStartTimeMs = parseTimestamp(session.opened_at);
    const sessionStartTime = new Date(sessionStartTimeMs);
    const elapsedMinutesFromStart = (nowTime - sessionStartTimeMs) / (1000 * 60);

    // Both QR code and unique word expire strictly 20 minutes after lecture officially started
    if (elapsedMinutesFromStart > 20) {
      const startTimeWAT = sessionStartTime.toLocaleTimeString("en-NG", {
        timeZone: "Africa/Lagos",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      return NextResponse.json(
        {
          error: `Attendance Locked! This lecture officially started at ${startTimeWAT} (WAT). Both the unique QR code and class secret word expire strictly 20 minutes after class start. You arrived ${Math.round(
            elapsedMinutesFromStart
          )} minutes after start and can no longer clock in.`,
        },
        { status: 403 }
      );
    }

    // 2. Factor 1: Physical QR Code Scan Verification
    // A student MUST physically scan the signed QR code from the lecturer's phone
    const cleanQrToken = (qrToken || "").trim();
    if (!cleanQrToken) {
      return NextResponse.json(
        {
          error: "QR Code Scan Required! You must physically scan the QR code displayed on your lecturer's phone to clock in. Getting the unique word without scanning the in-class QR code is not permitted.",
        },
        { status: 403 }
      );
    }

    const isValidQr = verifySessionQrToken(session.id, cleanQrToken);
    if (!isValidQr) {
      return NextResponse.json(
        {
          error: "Invalid or Expired QR Code! Please physically scan the active QR code displayed on your lecturer's phone.",
        },
        { status: 403 }
      );
    }

    // 3. Factor 2: Class Unique Word (Announced Verbally by Lecturer in Physical Class)
    const rawSecret = (session.qr_token || "").trim();
    let requiredSecretWord = rawSecret;
    if (rawSecret.startsWith("{")) {
      try {
        const parsed = JSON.parse(rawSecret);
        requiredSecretWord = parsed.secretWord || rawSecret;
      } catch {}
    }
    const cleanRequiredWord = requiredSecretWord.trim().toUpperCase();
    const providedWord = (secretWord || "").trim().toUpperCase();

    if (!providedWord) {
      return NextResponse.json(
        {
          error: "Class Unique Word Required! Please enter the unique word announced verbally by your lecturer in class.",
        },
        { status: 400 }
      );
    }

    if (cleanRequiredWord && !cleanRequiredWord.startsWith("TOKEN-") && providedWord !== cleanRequiredWord) {
      return NextResponse.json(
        {
          error: "Invalid Class Unique Word! You must enter the exact unique word announced by your lecturer in class.",
        },
        { status: 403 }
      );
    }

    // 4. Client IP Extraction & Strict Single-IP Enforcement
    // "no same ip cant be used twice for the same session"
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : req.headers.get("x-real-ip") || "127.0.0.1";

    const { data: existingIpRecord } = await supabase
      .from("AttendanceRecord")
      .select("id, matric_number")
      .eq("session_id", session.id)
      .eq("ip_address", ipAddress)
      .maybeSingle();

    if (existingIpRecord) {
      return NextResponse.json(
        {
          error: `Proxy Attendance Blocked! An attendance record has already been submitted from this IP address (${ipAddress}) for this session (Student: ${existingIpRecord.matric_number}). Each student must use their own personal device and mobile network. Multiple clock-ins from the same IP are strictly prohibited.`,
        },
        { status: 403 }
      );
    }

    // 5. Real-time Matric Validation & Universal Acceptance
    let { data: student } = await supabase
      .from("StudentProfile")
      .select("*, enrollments:Enrollment(*)")
      .eq("matric_number", cleanMatric)
      .maybeSingle();

    // Auto-create student profile if matric is new
    if (!student) {
      const isCsc2023 = cleanMatric.includes("CSC/2023") || cleanMatric.includes("2023");
      const { data: newStudent } = await supabase
        .from("StudentProfile")
        .insert({
          matric_number: cleanMatric,
          full_name: cleanName,
          level: isCsc2023 ? "300L" : "300L",
        })
        .select("*, enrollments:Enrollment(*)")
        .maybeSingle();

      student = newStudent;
      if (!student) {
        const { data: retryStudent } = await supabase
          .from("StudentProfile")
          .select("*, enrollments:Enrollment(*)")
          .eq("matric_number", cleanMatric)
          .maybeSingle();
        student = retryStudent;
      }
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

    // 6. Duplicate Student Matric Prevention
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

    // 7. Automatic Punctuality & Late Categorization
    const elapsedMinutes = Math.max(0, Math.round(elapsedMinutesFromStart));
    const lateThreshold = session.late_threshold_minutes || 15;
    const isLate = elapsedMinutes > lateThreshold;
    const status: AttendanceStatus = isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;

    const punctualityNote = isLate
      ? `Late (+${elapsedMinutes - lateThreshold}m past threshold; +${elapsedMinutes}m from start)`
      : `On-Time / Early (+${elapsedMinutes}m from start)`;

    // 8. Device Fingerprint Logging
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

    // 9. Optional Campus Geofence Validation
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

    // 10. Generate 6-Character Unique Attendance Token
    const attendanceToken = generateAttendanceToken();

    // 11. Save Attendance Record to Supabase with Punctuality Tracking
    const submissionTime = new Date().toISOString();
    const { data: record, error: insertError } = await supabase
      .from("AttendanceRecord")
      .insert({
        session_id: session.id,
        student_id: student.id,
        matric_number: cleanMatric,
        full_name: cleanName,
        status,
        clock_in_time: submissionTime,
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

