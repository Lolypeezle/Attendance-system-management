import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Only Super Admin can bulk import records." }, { status: 403 });
    }

    const { type, records } = await req.json();

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "No records supplied for import." }, { status: 400 });
    }

    let insertedCount = 0;
    const errors: string[] = [];

    // 1. IMPORT STUDENTS
    if (type === "students") {
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const rawMatric = (row.matric_number || row["Matric Number"] || row.matric || "").trim();
        const fullName = (row.full_name || row["Full Name"] || row.name || "").trim();
        const level = (row.level || row["Level"] || "300L").trim().toUpperCase();
        const coursesStr = (row.courses_enrolled || row["Courses Enrolled"] || row.courses || "").trim();

        if (!rawMatric || !fullName) {
          errors.push(`Row ${i + 1}: Missing matric number or name`);
          continue;
        }

        const matric = rawMatric.toUpperCase().replace(/\s*\/\s*/g, "/");

        try {
          let { data: profile } = await supabase
            .from("StudentProfile")
            .select("id")
            .eq("matric_number", matric)
            .maybeSingle();

          if (profile) {
            await supabase
              .from("StudentProfile")
              .update({ full_name: fullName, level })
              .eq("id", profile.id);
          } else {
            const { data: newProfile } = await supabase
              .from("StudentProfile")
              .insert({
                matric_number: matric,
                full_name: fullName,
                level,
              })
              .select("id")
              .single();
            profile = newProfile;
          }

          // Enroll in courses if specified
          if (coursesStr && profile) {
            const courseCodes = coursesStr.split(/[,;|]/).map((c: string) => c.trim().toUpperCase());
            for (const cCode of courseCodes) {
              if (!cCode) continue;
              const { data: course } = await supabase
                .from("Course")
                .select("id")
                .eq("course_code", cCode)
                .maybeSingle();

              if (course) {
                const { data: existingEn } = await supabase
                  .from("Enrollment")
                  .select("id")
                  .eq("student_id", profile.id)
                  .eq("course_id", course.id)
                  .maybeSingle();

                if (!existingEn) {
                  await supabase.from("Enrollment").insert({
                    student_id: profile.id,
                    course_id: course.id,
                    academic_session: "2025/2026",
                    semester: "SECOND",
                  });
                }
              }
            }
          }
          insertedCount++;
        } catch (err: any) {
          errors.push(`Row ${i + 1} (${matric}): ${err.message}`);
        }
      }

      await logAudit({
        actorId: admin.userId,
        actorName: admin.name,
        action: "BULK_IMPORT_STUDENTS",
        entityType: "StudentProfile",
        newValue: { count: insertedCount, errorCount: errors.length },
      });
    }

    // 2. IMPORT COURSES
    else if (type === "courses") {
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const code = (row.course_code || row["Course Code"] || row.code || "").trim().toUpperCase();
        const title = (row.course_title || row["Course Title"] || row.title || "").trim();
        const units = parseInt(row.units || row["Units"] || "3", 10);
        const level = (row.level || row["Level"] || "300L").trim().toUpperCase();
        const lecturerEmail = (row.lecturer_email || row["Lecturer Email"] || "").trim().toLowerCase();

        if (!code || !title) {
          errors.push(`Row ${i + 1}: Missing course code or title`);
          continue;
        }

        try {
          let lecturerId: string | null = null;
          if (lecturerEmail) {
            const { data: lecturerUser } = await supabase
              .from("User")
              .select("id")
              .eq("email", lecturerEmail)
              .maybeSingle();
            if (lecturerUser) lecturerId = lecturerUser.id;
          }

          const { data: existingCourse } = await supabase
            .from("Course")
            .select("id")
            .eq("course_code", code)
            .maybeSingle();

          if (existingCourse) {
            await supabase
              .from("Course")
              .update({
                course_title: title,
                units,
                level,
                lecturer_id: lecturerId,
              })
              .eq("id", existingCourse.id);
          } else {
            await supabase.from("Course").insert({
              course_code: code,
              course_title: title,
              units,
              level,
              lecturer_id: lecturerId,
            });
          }
          insertedCount++;
        } catch (err: any) {
          errors.push(`Row ${i + 1} (${code}): ${err.message}`);
        }
      }

      await logAudit({
        actorId: admin.userId,
        actorName: admin.name,
        action: "BULK_IMPORT_COURSES",
        entityType: "Course",
        newValue: { count: insertedCount, errorCount: errors.length },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${insertedCount} records.`,
      insertedCount,
      errors,
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    return NextResponse.json({ error: "Failed to process bulk import." }, { status: 500 });
  }
}
