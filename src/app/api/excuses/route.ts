import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { AttendanceStatus, ExcuseStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") as ExcuseStatus | null;
    const courseIdParam = searchParams.get("courseId");

    const whereClause: any = {};
    if (statusParam) whereClause.status = statusParam;

    if (user?.role === "LECTURER") {
      // Show excuses for courses taught by lecturer
      whereClause.session = {
        course: { lecturer_id: user.userId },
      };
    } else if (user?.role === "STUDENT" && user.studentId) {
      whereClause.student_id = user.studentId;
    }

    if (courseIdParam) {
      whereClause.session = {
        ...(whereClause.session || {}),
        course_id: courseIdParam,
      };
    }

    const excuses = await prisma.excuseRequest.findMany({
      where: whereClause,
      include: {
        student: true,
        session: {
          include: {
            course: true,
            lecturer: { select: { name: true } },
          },
        },
        reviewer: { select: { name: true } },
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ excuses });
  } catch (error) {
    console.error("Fetch excuses error:", error);
    return NextResponse.json({ error: "Failed to fetch excuse requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { sessionId, reason, documentUrl, matricNumber } = await req.json();

    if (!sessionId || !reason) {
      return NextResponse.json(
        { error: "Session and reason for excuse are required." },
        { status: 400 }
      );
    }

    let studentId = user?.studentId;
    if (!studentId && matricNumber) {
      const student = await prisma.studentProfile.findUnique({
        where: { matric_number: matricNumber.trim().toUpperCase() },
      });
      if (student) studentId = student.id;
    }

    if (!studentId) {
      return NextResponse.json(
        { error: "Student identification required. Please sign in." },
        { status: 401 }
      );
    }

    const excuse = await prisma.excuseRequest.create({
      data: {
        student_id: studentId,
        session_id: sessionId,
        reason: reason.trim(),
        document_url: documentUrl?.trim() || null,
        status: ExcuseStatus.PENDING,
      },
      include: {
        student: true,
        session: { include: { course: true } },
      },
    });

    await logAudit({
      actorId: user?.userId,
      actorName: user?.name || excuse.student.full_name,
      action: "EXCUSE_SUBMITTED",
      entityType: "ExcuseRequest",
      entityId: excuse.id,
      newValue: { course: excuse.session.course.course_code, reason },
    });

    return NextResponse.json({ success: true, excuse });
  } catch (error) {
    console.error("Excuse submit error:", error);
    return NextResponse.json({ error: "Failed to submit excuse request" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "LECTURER" && user.role !== "HOD" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Only lecturers/HODs can review excuse requests." }, { status: 403 });
    }

    const { excuseId, status, reviewerNotes } = await req.json();

    if (!excuseId || !status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid excuse review parameters." }, { status: 400 });
    }

    const excuse = await prisma.excuseRequest.findUnique({
      where: { id: excuseId },
      include: { student: true, session: { include: { course: true } } },
    });

    if (!excuse) {
      return NextResponse.json({ error: "Excuse request not found." }, { status: 404 });
    }

    const oldStatus = excuse.status;

    // Update Excuse status
    const updatedExcuse = await prisma.excuseRequest.update({
      where: { id: excuseId },
      data: {
        status: status as ExcuseStatus,
        reviewed_by: user.userId,
        reviewed_at: new Date(),
        reviewer_notes: reviewerNotes?.trim() || null,
      },
    });

    // If approved, update or create AttendanceRecord marked as EXCUSED
    if (status === "APPROVED") {
      await prisma.attendanceRecord.upsert({
        where: {
          session_id_matric_number: {
            session_id: excuse.session_id,
            matric_number: excuse.student.matric_number,
          },
        },
        update: {
          status: AttendanceStatus.EXCUSED,
          notes: `Excuse approved by ${user.name}: ${reviewerNotes || "Approved medical/official excuse"}`,
        },
        create: {
          session_id: excuse.session_id,
          student_id: excuse.student_id,
          matric_number: excuse.student.matric_number,
          full_name: excuse.student.full_name,
          status: AttendanceStatus.EXCUSED,
          attendance_token: "EXCUSED",
          notes: `Excuse approved by ${user.name}: ${reviewerNotes || "Approved medical/official excuse"}`,
        },
      });
    }

    await logAudit({
      actorId: user.userId,
      actorName: user.name,
      action: status === "APPROVED" ? "EXCUSE_APPROVED" : "EXCUSE_REJECTED",
      entityType: "ExcuseRequest",
      entityId: excuse.id,
      oldValue: { status: oldStatus },
      newValue: { status, reviewerNotes },
    });

    return NextResponse.json({ success: true, excuse: updatedExcuse });
  } catch (error) {
    console.error("Excuse review error:", error);
    return NextResponse.json({ error: "Failed to update excuse request" }, { status: 500 });
  }
}
