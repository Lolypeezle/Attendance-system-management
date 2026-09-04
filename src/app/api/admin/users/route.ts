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

    // Fetch courses to attach assigned courses to lecturers
    const { data: courses } = await supabase
      .from("Course")
      .select("id, course_code, course_title, lecturer_id");

    const usersWithCourses = (users || []).map((u: any) => {
      if (u.role === "LECTURER" || u.role === "HOD") {
        const assigned = (courses || []).filter((c: any) => c.lecturer_id === u.id);
        return { ...u, assigned_courses: assigned };
      }
      return { ...u, assigned_courses: [] };
    });

    return NextResponse.json({ users: usersWithCourses });
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

    const { name, email, password, role, assignedCourseIds } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    const { data: existing } = await supabase
      .from("User")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Email address already registered." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const newUserId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    const { data: newUser, error: insertErr } = await supabase
      .from("User")
      .insert({
        id: newUserId,
        name: name.trim(),
        email: cleanEmail,
        password_hash: passwordHash,
        role: role as Role,
        is_active: true,
      })
      .select("id, name, email, role, is_active")
      .single();

    if (insertErr) {
      throw insertErr;
    }

    // If courses are assigned to this new lecturer, update Course table
    if (Array.isArray(assignedCourseIds) && assignedCourseIds.length > 0) {
      for (const courseId of assignedCourseIds) {
        await supabase
          .from("Course")
          .update({ lecturer_id: newUser.id })
          .eq("id", courseId);
      }
    }

    await logAudit({
      actorId: admin.userId,
      actorName: admin.name,
      action: "USER_CREATED",
      entityType: "User",
      entityId: newUser.id,
      newValue: {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        assignedCourseIds: assignedCourseIds || [],
      },
    });

    return NextResponse.json({ success: true, user: newUser });
  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: error.message || "Failed to create user" }, { status: 500 });
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

    const { data: targetUser } = await supabase
      .from("User")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (action === "TOGGLE_ACTIVE") {
      const { data: updated, error: updateErr } = await supabase
        .from("User")
        .update({ is_active: !targetUser.is_active })
        .eq("id", userId)
        .select()
        .single();

      if (updateErr) throw updateErr;

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
      const { error: resetErr } = await supabase
        .from("User")
        .update({ password_hash: hash })
        .eq("id", userId);

      if (resetErr) throw resetErr;

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
      const { data: updated, error: roleErr } = await supabase
        .from("User")
        .update({ role: newRole as Role })
        .eq("id", userId)
        .select()
        .single();

      if (roleErr) throw roleErr;

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

    if (action === "ASSIGN_COURSES") {
      const { assignedCourseIds } = await req.json();
      // Reset courses currently assigned to this user
      await supabase
        .from("Course")
        .update({ lecturer_id: null })
        .eq("lecturer_id", userId);

      // Assign new selected courses
      if (Array.isArray(assignedCourseIds) && assignedCourseIds.length > 0) {
        for (const cid of assignedCourseIds) {
          await supabase
            .from("Course")
            .update({ lecturer_id: userId })
            .eq("id", cid);
        }
      }

      await logAudit({
        actorId: admin.userId,
        actorName: admin.name,
        action: "COURSE_UPDATED",
        entityType: "User",
        entityId: userId,
        newValue: { assignedCourseIds: assignedCourseIds || [] },
      });

      return NextResponse.json({ success: true, message: "Assigned courses updated successfully." });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json({ error: "Failed to update user." }, { status: 500 });
  }
}
