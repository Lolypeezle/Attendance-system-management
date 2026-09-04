import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { AttendanceStatus, ExcuseStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") as ExcuseStatus | null;
    const courseIdParam = searchParams.get("courseId");

    let query = supabase
      .from("ExcuseRequest")
      .select(`
        *,
        student:StudentProfile(*),
        session:Session(*, course:Course(*), lecturer:User(name)),
        reviewer:User(name)
      `)
      .order("created_at", { ascending: false });

    if (statusParam) {
      query = query.eq("status", statusParam);
    }

    if (user?.role === "STUDENT" && user.studentId) {
      query = query.eq("student_id", user.studentId);
    }

    const { data: excuses, error } = await query;

    if (error) {
      console.error("Supabase excuses error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let filtered = excuses || [];

    if (user?.role === "LECTURER") {
      filtered = filtered.filter(
        (ex: any) => ex.session?.course?.lecturer_id === user.userId
      );
    }

    if (courseIdParam) {
      filtered = filtered.filter(
        (ex: any) => ex.session?.course_id === courseIdParam
      );
    }

    return NextResponse.json({ excuses: filtered });
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
      const cleanMatric = matricNumber.trim().toUpperCase().replace(/\s*\/\s*/g, "/");
      const { data: student } = await supabase
        .from("StudentProfile")
        .select("id")
        .eq("matric_number", cleanMatric)
        .maybeSingle();
      if (student) studentId = student.id;
    }

    if (!studentId) {
      return NextResponse.json(
        { error: "Student identification required. Please sign in." },
        { status: 401 }
      );
    }

    const { data: excuse, error: insertError } = await supabase
      .from("ExcuseRequest")
      .insert({
        student_id: studentId,
        session_id: sessionId,
        reason: reason.trim(),
        document_url: documentUrl?.trim() || null,
        status: ExcuseStatus.PENDING,
      })
      .select(`
        *,
        student:StudentProfile(*),
        session:Session(*, course:Course(*))
      `)
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await logAudit({
      actorId: user?.userId,
      actorName: user?.name || excuse?.student?.full_name || "Student",
      action: "EXCUSE_SUBMITTED",
      entityType: "ExcuseRequest",
      entityId: excuse?.id,
      newValue: { course: excuse?.session?.course?.course_code, reason },
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

    const { data: excuse } = await supabase
      .from("ExcuseRequest")
      .select(`
        *,
        student:StudentProfile(*),
        session:Session(*, course:Course(*))
      `)
      .eq("id", excuseId)
      .maybeSingle();

    if (!excuse) {
      return NextResponse.json({ error: "Excuse request not found." }, { status: 404 });
    }

    const oldStatus = excuse.status;

    // Update Excuse status
    const { data: updatedExcuse, error: updateErr } = await supabase
      .from("ExcuseRequest")
      .update({
        status: status as ExcuseStatus,
        reviewed_by: user.userId,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: reviewerNotes?.trim() || null,
      })
      .eq("id", excuseId)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // If approved, update or create AttendanceRecord marked as EXCUSED
    if (status === "APPROVED" && excuse.student) {
      const studentMatric = excuse.student.matric_number;
      const { data: existingRec } = await supabase
        .from("AttendanceRecord")
        .select("id")
        .eq("session_id", excuse.session_id)
        .eq("matric_number", studentMatric)
        .maybeSingle();

      if (existingRec) {
        await supabase
          .from("AttendanceRecord")
          .update({
            status: AttendanceStatus.EXCUSED,
            notes: `Excuse approved by ${user.name}: ${reviewerNotes || "Approved medical/official excuse"}`,
          })
          .eq("id", existingRec.id);
      } else {
        await supabase.from("AttendanceRecord").insert({
          session_id: excuse.session_id,
          student_id: excuse.student_id,
          matric_number: studentMatric,
          full_name: excuse.student.full_name,
          status: AttendanceStatus.EXCUSED,
          attendance_token: "EXCUSED",
          notes: `Excuse approved by ${user.name}: ${reviewerNotes || "Approved medical/official excuse"}`,
        });
      }
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
