import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
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
        const matric = (row.matric_number || row["Matric Number"] || row.matric || "").trim().toUpperCase();
        const fullName = (row.full_name || row["Full Name"] || row.name || "").trim();
        const level = (row.level || row["Level"] || "100L").trim().toUpperCase();
        const coursesStr = (row.courses_enrolled || row["Courses Enrolled"] || row.courses || "").trim();

        if (!matric || !fullName) {
          errors.push(`Row ${i + 1}: Missing matric number or name`);
          continue;
        }

        try {
          const profile = await prisma.studentProfile.upsert({
            where: { matric_number: matric },
            update: { full_name: fullName, level },
            create: {
              matric_number: matric,
              full_name: fullName,
              level,
            },
          });

          // Enroll in courses if specified
          if (coursesStr) {
            const courseCodes = coursesStr.split(/[,;|]/).map((c: string) => c.trim().toUpperCase());
            for (const cCode of courseCodes) {
              if (!cCode) continue;
              const course = await prisma.course.findUnique({ where: { course_code: cCode } });
              if (course) {
                await prisma.enrollment.upsert({
                  where: {
                    student_id_course_id: {
                      student_id: profile.id,
                      course_id: course.id,
                    },
                  },
                  update: {},
                  create: {
                    student_id: profile.id,
                    course_id: course.id,
                  },
                });
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
        const level = (row.level || row["Level"] || "100L").trim().toUpperCase();
        const lecturerEmail = (row.lecturer_email || row["Lecturer Email"] || "").trim().toLowerCase();

        if (!code || !title) {
          errors.push(`Row ${i + 1}: Missing course code or title`);
          continue;
        }

        try {
          let lecturerId: string | null = null;
          if (lecturerEmail) {
            const lecturerUser = await prisma.user.findUnique({ where: { email: lecturerEmail } });
            if (lecturerUser) lecturerId = lecturerUser.id;
          }

          await prisma.course.upsert({
            where: { course_code: code },
            update: { course_title: title, units, level, lecturer_id: lecturerId },
            create: {
              course_code: code,
              course_title: title,
              units,
              level,
              lecturer_id: lecturerId,
            },
          });
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
