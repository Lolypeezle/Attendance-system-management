"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  BookOpen,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

export default function LecturerLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const demoLecturers = [
    {
      name: "Dr. K. M. Balogun",
      email: "balogun@fuoye.edu.ng",
      courses: "CSC 304, CSC 316",
    },
    {
      name: "Dr. S. O. Adeyemi",
      email: "adeyemi@fuoye.edu.ng",
      courses: "CSC 308, CSC 314",
    },
    {
      name: "Mrs. F. I. Okonjo",
      email: "okonjo@fuoye.edu.ng",
      courses: "CSC 302, CSC 312",
    },
  ];

  const handleFillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password@123");
    setError(null);
  };

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
        setError(data.error || "Invalid email address or password.");
        setLoading(false);
        return;
      }

      const role = data.user?.role;
      if (role === "STUDENT") {
        setError(
          "Access denied. This portal is exclusively for Academic Lecturers. Please use the Student Portal or Clock-In page."
        );
        // Clear auth cookie to avoid staying logged in under student role on lecturer portal
        fetch("/api/auth/logout", { method: "POST" });
        setLoading(false);
        return;
      }

      setSuccessMsg(`Welcome, ${data.user.name}! Accessing Lecturer Portal...`);
      setTimeout(() => {
        router.push("/lecturer");
      }, 700);
    } catch {
      setError("Network connection error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950">
      <div className="max-w-lg w-full space-y-6 my-8">
        {/* Navigation Back */}
        <div className="flex items-center justify-between text-xs text-emerald-300/80">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Homepage</span>
          </Link>
          <span className="font-mono text-[11px] uppercase tracking-wider text-amber-400 font-bold">
            Faculty Access
          </span>
        </div>

        {/* Portal Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wide shadow-inner">
            <GraduationCap className="w-4 h-4 text-emerald-400" />
            <span>Academic Staff & Faculty Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Lecturer Attendance Workspace
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Federal University Oye-Ekiti • Department of Computer Science. Launch attendance sessions, issue secret words, and review records.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-emerald-500/20 p-6 sm:p-8 space-y-6">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-700/50 text-rose-300 text-xs font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 text-xs font-semibold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Institutional Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="e.g. balogun@fuoye.edu.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-800/80 border border-slate-700 focus:border-emerald-500 rounded-xl p-3 pl-10 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <span className="text-[10px] text-slate-400">Default: Password@123</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your faculty password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-800/80 border border-slate-700 focus:border-emerald-500 rounded-xl p-3 pl-10 pr-10 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all font-medium"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing into Faculty Portal...</span>
                </>
              ) : (
                <>
                  <span>Sign In as Lecturer</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* 1-Click Demo Login Shortcuts */}
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Quick Demo Fill for Lecturers</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {demoLecturers.map((lec) => (
                <button
                  key={lec.email}
                  type="button"
                  onClick={() => handleFillDemo(lec.email)}
                  className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/80 hover:border-emerald-500/50 text-left transition-colors group"
                >
                  <div className="font-bold text-[11px] text-emerald-300 group-hover:text-emerald-200 truncate">
                    {lec.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">
                    {lec.email.split("@")[0]}
                  </div>
                  <div className="text-[9px] text-amber-300/80 mt-0.5 truncate">
                    {lec.courses}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Switch Links */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <Link
              href="/login"
              className="hover:text-amber-400 transition-colors flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Super Admin Login</span>
            </Link>
            <Link
              href="/clock-in"
              className="hover:text-emerald-400 transition-colors flex items-center gap-1"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Student Clock-In</span>
            </Link>
          </div>
        </div>

        {/* Security Notice */}
        <p className="text-[11px] text-center text-slate-500">
          FUOYE SAMS v1.0 • Authorized University Personnel Only • Tamper-Evident Session Tracking
        </p>
      </div>
    </div>
  );
}
