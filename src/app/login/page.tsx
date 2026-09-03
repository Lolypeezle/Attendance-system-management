"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        setError(data.error || "Login failed. Please check your Supabase credentials.");
        setLoading(false);
        return;
      }

      setSuccessMsg(`Welcome, ${data.user.name || "Administrator"}! Redirecting to Admin Console...`);
      setTimeout(() => {
        router.push("/admin");
      }, 800);
    } catch {
      setError("Network error occurred. Please check your connection.");
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
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-100 text-fuoye-green text-xs font-bold shadow-sm">
            <ShieldCheck className="w-4 h-4 text-fuoye-green" />
            <span>Administrator Access</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Sign In to Console
          </h1>
          <p className="text-xs text-slate-500">
            Federal University Oye-Ekiti • Department of Computer Science
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Supabase Auth Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="e.g. your-email@domain.com or admin@fuoye.edu.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-xl p-3.5 pl-10 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuoye-green focus:border-transparent transition-all"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-xl p-3.5 pl-10 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuoye-green focus:border-transparent transition-all"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-fuoye-green text-white font-extrabold text-xs sm:text-sm hover:bg-fuoye-green-dark shadow-md focus:outline-none focus:ring-2 focus:ring-fuoye-green focus:ring-offset-2 disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating with Supabase...</span>
                </>
              ) : (
                <>
                  <span>Sign In with Supabase</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Verification Badge */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Connected directly to Supabase Auth Cloud</span>
          </div>

          {/* Quick Demo Pre-fills */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">
              Quick 1-Click Testing Accounts
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setDemoCredentials("admin@fuoye.edu.ng")}
                className="p-2.5 rounded-xl border border-purple-200 text-slate-700 bg-purple-50/70 hover:bg-purple-100 transition-colors text-left"
              >
                <span className="font-bold block text-purple-950">Engr. Fashola</span>
                <span className="text-[10px] text-purple-700 font-semibold">Super Admin</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoCredentials("balogun@fuoye.edu.ng")}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-700 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 transition-colors text-left"
              >
                <span className="font-bold block text-slate-900">Dr. Balogun</span>
                <span className="text-[10px] text-amber-700 font-semibold">Lecturer</span>
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-400">
              Or type any email and password registered in your Supabase Auth dashboard.
            </p>
          </div>
        </div>

        {/* Return to Student Clock-In */}
        <div className="text-center text-xs text-slate-500">
          Student recording attendance?{" "}
          <Link href="/clock-in" className="text-fuoye-green font-extrabold hover:underline">
            Go to Public Clock-In
          </Link>
        </div>
      </div>
    </div>
  );
}
