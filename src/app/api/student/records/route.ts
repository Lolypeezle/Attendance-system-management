import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const matricParam = searchParams.get("matric");

    // Students are not permitted to inspect attendance history
    if (user?.role === "STUDENT") {
      return NextResponse.json(
        { error: "Attendance history is restricted to Department Administration." },
        { status: 403 }
      );
    }

    let studentProfile: any = null;

    if (user?.studentId) {
      const { data } = await supabase
        .from("StudentProfile")
        .select(`
          id, full_name, matric_number, level, email,
          enrollments:Enrollment(
            course_id,
            course:Course(id, course_code, course_title, units, lecturer:User(id, name))
          )
        `)
        .eq("id", user.studentId)
        .maybeSingle();
      studentProfile = data;
    } else if (matricParam) {
      const { data } = await supabase
        .from("StudentProfile")
        .select(`
          id, full_name, matric_number, level, email,
          enrollments:Enrollment(
            course_id,
            course:Course(id, course_code, course_title, units, lecturer:User(id, name))
          )
        `)
        .eq("matric_number", matricParam.trim().toUpperCase())
        .maybeSingle();
      studentProfile = data;
    } else if (user) {
      const { data } = await supabase
        .from("StudentProfile")
        .select(`
          id, full_name, matric_number, level, email,
          enrollments:Enrollment(
            course_id,
            course:Course(id, course_code, course_title, units, lecturer:User(id, name))
          )
        `)
        .limit(1)
        .maybeSingle();
      studentProfile = data;
    }

    if (!studentProfile) {
      return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
    }

    // Fetch all attendance records for this student from Supabase
    const { data: attendanceRecordsData } = await supabase
      .from("AttendanceRecord")
      .select(`
        id, session_id, student_id, matric_number, full_name, status,
        clock_in_time, attendance_token, is_flagged, flag_reason, notes,
        session:Session(
          course_id,
          course:Course(id, course_code, course_title),
          lecturer:User(name)
        )
      `)
      .eq("student_id", studentProfile.id)
      .order("clock_in_time", { ascending: false });

    const attendanceRecords = attendanceRecordsData || [];

    // Fetch excuses from Supabase
    const { data: excusesData } = await supabase
      .from("ExcuseRequest")
      .select(`
        id, session_id, reason, status, document_url, reviewer_notes, created_at,
        session:Session(course:Course(course_code))
      `)
      .eq("student_id", studentProfile.id)
      .order("created_at", { ascending: false });

    const excuses = excusesData || [];
    const enrollments = Array.isArray(studentProfile.enrollments) ? studentProfile.enrollments : [];

    // Calculate per-course statistics
    const courseStats = await Promise.all(
      enrollments.map(async (en: any) => {
        const { count: sessionCount } = await supabase
          .from("Session")
          .select("id", { count: "exact", head: true })
          .eq("course_id", en.course_id);

        const totalSessions = sessionCount || 0;
        const studentRecordsForCourse = attendanceRecords.filter(
          (rec: any) => rec.session?.course_id === en.course_id
        );

        const presentCount = studentRecordsForCourse.filter(
          (r: any) => r.status === "PRESENT" || r.status === "LATE" || r.status === "EXCUSED"
        ).length;

        const lateCount = studentRecordsForCourse.filter((r: any) => r.status === "LATE").length;
        const absentCount = totalSessions - presentCount;

        const percentage =
          totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 100;

        return {
          courseId: en.course?.id,
          courseCode: en.course?.course_code,
          courseTitle: en.course?.course_title,
          units: en.course?.units,
          lecturerName: en.course?.lecturer?.name || "Unassigned",
          totalSessions,
          attendedSessions: presentCount,
          lateSessions: lateCount,
          absentSessions: Math.max(0, absentCount),
          percentage,
          isAtRisk: percentage < 70,
          isWarning: percentage >= 70 && percentage < 75,
        };
      })
    );

    // Calculate overall attendance rate
    const totalPossibleSessions = courseStats.reduce((acc, c) => acc + c.totalSessions, 0);
    const totalAttendedSessions = courseStats.reduce((acc, c) => acc + c.attendedSessions, 0);
    const overallRate =
      totalPossibleSessions > 0
        ? Math.round((totalAttendedSessions / totalPossibleSessions) * 100)
        : 100;

    return NextResponse.json({
      student: {
        id: studentProfile.id,
        fullName: studentProfile.full_name,
        matricNumber: studentProfile.matric_number,
        level: studentProfile.level,
        email: studentProfile.email,
      },
      overallRate,
      courseStats,
      attendanceRecords: attendanceRecords.map((r: any) => ({
        id: r.id,
        sessionId: r.session_id,
        courseCode: r.session?.course?.course_code,
        courseTitle: r.session?.course?.course_title,
        lecturerName: r.session?.lecturer?.name,
        clockInTime: r.clock_in_time,
        status: r.status,
        attendanceToken: r.attendance_token,
        isFlagged: r.is_flagged,
      })),
      excuses: excuses.map((e: any) => ({
        id: e.id,
        courseCode: e.session?.course?.course_code,
        reason: e.reason,
        status: e.status,
        documentUrl: e.document_url,
        reviewerNotes: e.reviewer_notes,
        createdAt: e.created_at,
      })),
    });
  } catch (error: any) {
    console.error("Student desk error:", error);
    return NextResponse.json({ error: "Failed to fetch student data." }, { status: 500 });
  }
}
