"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Users,
  FileSpreadsheet,
  History,
  Sliders,
  ArrowRight,
  CheckCircle2,
  Loader2,
  KeyRound,
  GraduationCap,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";

export default function AdminConsolePage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/users"),
      fetch("/api/courses"),
    ])
      .then(async ([uRes, cRes]) => {
        const u = await uRes.json();
        const c = await cRes.json();
        setStats({
          usersCount: u.users?.length || 0,
          coursesCount: c.courses?.length || 0,
        });
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const adminModules = [
    {
      title: "Add & Manage Faculty Lecturers",
      desc: "Onboard new departmental lecturers, assign 300L courses, configure credentials, and manage portal access permissions.",
      href: "/admin/users",
      icon: GraduationCap,
      color: "bg-emerald-100 text-fuoye-green",
      badge: "Lecturer Portals",
    },
    {
      title: "Lecture Schedules & Secret Words",
      desc: "Fix lecture dates and start times in Nigeria Time (WAT). Set unique secret words given to physical class attendees for clocking in.",
      href: "/admin/sessions",
      icon: KeyRound,
      color: "bg-blue-100 text-blue-700",
      badge: "Passcode & Time Control",
    },
    {
      title: "Student Attendance History",
      desc: "Exclusive institutional attendance ledger across all 300L courses. Search by student matric number, filter by course, and export to Excel/CSV.",
      href: "/admin/attendance",
      icon: History,
      color: "bg-purple-100 text-purple-700",
      badge: "Admin Exclusive",
    },
    {
      title: "All Users & Access Management",
      desc: "Manage departmental lecturers, admins, and student credentials. Add logins, reset passwords, and toggle access.",
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
      title: "Academic Policy Settings",
      desc: "Configure the 70% exam eligibility threshold, warning mark, and lecture session defaults.",
      href: "/admin/settings",
      icon: Sliders,
      color: "bg-slate-100 text-slate-700",
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

        <div className="flex items-center gap-2">
          <Link
            href="/admin/users"
            className="px-4 py-2.5 rounded-xl bg-fuoye-green text-white text-xs font-bold hover:bg-fuoye-green-dark flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Add Faculty Lecturer</span>
          </Link>
          <Link
            href="/lecturer"
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <span>Lecturer View</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Total User Accounts"
          value={stats?.usersCount || 0}
          subtitle="Lecturers, Admins"
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
          subtitle="Database online"
          icon={<CheckCircle2 className="w-5 h-5 text-blue-700" />}
          color="blue"
        />
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    </div>
  );
}

