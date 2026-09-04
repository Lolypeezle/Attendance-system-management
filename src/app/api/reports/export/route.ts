import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get("type") || "course"; // course, student, at-risk, department, session-sheet
    const format = searchParams.get("format") || "json"; // json, csv, xlsx
    const courseId = searchParams.get("courseId");
    const sessionId = searchParams.get("sessionId");

    let rows: any[] = [];
    let filename = `fuoye-sams-${reportType}-${Date.now()}`;

    // 1. PER-COURSE REPORT
    if (reportType === "course" && courseId) {
      const { data: course } = await supabase
        .from("Course")
        .select(`
          *,
          lecturer:User(name),
          sessions:Session(*),
          enrollments:Enrollment(*, student:StudentProfile(*))
        `)
        .eq("id", courseId)
        .maybeSingle();

      if (!course) {
        return NextResponse.json({ error: "Course not found" }, { status: 404 });
      }

      filename = `${course.course_code}_Attendance_Report`;

      const courseSessions = course.sessions || [];
      const sessionIds = courseSessions.map((s: any) => s.id);
      const totalSessions = courseSessions.length;

      const { data: allRecords } = await supabase
        .from("AttendanceRecord")
        .select("*")
        .in("session_id", sessionIds.length > 0 ? sessionIds : ["none"]);

      const records = allRecords || [];

      // For every enrolled student, compute stats & breakdown
      for (const en of course.enrollments || []) {
        const student = en.student;
        if (!student) continue;

        const studentRecords = records.filter((r: any) => r.student_id === student.id);
        const presentCount = studentRecords.filter(
          (r: any) => r.status === "PRESENT" || r.status === "LATE" || r.status === "EXCUSED"
        ).length;
        const percentage = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 100;

        rows.push({
          "Matric Number": student.matric_number,
          "Full Name": student.full_name,
          "Level": student.level,
          "Course Code": course.course_code,
          "Course Title": course.course_title,
          "Total Sessions Held": totalSessions,
          "Total Attended": presentCount,
          "Attendance Rate (%)": `${percentage}%`,
          "Status": percentage < 70 ? "AT RISK (BARRED)" : percentage < 75 ? "WARNING" : "GOOD",
        });
      }
    }

    // 2. AT-RISK STUDENTS REPORT (<70%)
    else if (reportType === "at-risk") {
      filename = `FUOYE_CSC_At_Risk_Students_Report`;
      const [coursesRes, sessionsRes, attendanceRes, enrollmentsRes] = await Promise.all([
        supabase.from("Course").select("*"),
        supabase.from("Session").select("*"),
        supabase.from("AttendanceRecord").select("*"),
        supabase.from("Enrollment").select("*, student:StudentProfile(*)"),
      ]);

      const courses = coursesRes.data || [];
      const sessions = sessionsRes.data || [];
      const records = attendanceRes.data || [];
      const enrollments = enrollmentsRes.data || [];

      for (const c of courses) {
        const courseSessions = sessions.filter((s: any) => s.course_id === c.id);
        const totalSessions = courseSessions.length;
        if (totalSessions === 0) continue;

        const sessionIds = new Set(courseSessions.map((s: any) => s.id));
        const courseEnrollments = enrollments.filter((en: any) => en.course_id === c.id);

        for (const en of courseEnrollments) {
          const student = en.student;
          if (!student) continue;

          const studentRecords = records.filter(
            (r: any) => sessionIds.has(r.session_id) && r.student_id === student.id
          );

          const presentCount = studentRecords.filter(
            (r: any) => r.status === "PRESENT" || r.status === "LATE" || r.status === "EXCUSED"
          ).length;
          const percentage = Math.round((presentCount / totalSessions) * 100);

          if (percentage < 70) {
            rows.push({
              "Matric Number": student.matric_number,
              "Student Name": student.full_name,
              "Level": student.level,
              "Course Code": c.course_code,
              "Course Title": c.course_title,
              "Sessions Attended": `${presentCount}/${totalSessions}`,
              "Attendance Rate": `${percentage}%`,
              "Deficit (Absences)": totalSessions - presentCount,
              "Academic Standing": "DISQUALIFIED / BARRED FROM EXAM",
            });
          }
        }
      }
    }

    // 3. DEPARTMENT-WIDE SUMMARY REPORT
    else if (reportType === "department") {
      filename = `FUOYE_CSC_Semester_Departmental_Attendance`;
      const [studentsRes, enrollmentsRes, sessionsRes, recordsRes] = await Promise.all([
        supabase.from("StudentProfile").select("*"),
        supabase.from("Enrollment").select("*"),
        supabase.from("Session").select("*"),
        supabase.from("AttendanceRecord").select("*"),
      ]);

      const students = studentsRes.data || [];
      const enrollments = enrollmentsRes.data || [];
      const sessions = sessionsRes.data || [];
      const records = recordsRes.data || [];

      for (const s of students) {
        const studentEnrollments = enrollments.filter((en: any) => en.student_id === s.id);
        let totalPossible = 0;
        let totalAttended = 0;

        for (const en of studentEnrollments) {
          const courseSessions = sessions.filter((sess: any) => sess.course_id === en.course_id);
          totalPossible += courseSessions.length;
          const sessionIds = new Set(courseSessions.map((sess: any) => sess.id));

          const attended = records.filter(
            (r: any) =>
              r.student_id === s.id &&
              sessionIds.has(r.session_id) &&
              (r.status === "PRESENT" || r.status === "LATE" || r.status === "EXCUSED")
          ).length;
          totalAttended += attended;
        }

        const rate = totalPossible > 0 ? Math.round((totalAttended / totalPossible) * 100) : 100;

        rows.push({
          "Matric Number": s.matric_number,
          "Full Name": s.full_name,
          "Level": s.level,
          "Courses Enrolled": studentEnrollments.length,
          "Overall Attendance (%)": `${rate}%`,
          "Status": rate < 70 ? "AT RISK" : rate < 75 ? "WARNING" : "NORMAL",
        });
      }
    }

    // 4. PRINTABLE SESSION SIGN-IN SHEET DATA
    else if (reportType === "session-sheet" && sessionId) {
      const { data: session } = await supabase
        .from("Session")
        .select(`
          *,
          course:Course(*),
          lecturer:User(name)
        `)
        .eq("id", sessionId)
        .maybeSingle();

      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      filename = `FUOYE_${session.course?.course_code}_Session_SignIn_Sheet`;

      const [enrollmentsRes, recordsRes] = await Promise.all([
        supabase
          .from("Enrollment")
          .select("*, student:StudentProfile(*)")
          .eq("course_id", session.course_id),
        supabase
          .from("AttendanceRecord")
          .select("*")
          .eq("session_id", sessionId),
      ]);

      const enrollments = enrollmentsRes.data || [];
      const records = recordsRes.data || [];
      const recordMap = new Map();
      records.forEach((r: any) => {
        recordMap.set(r.matric_number, r);
      });

      for (const en of enrollments) {
        const student = en.student;
        if (!student) continue;
        const rec = recordMap.get(student.matric_number);

        rows.push({
          "Matric Number": student.matric_number,
          "Full Name": student.full_name,
          "Level": student.level,
          "Clock-In Time": rec ? new Date(rec.clock_in_time).toLocaleTimeString() : "DID NOT CLOCK IN",
          "Status": rec ? rec.status : "ABSENT",
          "Verification Token": rec ? rec.attendance_token : "N/A",
          "Physical Signature": "",
        });
      }

      if (format === "json") {
        const lecturerData = Array.isArray(session.lecturer) ? session.lecturer[0] : session.lecturer;
        return NextResponse.json({
          sessionInfo: {
            courseCode: session.course?.course_code,
            courseTitle: session.course?.course_title,
            units: session.course?.units,
            level: session.course?.level,
            lecturerName: lecturerData?.name || "Lecturer",
            date: new Date(session.opened_at).toLocaleDateString("en-NG", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            time: new Date(session.opened_at).toLocaleTimeString("en-NG"),
          },
          students: rows,
        });
      }
    }

    // Export formats
    if (format === "csv") {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      return new NextResponse(csvOutput, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }

    if (format === "xlsx") {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

      return new NextResponse(excelBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
        },
      });
    }

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to generate report export" }, { status: 500 });
  }
}
