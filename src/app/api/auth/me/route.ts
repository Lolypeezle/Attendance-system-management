import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userPayload = await getCurrentUser();
    if (!userPayload) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // Lookup user in Supabase
    let { data: dbUser } = await supabase
      .from("User")
      .select("*, student_profile:StudentProfile(*)")
      .eq("id", userPayload.userId)
      .maybeSingle();

    if (!dbUser) {
      const { data: userByEmail } = await supabase
        .from("User")
        .select("*, student_profile:StudentProfile(*)")
        .eq("email", userPayload.email)
        .maybeSingle();

      dbUser = userByEmail;
    }

    if (!dbUser) {
      // Return JWT payload if DB row hasn't synced yet
      return NextResponse.json({
        user: {
          id: userPayload.userId,
          name: userPayload.name,
          email: userPayload.email,
          role: userPayload.role,
          studentId: userPayload.studentId,
          matricNumber: userPayload.matricNumber,
        },
      });
    }

    const studentProfile = Array.isArray(dbUser.student_profile)
      ? dbUser.student_profile[0]
      : dbUser.student_profile;

    return NextResponse.json({
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        studentId: studentProfile?.id,
        matricNumber: studentProfile?.matric_number,
        level: studentProfile?.level,
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}

