import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { comparePassword, signAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Please provide both email and password." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    const { data: user, error: userError } = await supabase
      .from("User")
      .select("*, student_profile:StudentProfile(*)")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid email address or password." },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: "This account has been deactivated. Please contact the administrator." },
        { status: 403 }
      );
    }

    const isBcryptValid = await comparePassword(password, user.password_hash).catch(() => false);
    const isDirectMatch = user.password_hash === password;

    if (!isBcryptValid && !isDirectMatch) {
      return NextResponse.json(
        { error: "Invalid email address or password." },
        { status: 401 }
      );
    }


    const studentProfile = Array.isArray(user.student_profile)
      ? user.student_profile[0]
      : user.student_profile;

    // Generate JWT
    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      studentId: studentProfile?.id,
      matricNumber: studentProfile?.matric_number,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: studentProfile?.id,
        matricNumber: studentProfile?.matric_number,
      },
    });


    // Set secure cookie
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Authentication failed." }, { status: 500 });
  }
}
