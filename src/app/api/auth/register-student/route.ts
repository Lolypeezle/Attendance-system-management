import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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

    const cleanMatric = matricNumber.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email address already exists." },
        { status: 409 }
      );
    }

    // Check if student profile exists in FUOYE student records
    let profile = await prisma.studentProfile.findUnique({
      where: { matric_number: cleanMatric },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Matric number not recognized in the departmental database. Please contact your lecturer or HOD." },
        { status: 404 }
      );
    }

    if (profile.user_id) {
      return NextResponse.json(
        { error: "This student profile is already linked to an account. Please sign in instead." },
        { status: 409 }
      );
    }

    // Hash password & create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name: profile.full_name || fullName || "Student",
        email: cleanEmail,
        password_hash: passwordHash,
        role: Role.STUDENT,
      },
    });

    // Link profile
    profile = await prisma.studentProfile.update({
      where: { id: profile.id },
      data: {
        user_id: user.id,
        email: cleanEmail,
      },
    });

    // Issue JWT token
    const token = signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      studentId: profile.id,
      matricNumber: profile.matric_number,
    });

    const response = NextResponse.json({
      success: true,
      message: "Student account created successfully!",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: profile.id,
        matricNumber: profile.matric_number,
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
