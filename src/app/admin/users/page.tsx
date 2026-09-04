"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  ArrowLeft,
  Key,
  Shield,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
  Search,
  GraduationCap,
  BookOpen,
  Check,
} from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Create User Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("Password@123");
  const [createRole, setCreateRole] = useState("LECTURER");
  const [createAssignedCourses, setCreateAssignedCourses] = useState<string[]>([]);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Reset Password Modal
  const [resetUser, setResetUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [submittingReset, setSubmittingReset] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Course Assignment Modal
  const [assignModalUser, setAssignModalUser] = useState<any>(null);
  const [selectedCourseIdsToAssign, setSelectedCourseIdsToAssign] = useState<string[]>([]);
  const [submittingAssignCourses, setSubmittingAssignCourses] = useState(false);
  const [assignCoursesMsg, setAssignCoursesMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchCourses();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch("/api/courses");
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (err) {
      console.error("Fetch courses error:", err);
    }
  };

  const handleToggleActive = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "TOGGLE_ACTIVE" }),
      });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAddLecturer = () => {
    setCreateName("");
    setCreateEmail("");
    setCreatePassword("Password@123");
    setCreateRole("LECTURER");
    setCreateAssignedCourses([]);
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleOpenGenericCreate = () => {
    setCreateName("");
    setCreateEmail("");
    setCreatePassword("Password@123");
    setCreateRole("STUDENT");
    setCreateAssignedCourses([]);
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleToggleCreateCourse = (courseId: string) => {
    setCreateAssignedCourses((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCreate(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName,
          email: createEmail,
          password: createPassword,
          role: createRole,
          assignedCourseIds: createRole === "LECTURER" ? createAssignedCourses : [],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Failed to create user.");
        setSubmittingCreate(false);
        return;
      }

      setIsCreateOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreatePassword("Password@123");
      setCreateAssignedCourses([]);
      fetchUsers();
    } catch {
      setCreateError("Network error occurred.");
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setResetMessage("Password must be at least 6 characters.");
      return;
    }
    setSubmittingReset(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: resetUser.id,
          action: "RESET_PASSWORD",
          newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetMessage("Password has been reset successfully.");
        setTimeout(() => {
          setResetUser(null);
          setNewPassword("");
          setResetMessage(null);
        }, 1200);
      } else {
        setResetMessage(data.error || "Failed to reset password.");
      }
    } catch {
      setResetMessage("Network error occurred.");
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleOpenAssignModal = (user: any) => {
    setAssignModalUser(user);
    const existingIds = (user.assigned_courses || []).map((c: any) => c.id);
    setSelectedCourseIdsToAssign(existingIds);
    setAssignCoursesMsg(null);
  };

  const handleToggleAssignCourse = (courseId: string) => {
    setSelectedCourseIdsToAssign((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  const handleSaveAssignedCourses = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingAssignCourses(true);
    setAssignCoursesMsg(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: assignModalUser.id,
          action: "ASSIGN_COURSES",
          assignedCourseIds: selectedCourseIdsToAssign,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAssignCoursesMsg("Course assignments updated successfully!");
        fetchUsers();
        setTimeout(() => {
          setAssignModalUser(null);
          setAssignCoursesMsg(null);
        }, 1000);
      } else {
        setAssignCoursesMsg(data.error || "Failed to assign courses.");
      }
    } catch {
      setAssignCoursesMsg("Network error occurred.");
    } finally {
      setSubmittingAssignCourses(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (filterRole !== "ALL" && u.role !== filterRole) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.student_profile?.matric_number &&
          u.student_profile.matric_number.toLowerCase().includes(q))
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-fuoye-green animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">User & Faculty Management</h1>
            <p className="text-xs text-slate-500">
              Add departmental lecturers, manage accounts, assign courses, and reset credentials.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAddLecturer}
            className="px-4 py-2.5 rounded-xl bg-fuoye-green text-white text-xs font-bold hover:bg-fuoye-green-dark flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Add Faculty Lecturer</span>
          </button>
          <button
            onClick={handleOpenGenericCreate}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Other User</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {["ALL", "LECTURER", "HOD", "SUPERADMIN", "STUDENT"].map((role) => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                filterRole === role
                  ? "bg-purple-700 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {role}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search by name, email, matric..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2 pl-8"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Assigned Course(s)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredUsers.map((user) => {
                const isFaculty = user.role === "LECTURER" || user.role === "HOD";

                return (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">{user.name}</span>
                      {user.student_profile && (
                        <span className="text-[11px] font-mono text-fuoye-green font-bold">
                          {user.student_profile.matric_number} ({user.student_profile.level})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{user.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          user.role === "SUPERADMIN"
                            ? "bg-purple-100 text-purple-800"
                            : user.role === "HOD"
                            ? "bg-blue-100 text-blue-800"
                            : user.role === "LECTURER"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>

                    {/* Assigned Courses */}
                    <td className="py-3 px-4">
                      {isFaculty ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {user.assigned_courses && user.assigned_courses.length > 0 ? (
                            user.assigned_courses.map((c: any) => (
                              <span
                                key={c.id}
                                className="px-2 py-0.5 rounded-md bg-emerald-50 text-fuoye-green border border-emerald-200 text-[10px] font-bold"
                                title={c.course_title}
                              >
                                {c.course_code}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              None assigned
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleActive(user.id)}
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 transition-colors ${
                          user.is_active
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                        }`}
                      >
                        {user.is_active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" /> Deactivated
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {isFaculty && (
                        <button
                          onClick={() => handleOpenAssignModal(user)}
                          className="px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-fuoye-green hover:bg-emerald-100 text-xs font-bold inline-flex items-center gap-1 transition-colors"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>Assign Courses</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setResetUser(user);
                          setNewPassword("");
                          setResetMessage(null);
                        }}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold inline-flex items-center gap-1"
                      >
                        <Key className="w-3 h-3 text-amber-600" />
                        <span>Reset Password</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal (Specialized for Lecturer onboarding or generic user) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {createRole === "LECTURER" ? (
                  <div className="p-1.5 rounded-xl bg-emerald-100 text-fuoye-green">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="p-1.5 rounded-xl bg-purple-100 text-purple-800">
                    <Users className="w-5 h-5" />
                  </div>
                )}
                <h3 className="text-base font-bold text-slate-900">
                  {createRole === "LECTURER"
                    ? "Add New Faculty Lecturer"
                    : "Create System User"}
                </h3>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createRole === "LECTURER" && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                Newly created lecturers will be able to log in immediately via the{" "}
                <strong>Lecturer Portal (/lecturer/login)</strong> with the institutional email
                and password you provide below.
              </div>
            )}

            {createError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Full Name & Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. A. B. Adeleke"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-fuoye-green"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Institutional Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. adeleke@fuoye.edu.ng"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-fuoye-green"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Initial Password
                </label>
                <input
                  type="text"
                  placeholder="Default: Password@123"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono focus:outline-none focus:ring-1 focus:ring-fuoye-green"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  System Role
                </label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-fuoye-green"
                >
                  <option value="LECTURER">LECTURER (Faculty Member)</option>
                  <option value="HOD">HOD (Department Admin)</option>
                  <option value="SUPERADMIN">SUPERADMIN</option>
                  <option value="STUDENT">STUDENT</option>
                </select>
              </div>

              {/* Course Assignment checklist for Lecturer */}
              {createRole === "LECTURER" && (
                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Assign Department Courses (Optional)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Select the courses this lecturer will teach. They will immediately have access to launch attendance sessions for these courses.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 max-h-44 overflow-y-auto">
                    {courses.map((c) => {
                      const isChecked = createAssignedCourses.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleCreateCourse(c.id)}
                            className="mt-0.5 rounded text-fuoye-green focus:ring-fuoye-green"
                          />
                          <div className="truncate">
                            <span className="font-mono text-xs">{c.course_code}</span>
                            <span className="text-[10px] text-slate-500 block truncate">
                              {c.course_title}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-4 py-2 bg-fuoye-green text-white text-xs font-bold rounded-xl hover:bg-fuoye-green-dark flex items-center gap-1.5 shadow-sm"
                >
                  {submittingCreate ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>{createRole === "LECTURER" ? "Save & Authorize Lecturer" : "Create User"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Courses Modal */}
      {assignModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-emerald-100 text-fuoye-green">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Assign Courses</h3>
              </div>
              <button
                onClick={() => setAssignModalUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Allocating courses for: <strong>{assignModalUser.name}</strong> ({assignModalUser.email})
            </p>

            {assignCoursesMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                {assignCoursesMsg}
              </div>
            )}

            <form onSubmit={handleSaveAssignedCourses} className="space-y-3.5">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Select Assigned Course(s)
                </label>
                <div className="space-y-1.5 max-h-56 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                  {courses.map((c) => {
                    const isChecked = selectedCourseIdsToAssign.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-emerald-50 border-emerald-300 font-bold text-emerald-950"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleAssignCourse(c.id)}
                          className="rounded text-fuoye-green focus:ring-fuoye-green"
                        />
                        <div className="flex-1 truncate">
                          <span className="font-mono">{c.course_code}</span> — {c.course_title}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssignModalUser(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAssignCourses}
                  className="px-4 py-2 bg-fuoye-green text-white text-xs font-bold rounded-xl hover:bg-fuoye-green-dark flex items-center gap-1.5"
                >
                  {submittingAssignCourses ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Course Allocation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Reset Account Password</h3>
              <button
                onClick={() => setResetUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Resetting password for: <strong>{resetUser.name}</strong> ({resetUser.email})
            </p>

            {resetMessage && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                {resetMessage}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Enter minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReset}
                  className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 flex items-center gap-1.5"
                >
                  {submittingReset ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Key className="w-3.5 h-3.5" />
                  )}
                  <span>Save Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
