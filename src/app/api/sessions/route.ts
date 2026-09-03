import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { signSessionQrToken } from "@/lib/tokens";
import { logAudit } from "@/lib/audit";
import { SessionStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const courseId = searchParams.get("courseId");

    const whereClause: any = {};
    if (courseId) {
      whereClause.course_id = courseId;
    } else if (user?.role === "LECTURER") {
      whereClause.opened_by = user.userId;
    }

    const sessions = await prisma.session.findMany({
      where: whereClause,
      include: {
        course: true,
        lecturer: { select: { id: true, name: true, email: true } },
        _count: {
          select: { attendance_records: true },
        },
      },
      orderBy: { opened_at: "desc" },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Fetch sessions error:", error);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "LECTURER" && user.role !== "HOD" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized. Lecturer access required." }, { status: 403 });
    }

    const {
      courseId,
      durationMinutes = 60,
      lateThresholdMinutes = 15,
      requireQr = false,
      requireGeo = false,
    } = await req.json();

    if (!courseId) {
      return NextResponse.json({ error: "Please select a course to start a session." }, { status: 400 });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    // Check if there is already an active session for this course
    const activeExisting = await prisma.session.findFirst({
      where: {
        course_id: courseId,
        status: SessionStatus.OPEN,
      },
    });

    if (activeExisting) {
      return NextResponse.json(
        {
          error: `An active session is already open for ${course.course_code}. Please close it before opening a new one.`,
          existingSessionId: activeExisting.id,
        },
        { status: 409 }
      );
    }

    const session = await prisma.session.create({
      data: {
        course_id: courseId,
        opened_by: user.userId,
        duration_minutes: parseInt(durationMinutes, 10),
        late_threshold_minutes: parseInt(lateThresholdMinutes, 10),
        require_qr: Boolean(requireQr),
        require_geo: Boolean(requireGeo),
        qr_token: "",
        status: SessionStatus.OPEN,
      },
      include: {
        course: true,
        lecturer: { select: { id: true, name: true } },
      },
    });

    const expiresAt = Date.now() + durationMinutes * 60 * 1000;
    const qrToken = signSessionQrToken(session.id, expiresAt);

    await prisma.session.update({
      where: { id: session.id },
      data: { qr_token: qrToken },
    });
    session.qr_token = qrToken;


    await logAudit({
      actorId: user.userId,
      actorName: user.name,
      action: "SESSION_OPENED",
      entityType: "Session",
      entityId: session.id,
      newValue: {
        course: course.course_code,
        durationMinutes,
        lateThresholdMinutes,
        requireQr,
      },
    });

    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error("Create session error:", error);
    return NextResponse.json({ error: "Failed to open session" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "LECTURER" && user.role !== "HOD" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    const { sessionId, action } = await req.json();

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    if (action === "CLOSE") {
      const updated = await prisma.session.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.CLOSED,
          closed_at: new Date(),
        },
      });

      await logAudit({
        actorId: user.userId,
        actorName: user.name,
        action: "SESSION_CLOSED",
        entityType: "Session",
        entityId: sessionId,
      });

      return NextResponse.json({ success: true, session: updated });
    }

    return NextResponse.json({ error: "Unsupported session action" }, { status: 400 });
  } catch (error) {
    console.error("Update session error:", error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}
