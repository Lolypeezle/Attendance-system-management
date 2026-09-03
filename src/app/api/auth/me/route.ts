import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userPayload = await getCurrentUser();
    if (!userPayload) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: userPayload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        student_profile: {
          select: {
            id: true,
            matric_number: true,
            level: true,
          },
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        studentId: dbUser.student_profile?.id,
        matricNumber: dbUser.student_profile?.matric_number,
        level: dbUser.student_profile?.level,
      },
    });
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
