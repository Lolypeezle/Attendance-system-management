import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    // Students are not permitted to inspect attendance history
    if (user?.role === "STUDENT") {
      return NextResponse.json(
        { error: "Attendance history is restricted to Department Administration." },
        { status: 403 }
      );
    }

      studentProfile = await prisma.studentProfile.findUnique({
        where: { id: user.studentId },
        include: {
          enrollments: {
            include: { course: { include: { lecturer: true } } },
          },
        },
      });
    } else if (matricParam) {
      studentProfile = await prisma.studentProfile.findUnique({
        where: { matric_number: matricParam.trim().toUpperCase() },
        include: {
          enrollments: {
            include: { course: { include: { lecturer: true } } },
          },
        },
      });
    } else if (user) {
      // Default to first student in db if testing as admin/lecturer without studentId
      studentProfile = await prisma.studentProfile.findFirst({
        include: {
          enrollments: {
            include: { course: { include: { lecturer: true } } },
          },
        },
      });
    }

    if (!studentProfile) {
      return NextResponse.json({ error: "Student profile not found." }, { status: 404 });
    }

    // Fetch all attendance records for this student
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: { student_id: studentProfile.id },
      include: {
        session: {
          include: {
            course: true,
            lecturer: { select: { name: true } },
          },
        },
      },
      orderBy: { clock_in_time: "desc" },
    });

    // Fetch student excuses
    const excuses = await prisma.excuseRequest.findMany({
      where: { student_id: studentProfile.id },
      include: {
        session: { include: { course: true } },
      },
      orderBy: { created_at: "desc" },
    });

    // Calculate per-course statistics
    const courseStats = await Promise.all(
      studentProfile.enrollments.map(async (en: any) => {
        const totalSessions = await prisma.session.count({
          where: { course_id: en.course_id },
        });

        const studentRecordsForCourse = attendanceRecords.filter(
          (rec) => rec.session.course_id === en.course_id
        );

        const presentCount = studentRecordsForCourse.filter(
          (r) => r.status === "PRESENT" || r.status === "LATE" || r.status === "EXCUSED"
        ).length;

        const lateCount = studentRecordsForCourse.filter((r) => r.status === "LATE").length;
        const absentCount = totalSessions - presentCount;

        const percentage =
          totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 100;

        return {
          courseId: en.course.id,
          courseCode: en.course.course_code,
          courseTitle: en.course.course_title,
          units: en.course.units,
          lecturerName: en.course.lecturer?.name || "Unassigned",
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
      attendanceRecords: attendanceRecords.map((r) => ({
        id: r.id,
        sessionId: r.session_id,
        courseCode: r.session.course.course_code,
        courseTitle: r.session.course.course_title,
        lecturerName: r.session.lecturer.name,
        clockInTime: r.clock_in_time,
        status: r.status,
        attendanceToken: r.attendance_token,
        isFlagged: r.is_flagged,
      })),
      excuses: excuses.map((e) => ({
        id: e.id,
        courseCode: e.session.course.course_code,
        reason: e.reason,
        status: e.status,
        documentUrl: e.document_url,
        reviewerNotes: e.reviewer_notes,
        createdAt: e.created_at,
      })),
    });
  } catch (error) {
    console.error("Student desk error:", error);
    return NextResponse.json({ error: "Failed to fetch student data." }, { status: 500 });
  }
}
