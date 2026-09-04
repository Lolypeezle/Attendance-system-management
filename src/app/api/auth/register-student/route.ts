import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { hashPassword, signAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { matricNumber, email, password, fullName } = await req.json();

    if (!matricNumber || !email || !password) {
      return NextResponse.json(
        { error: "Matric number, email, and password are required." },
        { status: 400 }
      );
    }

    const cleanMatric = matricNumber.trim().toUpperCase().replace(/\s*\/\s*/g, "/");
    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("User")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 409 }
      );
    }

    // Check if student profile exists in FUOYE student records
    let { data: profile } = await supabase
      .from("StudentProfile")
      .select("*")
      .eq("matric_number", cleanMatric)
      .maybeSingle();

    const isCsc2023 = cleanMatric.includes("CSC/2023") || cleanMatric.includes("2023");

    // All CSC/2023 matric numbers are accepted
    if (!profile) {
      if (isCsc2023) {
        const { data: newProfile } = await supabase
          .from("StudentProfile")
          .insert({
            matric_number: cleanMatric,
            full_name: fullName?.trim() || "Student (" + cleanMatric + ")",
            level: "300L",
            email: cleanEmail,
          })
          .select()
          .single();
        profile = newProfile;
      } else {
        return NextResponse.json(
          { error: "Matric number not recognized in the departmental database. Please contact your lecturer or HOD." },
          { status: 404 }
        );
      }
    }

    if (profile?.user_id) {
      return NextResponse.json(
        { error: "This student profile is already linked to an account. Please sign in instead." },
        { status: 409 }
      );
    }

    // Hash password & create user
    const passwordHash = await hashPassword(password);
    const userId = `usr_std_${Date.now().toString(36)}`;
    const studentName = profile?.full_name || fullName?.trim() || "Student";

    const { data: user, error: userError } = await supabase
      .from("User")
      .insert({
        id: userId,
        name: studentName,
        email: cleanEmail,
        password_hash: passwordHash,
        role: Role.STUDENT,
        is_active: true,
      })
      .select()
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: userError?.message || "Failed to create user account" }, { status: 500 });
    }

    // Link profile
    if (profile?.id) {
      await supabase
        .from("StudentProfile")
        .update({
          user_id: user.id,
          email: cleanEmail,
          full_name: studentName,
        })
        .eq("id", profile.id);
    }

    // Issue JWT token
    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role as Role,
      name: user.name,
      studentId: profile?.id,
      matricNumber: cleanMatric,
    });

    const response = NextResponse.json({
      success: true,
      message: "Student account created successfully!",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: profile?.id,
        matricNumber: cleanMatric,
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Student registration error:", error);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
