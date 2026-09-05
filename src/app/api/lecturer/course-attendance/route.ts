import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

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
    const courseId = searchParams.get("courseId");
    const sessionId = searchParams.get("sessionId");

    if (!courseId) {
      return NextResponse.json({ error: "courseId parameter is required." }, { status: 400 });
    }

    // 1. Fetch Course Information
    const { data: course, error: courseErr } = await supabase
      .from("Course")
      .select(`
        id,
        course_code,
        course_title,
        units,
        level,
        lecturer_id,
        lecturer:User(id, name, email)
      `)
      .eq("id", courseId)
      .maybeSingle();

    if (courseErr || !course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    // 2. Fetch All Sessions for this Course
    const { data: sessions, error: sessErr } = await supabase
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
        status
      `)
      .eq("course_id", courseId)
      .order("opened_at", { ascending: false });

    if (sessErr) {
      console.error("Error fetching course sessions:", sessErr);
    }

    const courseSessions = sessions || [];
    const allSessionIds = courseSessions.map((s: any) => s.id);

    // If a specific session filter is applied:
    const targetSessionIds = sessionId && sessionId !== "ALL"
      ? [sessionId]
      : allSessionIds;

    const totalSessionsHeld = courseSessions.length;

    // 3. Fetch All Attendance Records for Target Sessions
    let records: any[] = [];
    if (targetSessionIds.length > 0) {
      const { data: attendanceData, error: attErr } = await supabase
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
        .in("session_id", targetSessionIds)
        .order("clock_in_time", { ascending: false });

      if (attErr) {
        console.error("Error fetching attendance records:", attErr);
      } else {
        records = attendanceData || [];
      }
    }

    // 4. Fetch Enrolled Students for this Course (Optional cross-check)
    const { data: enrollments } = await supabase
      .from("Enrollment")
      .select(`
        student_id,
        student:StudentProfile(id, full_name, matric_number, level, email)
      `)
      .eq("course_id", courseId);

    // Build session map for fast lookup
    const sessionMap = new Map<string, any>();
    courseSessions.forEach((s: any) => {
      let secretWord = (s.qr_token || "").trim();
      if (secretWord.startsWith("{")) {
        try {
          const parsed = JSON.parse(secretWord);
          secretWord = parsed.secretWord || secretWord;
        } catch {}
      }
      sessionMap.set(s.id, {
        ...s,
        secretWord: secretWord.toUpperCase(),
      });
    });

    // 5. Aggregate Clocked-In Students
    const studentMap = new Map<string, any>();

    // First process all actual clock-in records
    for (const rec of records) {
      const cleanMatric = (rec.matric_number || "").trim().toUpperCase().replace(/\s*\/\s*/g, "/");
      const cleanName = (rec.full_name || "").trim();
      const sess = sessionMap.get(rec.session_id);

      if (!studentMap.has(cleanMatric)) {
        studentMap.set(cleanMatric, {
          matricNumber: cleanMatric,
          fullName: cleanName || cleanMatric,
          studentId: rec.student_id,
          timesClockedIn: 0,
          presentCount: 0,
          lateCount: 0,
          excusedCount: 0,
          isFlaggedAny: false,
          flagReasons: [] as string[],
          lastClockInTime: rec.clock_in_time,
          records: [] as any[],
        });
      }

      const st = studentMap.get(cleanMatric);

      // Keep latest clock-in timestamp
      if (!st.lastClockInTime || new Date(rec.clock_in_time) > new Date(st.lastClockInTime)) {
        st.lastClockInTime = rec.clock_in_time;
      }

      if (rec.status === "PRESENT") st.presentCount += 1;
      else if (rec.status === "LATE") st.lateCount += 1;
      else if (rec.status === "EXCUSED") st.excusedCount += 1;

      st.timesClockedIn += 1;

      if (rec.is_flagged) {
        st.isFlaggedAny = true;
        if (rec.flag_reason) st.flagReasons.push(rec.flag_reason);
      }

      st.records.push({
        id: rec.id,
        sessionId: rec.session_id,
        sessionDate: sess?.opened_at || null,
        secretWord: sess?.secretWord || "N/A",
        status: rec.status,
        clockInTime: rec.clock_in_time,
        attendanceToken: rec.attendance_token,
        isFlagged: rec.is_flagged,
        flagReason: rec.flag_reason,
      });
    }

    // Optionally include enrolled students who haven't clocked in yet
    for (const en of (enrollments || []) as any[]) {
      const profile = Array.isArray(en.student) ? en.student[0] : en.student;
      if (!profile) continue;
      const cleanMatric = (profile.matric_number || "").trim().toUpperCase().replace(/\s*\/\s*/g, "/");
      if (!cleanMatric) continue;

      if (!studentMap.has(cleanMatric)) {
        studentMap.set(cleanMatric, {
          matricNumber: cleanMatric,
          fullName: profile.full_name || cleanMatric,
          studentId: profile.id,
          timesClockedIn: 0,
          presentCount: 0,
          lateCount: 0,
          excusedCount: 0,
          isFlaggedAny: false,
          flagReasons: [],
          lastClockInTime: null,
          records: [],
          isEnrolledNotClocked: true,
        });
      }
    }

    // Convert map to sorted student array
    const effectiveTotalSessions = sessionId && sessionId !== "ALL" ? 1 : totalSessionsHeld;

    const studentList = Array.from(studentMap.values()).map((s: any) => {
      const attendancePercentage = effectiveTotalSessions > 0
        ? Math.round((s.timesClockedIn / effectiveTotalSessions) * 100)
        : 100;

      let status = "GOOD";
      if (s.timesClockedIn === 0) {
        status = "NOT_CLOCKED_IN";
      } else if (attendancePercentage < 70) {
        status = "AT_RISK"; // FUOYE minimum exam eligibility is 70%
      } else if (attendancePercentage < 75) {
        status = "WARNING";
      }

      return {
        ...s,
        totalSessionsHeld: effectiveTotalSessions,
        attendancePercentage,
        status,
        records: s.records.sort((a: any, b: any) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime()),
      };
    });

    // Sort students: those who clocked in first (by count desc), then by full name
    studentList.sort((a, b) => {
      if (b.timesClockedIn !== a.timesClockedIn) {
        return b.timesClockedIn - a.timesClockedIn;
      }
      return a.fullName.localeCompare(b.fullName);
    });

    // Add 1-based index (S/N)
    const indexedStudents = studentList.map((st, idx) => ({
      sn: idx + 1,
      ...st,
    }));

    // Formatted session list for dropdown filtering
    const sessionListFormatted = courseSessions.map((s: any) => {
      const sessObj = sessionMap.get(s.id);
      const sessionRecords = records.filter((r) => r.session_id === s.id);
      return {
        id: s.id,
        openedAt: s.opened_at,
        durationMinutes: s.duration_minutes,
        secretWord: sessObj.secretWord,
        status: s.status,
        clockedInCount: sessionRecords.length,
      };
    });

    const clockedInStudentsOnly = indexedStudents.filter((s) => s.timesClockedIn > 0);

    const lecturerObj = Array.isArray((course as any).lecturer)
      ? (course as any).lecturer[0]
      : (course as any).lecturer;

    return NextResponse.json({
      course: {
        id: course.id,
        courseCode: course.course_code,
        courseTitle: course.course_title,
        units: course.units,
        level: course.level,
        lecturerName: lecturerObj?.name || "Faculty Lecturer",
      },
      stats: {
        totalSessionsHeld,
        totalClockedInStudents: clockedInStudentsOnly.length,
        totalEnrolledStudents: (enrollments || []).length || studentList.length,
        totalRecords: records.length,
      },
      sessions: sessionListFormatted,
      students: indexedStudents,
      clockedInCount: clockedInStudentsOnly.length,
      activeSessionId: sessionId || "ALL",
    });
  } catch (error: any) {
    console.error("Course attendance API error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load course attendance roster." },
      { status: 500 }
    );
  }
}
