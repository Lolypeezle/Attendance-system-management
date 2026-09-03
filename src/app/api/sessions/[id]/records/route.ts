import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { AttendanceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

// Mark unclocked students absent
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "LECTURER" && user.role !== "HOD" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const sessionId = params.id;
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        course: {
          include: {
            enrollments: { include: { student: true } },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const existingRecords = await prisma.attendanceRecord.findMany({
      where: { session_id: sessionId },
      select: { student_id: true },
    });

    const clockedInStudentIds = new Set(existingRecords.map((r) => r.student_id));
    const unclocked = session.course.enrollments.filter(
      (e) => !clockedInStudentIds.has(e.student_id)
    );

    let createdCount = 0;
    for (const item of unclocked) {
      await prisma.attendanceRecord.create({
        data: {
          session_id: sessionId,
          student_id: item.student.id,
          matric_number: item.student.matric_number,
          full_name: item.student.full_name,
          status: AttendanceStatus.ABSENT,
          clock_in_time: new Date(),
          attendance_token: "ABSENT",
          notes: `Marked absent after session closed by ${user.name}`,
        },
      });
      createdCount++;
    }

    await logAudit({
      actorId: user.userId,
      actorName: user.name,
      action: "MARKED_STUDENTS_ABSENT",
      entityType: "Session",
      entityId: sessionId,
      newValue: { countMarkedAbsent: createdCount },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully recorded ${createdCount} absent student(s).`,
      createdCount,
    });
  } catch (error) {
    console.error("Mark absent error:", error);
    return NextResponse.json({ error: "Failed to mark absent students" }, { status: 500 });
  }
}

// Manual correction of attendance status with mandatory reason
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "LECTURER" && user.role !== "HOD" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const sessionId = params.id;
    const { recordId, newStatus, reason } = await req.json();

    if (!recordId || !newStatus || !reason || !reason.trim()) {
      return NextResponse.json(
        { error: "A valid record ID, new status, and justification reason are required." },
        { status: 400 }
      );
    }

    const record = await prisma.attendanceRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const oldStatus = record.status;

    const updated = await prisma.attendanceRecord.update({
      where: { id: recordId },
      data: {
        status: newStatus as AttendanceStatus,
        notes: `Corrected from ${oldStatus} to ${newStatus} by ${user.name}. Reason: ${reason.trim()}`,
      },
    });

    // Write immutable audit log
    await logAudit({
      actorId: user.userId,
      actorName: user.name,
      action: "MANUAL_STATUS_CORRECTION",
      entityType: "AttendanceRecord",
      entityId: recordId,
      oldValue: { status: oldStatus, matric: record.matric_number },
      newValue: { status: newStatus, reason: reason.trim() },
    });

    return NextResponse.json({
      success: true,
      record: updated,
    });
  } catch (error) {
    console.error("Manual correction error:", error);
    return NextResponse.json({ error: "Failed to correct attendance record" }, { status: 500 });
  }
}
