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
    if (!admin || (admin.role !== "SUPERADMIN" && admin.role !== "HOD")) {
      return NextResponse.json({ error: "Only administrators can create system users." }, { status: 403 });
    }

    const { name, email, password, role, assignedCourseIds } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    const { data: existing } = await supabase
      .from("User")
      .select("id")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "Email address already registered." }, { status: 409 });
    }

    const passwordHash = await hashPassword(cleanPassword);
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
    if (!admin || (admin.role !== "SUPERADMIN" && admin.role !== "HOD")) {
      return NextResponse.json({ error: "Only administrators can update users." }, { status: 403 });
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
      const cleanPass = newPassword.trim();
      const hash = await hashPassword(cleanPass);
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

export async function DELETE(req: NextRequest) {
  try {
    const admin = await getCurrentUser();
    if (!admin || (admin.role !== "SUPERADMIN" && admin.role !== "HOD")) {
      return NextResponse.json({ error: "Only administrators can delete users." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    let userId = searchParams.get("userId");

    if (!userId) {
      try {
        const body = await req.json();
        userId = body?.userId;
      } catch {
        // body may be empty
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    }

    if (userId === admin.userId) {
      return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
    }

    // Check if target user exists
    const { data: targetUser, error: findErr } = await supabase
      .from("User")
      .select("id, name, email, role")
      .eq("id", userId)
      .maybeSingle();

    if (findErr) {
      console.error("Find user error:", findErr);
      return NextResponse.json({ error: findErr.message }, { status: 500 });
    }

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Only SUPERADMIN can delete another SUPERADMIN
    if (targetUser.role === "SUPERADMIN" && admin.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Only Super Admin can delete another Super Admin." }, { status: 403 });
    }

    // 1. Unassign any courses assigned to this lecturer
    const { error: courseErr } = await supabase
      .from("Course")
      .update({ lecturer_id: null })
      .eq("lecturer_id", userId);

    if (courseErr) {
      console.warn("Warning unassigning courses:", courseErr);
    }

    // 2. Reassign sessions opened by this lecturer to the current admin to preserve students' attendance history
    const { error: sessionErr } = await supabase
      .from("Session")
      .update({ opened_by: admin.userId })
      .eq("opened_by", userId);

    if (sessionErr) {
      console.warn("Warning reassigning sessions:", sessionErr);
    }

    // 3. Clear student profile reference if any
    const { error: stdErr } = await supabase
      .from("StudentProfile")
      .update({ user_id: null })
      .eq("user_id", userId);

    if (stdErr) {
      console.warn("Warning clearing student profile:", stdErr);
    }

    // 4. Delete notifications for this user
    await supabase
      .from("Notification")
      .delete()
      .eq("user_id", userId);

    // 5. Delete user from User table
    const { error: deleteErr } = await supabase
      .from("User")
      .delete()
      .eq("id", userId);

    if (deleteErr) {
      console.error("Delete user error:", deleteErr);
      return NextResponse.json({ error: deleteErr.message || "Failed to delete user." }, { status: 500 });
    }

    // 6. Log audit action
    await logAudit({
      actorId: admin.userId,
      actorName: admin.name,
      action: "USER_DELETED",
      entityType: "User",
      entityId: userId,
      oldValue: {
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${targetUser.name} (${targetUser.role}) was deleted successfully.`,
    });
  } catch (error: any) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete user." }, { status: 500 });
  }
}
