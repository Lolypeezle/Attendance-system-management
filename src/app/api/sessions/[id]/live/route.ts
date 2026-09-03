import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        course: {
          include: {
            enrollments: {
              include: { student: true },
            },
          },
        },
        lecturer: { select: { id: true, name: true, email: true } },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Auto-close check
    const elapsedMinutes = (Date.now() - new Date(session.opened_at).getTime()) / (1000 * 60);
    if (session.status === "OPEN" && elapsedMinutes > session.duration_minutes) {
      await prisma.session.update({
        where: { id: session.id },
        data: { status: "CLOSED", closed_at: new Date() },
      });
      session.status = "CLOSED";
    }

    // Attendance records for this session
    const records = await prisma.attendanceRecord.findMany({
      where: { session_id: sessionId },
      include: {
        student: true,
      },
      orderBy: { clock_in_time: "desc" },
    });

    const enrolledStudents = session.course.enrollments.map((e) => e.student);
    const totalEnrolled = enrolledStudents.length;

    const presentCount = records.filter((r) => r.status === "PRESENT").length;
    const lateCount = records.filter((r) => r.status === "LATE").length;
    const excusedCount = records.filter((r) => r.status === "EXCUSED").length;
    const flaggedCount = records.filter((r) => r.is_flagged).length;

    // Clocked-in student IDs
    const clockedInStudentIds = new Set(records.map((r) => r.student_id));

    // Not yet clocked in
    const unclockedStudents = enrolledStudents.filter(
      (s) => !clockedInStudentIds.has(s.id)
    );

    const remainingMinutes = Math.max(
      0,
      Math.round(session.duration_minutes - elapsedMinutes)
    );

    return NextResponse.json({
      session: {
        id: session.id,
        courseId: session.course.id,
        courseCode: session.course.course_code,
        courseTitle: session.course.course_title,
        level: session.course.level,
        lecturerName: session.lecturer.name,
        openedAt: session.opened_at,
        closedAt: session.closed_at,
        durationMinutes: session.duration_minutes,
        lateThresholdMinutes: session.late_threshold_minutes,
        requireQr: session.require_qr,
        requireGeo: session.require_geo,
        qrToken: session.qr_token,
        status: session.status,
        remainingMinutes,
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
      unclockedStudents: unclockedStudents.map((s) => ({
        id: s.id,
        matricNumber: s.matric_number,
        fullName: s.full_name,
        level: s.level,
      })),
    });
  } catch (error) {
    console.error("Live session fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch live session data" }, { status: 500 });
  }
}
