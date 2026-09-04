import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { AttendanceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

// Mark unclocked students absent using Supabase
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

    // Fetch session
    const { data: session, error: sessionErr } = await supabase
      .from("Session")
      .select("id, course_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionErr || !session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Fetch course enrollments
    const { data: enrollments, error: enrollErr } = await supabase
      .from("Enrollment")
      .select(`
        student:StudentProfile(id, matric_number, full_name)
      `)
      .eq("course_id", session.course_id);

    if (enrollErr) {
      return NextResponse.json({ error: enrollErr.message }, { status: 500 });
    }

    // Fetch existing clocked-in records
    const { data: existingRecords } = await supabase
      .from("AttendanceRecord")
      .select("student_id")
      .eq("session_id", sessionId);

    const clockedInStudentIds = new Set((existingRecords || []).map((r: any) => r.student_id));
    const unclocked = (enrollments || [])
      .map((e: any) => e.student)
      .filter((s: any) => s && !clockedInStudentIds.has(s.id));

    let createdCount = 0;
    for (const student of unclocked) {
      const { error: insErr } = await supabase
        .from("AttendanceRecord")
        .insert({
          session_id: sessionId,
          student_id: student.id,
          matric_number: student.matric_number,
          full_name: student.full_name,
          status: AttendanceStatus.ABSENT,
          clock_in_time: new Date().toISOString(),
          attendance_token: "ABSENT",
          notes: `Marked absent after session closed by ${user.name}`,
        });

      if (!insErr) createdCount++;
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
  } catch (error: any) {
    console.error("Mark absent error:", error);
    return NextResponse.json({ error: error.message || "Failed to mark absent students" }, { status: 500 });
  }
}

// Manual correction of attendance status in Supabase
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

    const { data: record, error: fetchErr } = await supabase
      .from("AttendanceRecord")
      .select("*")
      .eq("id", recordId)
      .maybeSingle();

    if (fetchErr || !record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    const oldStatus = record.status;

    const { data: updated, error: updateErr } = await supabase
      .from("AttendanceRecord")
      .update({
        status: newStatus as AttendanceStatus,
        notes: `Corrected from ${oldStatus} to ${newStatus} by ${user.name}. Reason: ${reason.trim()}`,
      })
      .eq("id", recordId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Write audit log
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
  } catch (error: any) {
    console.error("Manual correction error:", error);
    return NextResponse.json({ error: error.message || "Failed to correct attendance record" }, { status: 500 });
  }
}
