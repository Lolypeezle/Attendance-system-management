import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawMatric = searchParams.get("matric")?.trim();
    const sessionId = searchParams.get("sessionId");

    if (!rawMatric) {
      return NextResponse.json({ valid: false, error: "Matric number is required." }, { status: 400 });
    }

    const cleanMatric = rawMatric.toUpperCase().replace(/\s*\/\s*/g, "/");
    const isCsc2023 = cleanMatric.includes("CSC/2023") || cleanMatric.includes("2023");

    // Check in Supabase StudentProfile
    let { data: student } = await supabase
      .from("StudentProfile")
      .select("*")
      .eq("matric_number", cleanMatric)
      .maybeSingle();

    // Any matric that has CSC/2023 is automatically accepted
    if (!student && isCsc2023) {
      const { data: createdStudent } = await supabase
        .from("StudentProfile")
        .insert({
          matric_number: cleanMatric,
          full_name: "Student (" + cleanMatric + ")",
          level: "300L",
        })
        .select()
        .maybeSingle();

      student = createdStudent || {
        id: `std_${cleanMatric.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}`,
        full_name: "Student (" + cleanMatric + ")",
        matric_number: cleanMatric,
        level: "300L",
      };
    }

    if (!student) {
      return NextResponse.json(
        { valid: false, error: "Matric number not recognised. Contact your lecturer or HOD." },
        { status: 404 }
      );
    }

    if (sessionId) {
      const { data: session } = await supabase
        .from("Session")
        .select("course_id")
        .eq("id", sessionId)
        .maybeSingle();

      if (session) {
        const { data: enrollment } = await supabase
          .from("Enrollment")
          .select("id")
          .eq("student_id", student.id)
          .eq("course_id", session.course_id)
          .maybeSingle();

        if (!enrollment) {
          // Auto-enroll student into the session course
          await supabase.from("Enrollment").insert({
            student_id: student.id,
            course_id: session.course_id,
            academic_session: "2025/2026",
            semester: "SECOND",
          });
        }
      }
    }

    return NextResponse.json({
      valid: true,
      student: {
        id: student.id,
        full_name: student.full_name,
        matric_number: student.matric_number,
        level: student.level || "300L",
      },
    });
  } catch (error) {
    console.error("Matric check error:", error);
    return NextResponse.json({ valid: false, error: "Internal validation error" }, { status: 500 });
  }
}
