"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Search,
  Download,
  Filter,
  ArrowLeft,
  Calendar,
  Clock,
  Hash,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import * as XLSX from "xlsx";

export default function AdminAttendanceHistoryPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchMatric, setSearchMatric] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  useEffect(() => {
    fetchCourses();
    fetchAttendance();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await fetch("/api/courses");
      const data = await res.json();
      if (data.courses) setCourses(data.courses);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchMatric) params.set("matric", searchMatric);
      if (selectedCourse !== "ALL") params.set("course", selectedCourse);
      if (selectedStatus !== "ALL") params.set("status", selectedStatus);

      const res = await fetch(`/api/admin/attendance?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setRecords(data.records || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalCount = records.length;
  const onTimeCount = records.filter((r) => r.status === "PRESENT").length;
  const lateCount = records.filter((r) => r.status === "LATE").length;
  const onTimeRate = totalCount > 0 ? Math.round((onTimeCount / totalCount) * 100) : 0;

  const handleExportCSV = () => {
    if (records.length === 0) return;

    const exportData = records.map((r, i) => {
      const clockTime = new Date(r.clock_in_time);
      const isLate = r.status === "LATE";
      const timeWAT =
        clockTime.toLocaleTimeString("en-NG", {
          timeZone: "Africa/Lagos",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }) + " WAT";
      const dateWAT = clockTime.toLocaleDateString("en-NG", {
        timeZone: "Africa/Lagos",
      });

      return {
        "S/N": i + 1,
        "Matric Number": r.matric_number,
        "Full Name": r.full_name,
        "Course Code": r.session?.course?.course_code || "CSC 302",
        "Course Title": r.session?.course?.course_title || "Computer Science Lecture",
        "Clock-In Date (WAT)": dateWAT,
        "Clock-In Time (Nigeria Time • WAT)": timeWAT,
        "Admin Punctuality Evaluation": isLate ? "LATE" : "ON-TIME / EARLY",
        "Punctuality Breakdown": r.notes || (isLate ? "Late Arrival" : "On-Time"),
        "Receipt Token": r.attendance_token,
        "Security Flags": r.is_flagged ? `YES (${r.flag_reason})` : "CLEAN",
      };
    });


    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance_Ledger");
    XLSX.writeFile(wb, `FUOYE_CSC_Punctuality_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-xs font-semibold text-fuoye-green hover:underline mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Admin Console</span>
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Student Attendance & Punctuality Ledger
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800">
              Admin Exclusive
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real-time tracking of student clock-in timestamps, automated Early vs. Late categorization, and class audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAttendance}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-sm text-xs font-semibold flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={records.length === 0}
            className="py-2.5 px-4 rounded-xl bg-fuoye-green hover:bg-fuoye-green-dark text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel ({records.length})</span>
          </button>
        </div>
      </div>

      {/* Punctuality Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
            <span>Total Clock-Ins</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-black text-slate-900">{totalCount}</div>
          <p className="text-[11px] text-slate-500">Across all 300L lectures</p>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-sm bg-gradient-to-br from-white to-emerald-50/40 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700 uppercase">
            <span>On-Time / Early</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-800">{onTimeCount}</div>
          <p className="text-[11px] text-emerald-600 font-semibold">{onTimeRate}% on-time compliance rate</p>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm bg-gradient-to-br from-white to-amber-50/40 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-amber-700 uppercase">
            <span>Marked Late</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-black text-amber-800">{lateCount}</div>
          <p className="text-[11px] text-amber-700 font-semibold">Exceeded class grace period threshold</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3">
        {/* Matric Search */}
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by Matric Number (e.g. CSC/2022/1001)..."
            value={searchMatric}
            onChange={(e) => setSearchMatric(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchAttendance()}
            className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuoye-green uppercase placeholder:normal-case font-mono"
          />
        </div>

        {/* Course Filter */}
        <div>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuoye-green"
          >
            <option value="ALL">All 300L Courses</option>
            {courses.map((c) => (
              <option key={c.course_code} value={c.course_code}>
                {c.course_code} — {c.course_title}
              </option>
            ))}
          </select>
        </div>

        {/* Punctuality Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuoye-green"
          >
            <option value="ALL">All Punctuality Categories</option>
            <option value="PRESENT">🟢 On-Time / Early Only</option>
            <option value="LATE">🟡 Late Only</option>
          </select>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-fuoye-green" />
            <p>Loading punctuality ledger from Supabase...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 space-y-2">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-700">No attendance records found</p>
            <p className="text-[11px]">When students clock in for class, records will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Student Details</th>
                  <th className="px-4 py-3">Course Code</th>
                  <th className="px-4 py-3">Clock-In Time (WAT)</th>
                  <th className="px-4 py-3">Admin Punctuality Review</th>
                  <th className="px-4 py-3">Punctuality Details</th>
                  <th className="px-4 py-3">Receipt Token</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {records.map((r) => {
                  const clockTime = new Date(r.clock_in_time);
                  const isLate = r.status === "LATE";
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{r.full_name}</div>
                        <div className="text-[11px] font-mono text-slate-500">{r.matric_number}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-extrabold text-fuoye-green bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                          {r.session?.course?.course_code || "CSC 302"}
                        </span>
                        <div className="text-[11px] text-slate-500 truncate max-w-[180px] mt-1">
                          {r.session?.course?.course_title || "Computer Science Lecture"}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-slate-900 font-bold flex items-center gap-1.5 font-mono">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {clockTime.toLocaleTimeString("en-NG", {
                              timeZone: "Africa/Lagos",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                              hour12: true,
                            })}
                          </span>
                          <span className="text-[10px] font-bold text-fuoye-green bg-emerald-50 px-1 rounded border border-emerald-200">
                            WAT
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {clockTime.toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" })}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {isLate ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 shadow-sm">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>LATE</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>ON-TIME / EARLY</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold ${isLate ? "text-amber-800" : "text-emerald-700"}`}>
                          {r.notes || (isLate ? "Clocked in past grace period" : "Clocked in within grace period")}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-700">
                        <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">
                          {r.attendance_token}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
