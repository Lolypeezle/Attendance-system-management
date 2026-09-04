import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const level = searchParams.get("level");

    let query = supabase
      .from("Course")
      .select(`
        id,
        course_code,
        course_title,
        units,
        level,
        lecturer_id,
        created_at,
        lecturer:User(id, name, email)
      `)
      .order("course_code", { ascending: true });

    if (level) {
      query = query.eq("level", level);
    }
    if (user?.role === "LECTURER") {
      query = query.eq("lecturer_id", user.userId);
    }

    const { data: courses, error } = await query;

    if (error) {
      console.error("Supabase courses fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ courses: courses || [] });
  } catch (error) {
    console.error("Courses fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "HOD" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Only HOD or Admin can create courses." }, { status: 403 });
    }

    const { courseCode, courseTitle, units, level, lecturerId } = await req.json();

    if (!courseCode || !courseTitle) {
      return NextResponse.json({ error: "Course code and title are required." }, { status: 400 });
    }

    const cleanCode = courseCode.trim().toUpperCase();

    const { data: existing } = await supabase
      .from("Course")
      .select("id")
      .eq("course_code", cleanCode)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Course code already exists." }, { status: 409 });
    }

    const newCourseId = `crs_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const { data: course, error: insertErr } = await supabase
      .from("Course")
      .insert({
        id: newCourseId,
        course_code: cleanCode,
        course_title: courseTitle.trim(),
        units: parseInt(units || "3", 10),
        level: level || "100L",
        lecturer_id: lecturerId || null,
      })
      .select()
      .single();

    if (insertErr) {
      throw insertErr;
    }

    await logAudit({
      actorId: user.userId,
      actorName: user.name,
      action: "COURSE_CREATED",
      entityType: "Course",
      entityId: course.id,
      newValue: { code: course.course_code, title: course.course_title },
    });

    return NextResponse.json({ success: true, course });
  } catch (error: any) {
    console.error("Create course error:", error);
    return NextResponse.json({ error: error.message || "Failed to create course." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "HOD" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "Only HOD or Admin can update course allocations." }, { status: 403 });
    }

    const { courseId, lecturerId, courseTitle, units, level } = await req.json();

    if (!courseId) {
      return NextResponse.json({ error: "Course ID is required." }, { status: 400 });
    }

    const { data: existingCourse } = await supabase
      .from("Course")
      .select("*, lecturer:User(id, name, email)")
      .eq("id", courseId)
      .maybeSingle();

    if (!existingCourse) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }

    const updateData: any = {};
    if (lecturerId !== undefined) updateData.lecturer_id = lecturerId || null;
    if (courseTitle) updateData.course_title = courseTitle.trim();
    if (units) updateData.units = parseInt(units, 10);
    if (level) updateData.level = level;

    const { data: updatedCourse, error: updateErr } = await supabase
      .from("Course")
      .update(updateData)
      .eq("id", courseId)
      .select("*, lecturer:User(id, name, email)")
      .single();

    if (updateErr) {
      throw updateErr;
    }

    await logAudit({
      actorId: user.userId,
      actorName: user.name,
      action: "COURSE_UPDATED",
      entityType: "Course",
      entityId: updatedCourse.id,
      oldValue: {
        lecturer: existingCourse.lecturer?.name || "Unassigned",
        title: existingCourse.course_title,
      },
      newValue: {
        lecturer: updatedCourse.lecturer?.name || "Unassigned",
        title: updatedCourse.course_title,
      },
    });

    return NextResponse.json({ success: true, course: updatedCourse });
  } catch (error: any) {
    console.error("Update course error:", error);
    return NextResponse.json({ error: error.message || "Failed to update course." }, { status: 500 });
  }
}

