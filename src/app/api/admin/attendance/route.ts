import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "SUPERADMIN" && user.role !== "HOD")) {
      return NextResponse.json(
        { error: "Access denied. Attendance history is restricted to Administrators." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const matric = searchParams.get("matric");
    const courseCode = searchParams.get("course");
    const status = searchParams.get("status");

    let query = supabase
      .from("AttendanceRecord")
      .select(`
        id,
        session_id,
        student_id,
        matric_number,
        full_name,
        status,
        clock_in_time,
        attendance_token,
        is_flagged,
        flag_reason,
        notes,
        session:Session(
          opened_at,
          late_threshold_minutes,
          course:Course(course_code, course_title, level)
        )

      `)
      .order("clock_in_time", { ascending: false });

    if (matric) {
      query = query.ilike("matric_number", `%${matric.trim()}%`);
    }
    if (status && status !== "ALL") {
      query = query.eq("status", status);
    }

    const { data: records, error } = await query;

    if (error) {
      console.error("Supabase attendance fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter by course if specified
    let filteredRecords = records || [];
    if (courseCode && courseCode !== "ALL") {
      filteredRecords = filteredRecords.filter((r: any) =>
        r.session?.course?.course_code?.toLowerCase() === courseCode.toLowerCase()
      );
    }

    return NextResponse.json({ records: filteredRecords });
  } catch (error) {
    console.error("Admin attendance fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch attendance records" }, { status: 500 });
  }
}
