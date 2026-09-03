"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  Mail,
  User,
  Hash,
  ArrowRight,
  Loader2,
  ShieldCheck,
  GraduationCap,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed. Please check credentials.");
        setLoading(false);
        return;
      }

      const role = data.user.role;
      if (role === "SUPERADMIN" || role === "ADMIN" || role === "HOD") {
        router.push("/admin");
      } else if (role === "LECTURER") {
        router.push("/lecturer");
      } else {
        router.push("/clock-in");
      }

    } catch {
      setError("Network error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/auth/register-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matricNumber,
          email,
          password,
          fullName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed.");
        setLoading(false);
        return;
      }

      setSuccessMsg("Account created! Redirecting to student desk...");
      setTimeout(() => {
        router.push("/student");
      }, 1000);
    } catch {
      setError("Network error occurred. Please try again.");
      setLoading(false);
    }
  };

  const setDemoCredentials = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword("Password@123");
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-slate-50">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-fuoye-green text-xs font-bold">
            <Lock className="w-3.5 h-3.5" />
            <span>Secure Portal Access</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            {mode === "login" ? "Sign In to FUOYE SAMS" : "Create Student Account"}
          </h1>
          <p className="text-xs text-slate-500">
            Department of Computer Science • Federal University Oye-Ekiti
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-7 space-y-5">
          {/* Toggle Tab */}
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === "login"
                  ? "bg-white text-fuoye-green shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === "register"
                  ? "bg-white text-fuoye-green shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Student Register
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Institutional Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="e.g. adeyemi@fuoye.edu.ng"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-xl p-3 pl-9 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuoye-green focus:border-transparent transition-all"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-xl p-3 pl-9 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuoye-green focus:border-transparent transition-all"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-fuoye-green text-white font-extrabold text-sm hover:bg-fuoye-green-dark shadow-md focus:outline-none focus:ring-2 focus:ring-fuoye-green focus:ring-offset-2 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Matriculation Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. CSC/2021/1002"
                    value={matricNumber}
                    onChange={(e) => setMatricNumber(e.target.value.toUpperCase())}
                    required
                    className="w-full text-xs font-mono font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl p-3 pl-9 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuoye-green focus:border-transparent uppercase transition-all"
                  />
                  <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Chukwuma Blessing"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-xl p-3 pl-9 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuoye-green focus:border-transparent transition-all"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="e.g. b.chukwuma@fuoye.edu.ng"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-xl p-3 pl-9 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuoye-green focus:border-transparent transition-all"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Create Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-xl p-3 pl-9 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuoye-green focus:border-transparent transition-all"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-fuoye-green text-white font-extrabold text-sm hover:bg-fuoye-green-dark shadow-md focus:outline-none focus:ring-2 focus:ring-fuoye-green focus:ring-offset-2 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Register Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Access Chips for Testing */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center">
              ⚡ Quick Demo 1-Click Fill
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => setDemoCredentials("admin@fuoye.edu.ng")}
                className="p-2 rounded-lg border border-purple-200 text-slate-700 bg-purple-50 hover:bg-purple-100 transition-colors text-left"
              >
                <span className="font-bold block text-purple-900">Engr. Fashola</span>
                <span className="text-[10px] text-purple-700">Super Admin</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials("balogun@fuoye.edu.ng")}
                className="p-2 rounded-lg border border-slate-200 text-slate-700 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 transition-colors text-left"
              >
                <span className="font-bold block text-slate-900">Dr. Balogun</span>
                <span className="text-[10px] text-amber-700">Lecturer</span>
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-400">
              Default password: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">Password@123</code> (Or your personal login created in Supabase)
            </p>

          </div>
        </div>

        {/* Public Clock In Return Link */}
        <div className="text-center text-xs text-slate-500">
          Just want to record attendance?{" "}
          <Link href="/clock-in" className="text-fuoye-green font-extrabold hover:underline">
            Go to Public Clock-In (No Login Required)
          </Link>
        </div>
      </div>
    </div>
  );
}
