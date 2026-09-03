import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const matric = searchParams.get("matric")?.trim().toUpperCase();
    const sessionId = searchParams.get("sessionId");

    if (!matric) {
      return NextResponse.json({ valid: false, error: "Matric number is required." }, { status: 400 });
    }

    const student = await prisma.studentProfile.findUnique({
      where: { matric_number: matric },
    });

    if (!student) {
      return NextResponse.json(
        { valid: false, error: "Matric number not recognised. Contact your lecturer." },
        { status: 404 }
      );
    }

    if (sessionId) {
      const session = await prisma.session.findUnique({
        where: { id: sessionId },
        select: { course_id: true },
      });

      if (session) {
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            student_id_course_id: {
              student_id: student.id,
              course_id: session.course_id,
            },
          },
        });

        if (!enrollment) {
          return NextResponse.json(
            { valid: false, error: "You are not enrolled in this course." },
            { status: 403 }
          );
        }
      }
    }

    return NextResponse.json({
      valid: true,
      student: {
        id: student.id,
        full_name: student.full_name,
        matric_number: student.matric_number,
        level: student.level,
      },
    });
  } catch (error) {
    console.error("Matric check error:", error);
    return NextResponse.json({ valid: false, error: "Internal validation error" }, { status: 500 });
  }
}
