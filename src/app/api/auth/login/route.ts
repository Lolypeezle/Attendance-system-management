import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { comparePassword, hashPassword, signAuthToken, AUTH_COOKIE_NAME } from "@/lib/auth";

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

    // 1. Attempt Supabase Auth validation
    let authenticatedViaSupabase = false;
    let supabaseAuthUser: any = null;

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (!authError && authData?.user) {
        authenticatedViaSupabase = true;
        supabaseAuthUser = authData.user;
      }
    } catch (sbErr) {
      console.warn("Supabase Auth login attempt warning:", sbErr);
    }

    // 2. Fetch or prepare user record from database (case-insensitive email)
    let { data: user, error: userError } = await supabase
      .from("User")
      .select("*, student_profile:StudentProfile(*)")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (authenticatedViaSupabase && supabaseAuthUser) {
      // Authenticated directly through Supabase Auth!
      if (!user) {
        // Auto-provision user in User table with SUPERADMIN role
        const autoName =
          supabaseAuthUser.user_metadata?.full_name ||
          supabaseAuthUser.user_metadata?.name ||
          cleanEmail.split("@")[0].toUpperCase() ||
          "Administrator";

        const { data: newUser } = await supabase
          .from("User")
          .insert({
            id: `usr_${supabaseAuthUser.id.replace(/-/g, "").slice(0, 16)}`,
            name: autoName,
            email: cleanEmail,
            password_hash: "SUPABASE_AUTH_MANAGED",
            role: "SUPERADMIN",
            is_active: true,
          })
          .select("*, student_profile:StudentProfile(*)")
          .maybeSingle();

        user = newUser || {
          id: `usr_${supabaseAuthUser.id.replace(/-/g, "").slice(0, 16)}`,
          name: autoName,
          email: cleanEmail,
          role: "SUPERADMIN",
          is_active: true,
        };
      } else {
        // Ensure user has administrative role
        if (user.role === "STUDENT") {
          await supabase.from("User").update({ role: "SUPERADMIN" }).eq("id", user.id);
          user.role = "SUPERADMIN";
        }
      }
    } else {
      // 3. Fallback: Check local User table password_hash (for created & seeded users)
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

      const trimmedPass = (password || "").trim();

      const isBcryptValid =
        (await comparePassword(password, user.password_hash).catch(() => false)) ||
        (await comparePassword(trimmedPass, user.password_hash).catch(() => false));

      const isDirectMatch =
        user.password_hash === password ||
        user.password_hash === trimmedPass;

      // Handle legacy initial seed hash ($2a$10$Ucr6s4/t7Qwoiri5I9K5QOWPEGEFN.PAHlov0ZakUemIlzJFf.eSu)
      const isLegacyDemoHash =
        user.password_hash === "$2a$10$Ucr6s4/t7Qwoiri5I9K5QOWPEGEFN.PAHlov0ZakUemIlzJFf.eSu" &&
        (password === "Password@123" || trimmedPass === "Password@123");

      if (!isBcryptValid && !isDirectMatch && !isLegacyDemoHash) {
        return NextResponse.json(
          { error: "Invalid email address or password." },
          { status: 401 }
        );
      }

      // Self-heal: update hash if it was direct match or legacy hash
      if (isDirectMatch || isLegacyDemoHash) {
        const upgradedHash = await hashPassword(trimmedPass);
        await supabase.from("User").update({ password_hash: upgradedHash }).eq("id", user.id);
      }
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
