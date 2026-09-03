import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Only Super Admin can export database backups." }, { status: 403 });
    }

    const [
      users,
      students,
      courses,
      enrollments,
      sessions,
      attendance,
      excuses,
      auditLogs,
      settings,
    ] = await Promise.all([
      prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, is_active: true, created_at: true } }),
      prisma.studentProfile.findMany(),
      prisma.course.findMany(),
      prisma.enrollment.findMany(),
      prisma.session.findMany(),
      prisma.attendanceRecord.findMany(),
      prisma.excuseRequest.findMany(),
      prisma.auditLog.findMany(),
      prisma.systemSetting.findMany(),
    ]);

    const backupDump = {
      version: "1.0",
      institution: "Federal University Oye-Ekiti (FUOYE)",
      department: "Department of Computer Science",
      exportedAt: new Date().toISOString(),
      exportedBy: admin.name,
      data: {
        users,
        students,
        courses,
        enrollments,
        sessions,
        attendance,
        excuses,
        auditLogs,
        settings,
      },
    };

    await logAudit({
      actorId: admin.userId,
      actorName: admin.name,
      action: "DATABASE_BACKUP_EXPORTED",
      entityType: "Database",
    });

    const jsonString = JSON.stringify(backupDump, null, 2);

    return new NextResponse(jsonString, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="FUOYE_SAMS_Backup_${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    console.error("Backup error:", error);
    return NextResponse.json({ error: "Failed to generate database backup" }, { status: 500 });
  }
}
