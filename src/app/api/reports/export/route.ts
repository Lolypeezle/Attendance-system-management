import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get("type") || "course"; // course, student, at-risk, department, session-sheet
    const format = searchParams.get("format") || "json"; // json, csv, xlsx
    const courseId = searchParams.get("courseId");
    const sessionId = searchParams.get("sessionId");
    const studentMatric = searchParams.get("matric");

    let rows: any[] = [];
    let filename = `fuoye-sams-${reportType}-${Date.now()}`;

    // 1. PER-COURSE REPORT
    if (reportType === "course" && courseId) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
          lecturer: true,
          sessions: { orderBy: { opened_at: "asc" } },
          enrollments: { include: { student: true } },
        },
      });

      if (!course) {
        return NextResponse.json({ error: "Course not found" }, { status: 404 });
      }

      filename = `${course.course_code}_Attendance_Report`;

      // For every enrolled student, compute stats & per-session breakdown
      for (const en of course.enrollments) {
        const student = en.student;
        const records = await prisma.attendanceRecord.findMany({
          where: {
            student_id: student.id,
            session: { course_id: course.id },
          },
        });

        const totalSessions = course.sessions.length;
        const presentCount = records.filter((r) => r.status === "PRESENT" || r.status === "LATE" || r.status === "EXCUSED").length;
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
      const courses = await prisma.course.findMany({
        include: {
          sessions: true,
          enrollments: { include: { student: true } },
        },
      });

      for (const c of courses) {
        const totalSessions = c.sessions.length;
        if (totalSessions === 0) continue;

        for (const en of c.enrollments) {
          const records = await prisma.attendanceRecord.findMany({
            where: {
              student_id: en.student_id,
              session: { course_id: c.id },
            },
          });

          const presentCount = records.filter((r) => r.status === "PRESENT" || r.status === "LATE" || r.status === "EXCUSED").length;
          const percentage = Math.round((presentCount / totalSessions) * 100);

          if (percentage < 70) {
            rows.push({
              "Matric Number": en.student.matric_number,
              "Student Name": en.student.full_name,
              "Level": en.student.level,
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
      const students = await prisma.studentProfile.findMany({
        include: {
          enrollments: { include: { course: { include: { sessions: true } } } },
        },
      });

      for (const s of students) {
        let totalPossible = 0;
        let totalAttended = 0;

        for (const en of s.enrollments) {
          const sessionsCount = en.course.sessions.length;
          totalPossible += sessionsCount;

          const attended = await prisma.attendanceRecord.count({
            where: {
              student_id: s.id,
              session: { course_id: en.course_id },
              status: { in: ["PRESENT", "LATE", "EXCUSED"] },
            },
          });
          totalAttended += attended;
        }

        const rate = totalPossible > 0 ? Math.round((totalAttended / totalPossible) * 100) : 100;

        rows.push({
          "Matric Number": s.matric_number,
          "Full Name": s.full_name,
          "Level": s.level,
          "Courses Enrolled": s.enrollments.length,
          "Overall Attendance (%)": `${rate}%`,
          "Status": rate < 70 ? "AT RISK" : rate < 75 ? "WARNING" : "NORMAL",
        });
      }
    }

    // 4. PRINTABLE SESSION SIGN-IN SHEET DATA
    else if (reportType === "session-sheet" && sessionId) {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          course: {
            include: { enrollments: { include: { student: true } } },
          },
          lecturer: true,
          attendance_records: true,
        },
      });

      if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      filename = `FUOYE_${session.course.course_code}_Session_SignIn_Sheet`;

      const recordMap = new Map();
      session.attendance_records.forEach((r) => {
        recordMap.set(r.matric_number, r);
      });

      for (const en of session.course.enrollments) {
        const student = en.student;
        const rec = recordMap.get(student.matric_number);

        rows.push({
          "Matric Number": student.matric_number,
          "Full Name": student.full_name,
          "Level": student.level,
          "Clock-In Time": rec ? new Date(rec.clock_in_time).toLocaleTimeString() : "DID NOT CLOCK IN",
          "Status": rec ? rec.status : "ABSENT",
          "Verification Token": rec ? rec.attendance_token : "N/A",
          "Physical Signature": "", // Blank for physical signature
        });
      }

      if (format === "json") {
        return NextResponse.json({
          sessionInfo: {
            courseCode: session.course.course_code,
            courseTitle: session.course.course_title,
            units: session.course.units,
            level: session.course.level,
            lecturerName: session.lecturer.name,
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
