import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const roleParam = searchParams.get("role") as Role | null;

    let query = supabase
      .from("User")
      .select(`
        id,
        name,
        email,
        role,
        is_active,
        created_at,
        student_profile:StudentProfile(matric_number, level)
      `)
      .order("created_at", { ascending: false });

    if (roleParam) {
      query = query.eq("role", roleParam);
    }

    const { data: users, error } = await query;

    if (error) {
      console.error("Supabase fetch users error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: users || [] });
  } catch (error) {
    console.error("Fetch users error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Only Super Admin can create system users." }, { status: 403 });
    }

    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existing) {
      return NextResponse.json({ error: "Email address already registered." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password_hash: passwordHash,
        role: role as Role,
      },
      select: { id: true, name: true, email: true, role: true, is_active: true },
    });

    await logAudit({
      actorId: admin.userId,
      actorName: admin.name,
      action: "USER_CREATED",
      entityType: "User",
      entityId: newUser.id,
      newValue: { name: newUser.name, email: newUser.email, role: newUser.role },
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Only Super Admin can update users." }, { status: 403 });
    }

    const { userId, action, newPassword, newRole } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (action === "TOGGLE_ACTIVE") {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { is_active: !targetUser.is_active },
      });

      await logAudit({
        actorId: admin.userId,
        actorName: admin.name,
        action: updated.is_active ? "USER_ACTIVATED" : "USER_DEACTIVATED",
        entityType: "User",
        entityId: userId,
        oldValue: { is_active: targetUser.is_active },
        newValue: { is_active: updated.is_active },
      });

      return NextResponse.json({ success: true, user: updated });
    }

    if (action === "RESET_PASSWORD" && newPassword) {
      const hash = await hashPassword(newPassword);
      await prisma.user.update({
        where: { id: userId },
        data: { password_hash: hash },
      });

      await logAudit({
        actorId: admin.userId,
        actorName: admin.name,
        action: "PASSWORD_RESET",
        entityType: "User",
        entityId: userId,
      });

      return NextResponse.json({ success: true, message: "Password reset successfully." });
    }

    if (action === "CHANGE_ROLE" && newRole) {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { role: newRole as Role },
      });

      await logAudit({
        actorId: admin.userId,
        actorName: admin.name,
        action: "ROLE_CHANGED",
        entityType: "User",
        entityId: userId,
        oldValue: { role: targetUser.role },
        newValue: { role: newRole },
      });

      return NextResponse.json({ success: true, user: updated });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}
