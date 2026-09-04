import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Only Super Admin can export database backups." }, { status: 403 });
    }

    const [
      usersRes,
      studentsRes,
      coursesRes,
      enrollmentsRes,
      sessionsRes,
      attendanceRes,
      excusesRes,
      auditLogsRes,
      settingsRes,
    ] = await Promise.all([
      supabase.from("User").select("id, name, email, role, is_active, created_at"),
      supabase.from("StudentProfile").select("*"),
      supabase.from("Course").select("*"),
      supabase.from("Enrollment").select("*"),
      supabase.from("Session").select("*"),
      supabase.from("AttendanceRecord").select("*"),
      supabase.from("ExcuseRequest").select("*"),
      supabase.from("AuditLog").select("*"),
      supabase.from("SystemSetting").select("*"),
    ]);

    const backupDump = {
      version: "1.0",
      institution: "Federal University Oye-Ekiti (FUOYE)",
      department: "Department of Computer Science",
      exportedAt: new Date().toISOString(),
      exportedBy: admin.name,
      data: {
        users: usersRes.data || [],
        students: studentsRes.data || [],
        courses: coursesRes.data || [],
        enrollments: enrollmentsRes.data || [],
        sessions: sessionsRes.data || [],
        attendance: attendanceRes.data || [],
        excuses: excusesRes.data || [],
        auditLogs: auditLogsRes.data || [],
        settings: settingsRes.data || [],
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
