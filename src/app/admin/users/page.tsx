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
} from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Create User Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("LECTURER");
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Reset Password Modal
  const [resetUser, setResetUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [submittingReset, setSubmittingReset] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
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
      setCreatePassword("");
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">User & Access Management</h1>
            <p className="text-xs text-slate-500">
              Manage accounts, reset credentials, and govern role privileges.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-fuoye-green text-white text-xs font-bold hover:bg-fuoye-green-dark flex items-center gap-1.5 shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create New User</span>
        </button>
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
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created At</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredUsers.map((user) => (
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
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
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
                  <td className="py-3 px-4 text-right">
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Create New System User</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Dr. A. B. Adeleke"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5"
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
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Initial Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  System Role
                </label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                >
                  <option value="LECTURER">LECTURER</option>
                  <option value="HOD">HOD (Department Admin)</option>
                  <option value="SUPERADMIN">SUPERADMIN</option>
                  <option value="STUDENT">STUDENT</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
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
                  className="px-4 py-2 bg-fuoye-green text-white text-xs font-bold rounded-xl hover:bg-fuoye-green-dark flex items-center gap-1.5"
                >
                  {submittingCreate ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>Create User</span>
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
