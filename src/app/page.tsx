"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Clock,
  GraduationCap,
  LayoutDashboard,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  QrCode,
  MapPin,
  ArrowRight,
  Sparkles,
  Users,
  BookOpen,
} from "lucide-react";

export default function HomePage() {
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveSessions();
  }, []);

  const fetchActiveSessions = async () => {
    try {
      const res = await fetch("/api/sessions/active");
      if (res.ok) {
        const data = await res.json();
        setActiveSessions(data.sessions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-900 via-fuoye-green-dark to-slate-900 text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8">
        {/* Background decorative glow */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#F5B83D_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          {/* Institutional Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 text-amber-300 text-xs font-semibold shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Federal University Oye-Ekiti • Department of Computer Science</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Student Attendance <br />
            <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-emerald-200 bg-clip-text text-transparent">
              Management System (SAMS)
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-emerald-100/90 leading-relaxed">
            Tamper-resistant, mobile-first academic attendance tracking with instant clock-in,
            dynamic signed QR tokens, hardware-assisted anti-proxy validation, and real-time HOD analytics.
          </p>

          {/* Primary CTA Buttons */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              href="/clock-in"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold text-sm sm:text-base shadow-lg shadow-amber-500/30 hover:brightness-110 transition-all flex items-center gap-2 group"
            >
              <Clock className="w-5 h-5 text-slate-950" />
              <span>Clock In for Lecture</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/student"
              className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 text-white font-semibold text-sm sm:text-base transition-colors flex items-center gap-2"
            >
              <GraduationCap className="w-5 h-5 text-amber-300" />
              <span>Student Portal</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Active Sessions Floating Notice */}
      <section className="-mt-10 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 z-10">
        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Live Active Lecture Sessions
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Only sessions currently open by lecturers appear here
            </span>
          </div>

          <div className="mt-4">
            {loading ? (
              <div className="py-6 text-center text-xs text-slate-400 animate-pulse">
                Checking for active lectures...
              </div>
            ) : activeSessions.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">No Active Sessions Right Now</p>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  When a lecturer opens an attendance session in class, it will instantly show up here and in the clock-in form.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeSessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition-colors flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-fuoye-green">
                          {session.course.course_code}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                          {session.course.level}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 mt-1 line-clamp-1">
                        {session.course.course_title}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Lecturer: {session.lecturer.name}
                      </p>
                    </div>

                    <Link
                      href={`/clock-in?session=${session.id}`}
                      className="shrink-0 px-3.5 py-2 rounded-lg bg-fuoye-green text-white text-xs font-bold hover:bg-fuoye-green-dark shadow-sm transition-colors flex items-center gap-1.5"
                    >
                      <span>Clock In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Role Navigation Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Dedicated Portals by Role
          </h2>
          <p className="text-sm text-slate-600">
            Every stakeholder has tailored workflows built specifically for FUOYE academic requirements.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Student Card */}
          <Link
            href="/student"
            className="group bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-fuoye-green flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-fuoye-green transition-colors">
                Student Portal
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Check personal course attendance percentages, view 70% threshold warning indicators, and submit excuse requests with medical evidence.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-bold text-fuoye-green gap-1">
              <span>Access Student Desk</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Lecturer Card */}
          <Link
            href="/lecturer"
            className="group bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                Lecturer Hub
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Open lecture sessions, display live projector QR codes, watch real-time clock-in lists, approve student excuse requests, and export reports.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-bold text-amber-700 gap-1">
              <span>Manage Sessions</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* HOD Card */}
          <Link
            href="/hod"
            className="group bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                HOD Analytics
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Department-wide attendance rates, course heatmaps, weekly trends, at-risk students directory (&lt;70%), and lecturer performance reports.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-bold text-blue-700 gap-1">
              <span>View Department KPI</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Admin Card */}
          <Link
            href="/admin"
            className="group bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                Super Admin
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Bulk CSV imports for students & courses, user management, immutable audit logs, campus GPS geofence settings, and JSON database backup.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-bold text-purple-700 gap-1">
              <span>Admin Console</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* Anti-Fraud Highlights */}
      <section className="bg-slate-100/70 border-t border-slate-200 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-extrabold uppercase tracking-wider text-fuoye-green">
              Anti-Fraud & Integrity Suite
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Guaranteed Attendance Integrity
            </h2>
            <p className="text-xs text-slate-600 mt-2">
              Engineered with multi-layered defenses to eliminate proxy clock-ins and ensure accurate academic records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-fuoye-green flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Database Matric Verification</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Strict enrollment validation prevents unregistered students or invalid matric numbers from submitting. Unique constraints block duplicate clock-ins.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Signed QR Session Tokens</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Lecturers project dynamic HMAC-signed QR codes in class. Tokens expire automatically the instant the session is closed, stopping remote proxy links.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Device Fingerprint & Geofencing</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Automatic proxy clustering flags any device submitting for &gt;3 students. Optional FUOYE campus coordinate validation alerts lecturers to outside submissions.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
