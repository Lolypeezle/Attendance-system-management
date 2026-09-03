"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Users,
  FileSpreadsheet,
  History,
  Sliders,
  Database,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";

export default function AdminConsolePage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/courses"),
      fetch("/api/admin/audit-logs?limit=5"),
    ])
      .then(async ([uRes, cRes, aRes]) => {
        const u = await uRes.json();
        const c = await cRes.json();
        const a = await aRes.json();
        setStats({
          usersCount: u.users?.length || 0,
          coursesCount: c.courses?.length || 0,
          recentLogs: a.logs || [],
        });
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const adminModules = [
    {
      title: "Student Attendance History",
      desc: "Exclusive institutional attendance ledger across all 300L courses. Search by student matric number, filter by course, and export to Excel/CSV.",
      href: "/admin/attendance",
      icon: History,
      color: "bg-emerald-100 text-fuoye-green",
      badge: "Admin Exclusive",
    },
    {
      title: "User Management",
      desc: "Manage departmental lecturers, admins, and student credentials. Add personal logins, reset passwords, and toggle access.",
      href: "/admin/users",
      icon: Users,
      color: "bg-purple-100 text-purple-800",
      badge: "Account Control",
    },
    {
      title: "Bulk CSV Imports",
      desc: "Import enrolled students and course registries in bulk via CSV format with column mapping and auto-enrollment.",
      href: "/admin/imports",
      icon: FileSpreadsheet,
      color: "bg-amber-100 text-amber-800",
      badge: "Data Onboarding",
    },

    {
      title: "System Audit Logs",
      desc: "Tamper-evident, chronological trail of all attendance corrections, manual overrides, excuse reviews, and logins.",
      href: "/admin/audit-logs",
      icon: History,
      color: "bg-blue-100 text-blue-700",
      badge: "Immutable Trail",
    },
    {
      title: "Academic Policy Settings",
      desc: "Configure the 70% exam eligibility threshold, warning mark, FUOYE GPS geofence radius, and default durations.",
      href: "/admin/settings",
      icon: Sliders,
      color: "bg-purple-100 text-purple-700",
      badge: "System Parameters",
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-fuoye-green animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Super Administrator Control Center</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">System Administration</h1>
          <p className="text-xs text-slate-500">
            Federal University Oye-Ekiti • Department of Computer Science SAMS
          </p>
        </div>

        <a
          href="/api/admin/backup"
          className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-md flex items-center gap-1.5 self-start sm:self-auto transition-colors"
        >
          <Database className="w-4 h-4 text-amber-400" />
          <span>Export Database Dump (JSON)</span>
        </a>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Total User Accounts"
          value={stats?.usersCount || 0}
          subtitle="Lecturers, HODs, Admins"
          icon={<Users className="w-5 h-5 text-purple-700" />}
          color="purple"
        />
        <StatCard
          title="Registered Courses"
          value={stats?.coursesCount || 0}
          subtitle="100L to 500L curriculum"
          icon={<FileSpreadsheet className="w-5 h-5 text-emerald-700" />}
          color="emerald"
        />
        <StatCard
          title="System Status"
          value="Healthy"
          subtitle="Anti-fraud & DB online"
          icon={<CheckCircle2 className="w-5 h-5 text-blue-700" />}
          color="blue"
        />
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {adminModules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link
              key={mod.href}
              href={mod.href}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 rounded-xl ${mod.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 uppercase tracking-wider">
                    {mod.badge}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-4 group-hover:text-purple-700 transition-colors">
                  {mod.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {mod.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-bold text-purple-700 gap-1">
                <span>Access Module</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Recent Audit Logs Quick Glance */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Audit Actions</h2>
            <p className="text-xs text-slate-500">
              Live audit events logged by lecturers, students, and administrators.
            </p>
          </div>
          <Link
            href="/admin/audit-logs"
            className="text-xs font-bold text-fuoye-green hover:underline"
          >
            View Full Audit Trail &rarr;
          </Link>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {stats?.recentLogs?.length === 0 ? (
            <p className="py-4 text-center text-slate-400">No recent audit entries.</p>
          ) : (
            stats?.recentLogs?.map((log: any) => (
              <div key={log.id} className="py-3 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">{log.action}</span>
                  <span className="text-slate-500 ml-2">by {log.actor_name}</span>
                  <span className="text-[11px] text-slate-400 block font-mono mt-0.5">
                    Target: {log.entity_type} {log.entity_id ? `(${log.entity_id})` : ""}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
