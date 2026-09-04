"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  KeyRound,
  History,
  Calendar,
  Clock,
  BookOpen,
  Users,
  Search,
  Download,
  Check,
  Copy,
  ArrowLeft,
  Loader2,
  Filter,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ExternalLink,
  FileSpreadsheet,
  X,
  Play,
  Sparkles,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import * as XLSX from "xlsx";

export default function LecturerHistoryPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalClockedIn: 0,
    uniqueSecretWords: 0,
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Drilldown Modal
  const [activeSessionModal, setActiveSessionModal] = useState<any>(null);
  const [sessionRecords, setSessionRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordSearch, setRecordSearch] = useState("");
  const [recordFilterStatus, setRecordFilterStatus] = useState("ALL");

  useEffect(() => {
    fetchHistoryData();
  }, [selectedCourse, selectedStatus]);

  const fetchHistoryData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCourse !== "ALL") params.set("courseId", selectedCourse);
      if (selectedStatus !== "ALL") params.set("status", selectedStatus);

      const [historyRes, coursesRes] = await Promise.all([
        fetch(`/api/lecturer/history?${params.toString()}`),
        fetch("/api/courses"),
      ]);

      const historyData = await historyRes.json();
      const coursesData = await coursesRes.json();

      if (historyData.sessions) {
        setSessions(historyData.sessions);
      }
      if (historyData.stats) {
        setStats(historyData.stats);
      }
      if (coursesData.courses) {
        setCourses(coursesData.courses);
      }
    } catch (err) {
      console.error("Failed to load history data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecretWord = (sessionId: string, secretWord: string) => {
    navigator.clipboard.writeText(secretWord);
    setCopiedId(sessionId);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const openSessionAttendanceModal = async (session: any) => {
    setActiveSessionModal(session);
    setLoadingRecords(true);
    setRecordSearch("");
    setRecordFilterStatus("ALL");

    try {
      const res = await fetch(`/api/lecturer/history?sessionId=${session.id}`);
      const data = await res.json();
      setSessionRecords(data.records || []);
    } catch (err) {
      console.error("Failed to fetch session records:", err);
      setSessionRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  // Export single session attendance to Excel
  const exportSessionToExcel = (session: any, recordsToExport: any[]) => {
    const courseCode = session.course?.course_code || "COURSE";
    const secret = session.secretWord || "SECRET";
    const dateStr = new Date(session.opened_at).toLocaleDateString("en-NG");

    const exportRows = recordsToExport.map((r, index) => ({
      "S/N": index + 1,
      "Matric Number": r.matric_number,
      "Full Name": r.full_name,
      Status: r.status,
      "Clock-In Time (WAT)": new Date(r.clock_in_time).toLocaleTimeString("en-NG", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      "Secret Word Used": secret,
      "Verification Token": r.attendance_token,
      "Flagged Status": r.is_flagged ? `Flagged: ${r.flag_reason || "Anomaly"}` : "Verified Valid",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Register");

    const fileName = `${courseCode}_${secret}_Attendance_${dateStr.replace(/\//g, "-")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Filtered Sessions
  const filteredSessions = sessions.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.secretWord?.toLowerCase().includes(q) ||
      s.course?.course_code?.toLowerCase().includes(q) ||
      s.course?.course_title?.toLowerCase().includes(q)
    );
  });

  // Filtered records inside modal
  const modalFilteredRecords = sessionRecords.filter((r) => {
    if (recordFilterStatus !== "ALL" && r.status !== recordFilterStatus) return false;
    if (recordSearch) {
      const q = recordSearch.toLowerCase();
      return (
        r.matric_number?.toLowerCase().includes(q) ||
        r.full_name?.toLowerCase().includes(q) ||
        r.attendance_token?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/lecturer"
              className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              title="Back to Lecturer Workspace"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-fuoye-green text-xs font-bold">
              <History className="w-3.5 h-3.5" />
              <span>Academic Attendance Ledger</span>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            Lecture & Secret Word Attendance History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Comprehensive audit register of lecture dates, secret words issued, and verified student clock-in records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/lecturer"
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <span>Lecturer Operations Desk</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Lectures Recorded"
          value={stats.totalSessions}
          subtitle="Total lecture sessions held"
          icon={<BookOpen className="w-5 h-5 text-emerald-700" />}
          color="emerald"
        />
        <StatCard
          title="Secret Words Issued"
          value={stats.uniqueSecretWords}
          subtitle="Unique passcode tokens"
          icon={<KeyRound className="w-5 h-5 text-amber-700" />}
          color="gold"
        />
        <StatCard
          title="Total Clock-Ins"
          value={stats.totalClockedIn}
          subtitle="Student attendances recorded"
          icon={<Users className="w-5 h-5 text-blue-700" />}
          color="blue"
        />
        <StatCard
          title="Avg Class Attendance"
          value={
            stats.totalSessions > 0
              ? `${Math.round(stats.totalClockedIn / stats.totalSessions)} students`
              : "0 students"
          }
          subtitle="Average per lecture session"
          icon={<CheckCircle2 className="w-5 h-5 text-purple-700" />}
          color="purple"
        />
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Course filter */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Course:</span>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-fuoye-green"
            >
              <option value="ALL">All Assigned Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.course_code} - {c.course_title}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <span>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-fuoye-green"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Live / Open Sessions</option>
              <option value="CLOSED">Completed / Closed</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="Search secret word or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 pl-8 text-slate-900 focus:outline-none focus:ring-1 focus:ring-fuoye-green font-medium"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
        </div>
      </div>

      {/* Sessions Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Lecture Attendance & Secret Word Records
            </h2>
            <p className="text-xs text-slate-500">
              Showing {filteredSessions.length} recorded lecture sessions
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-fuoye-green animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Loading attendance ledger...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Lecture Sessions Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No lecture sessions match the current search filters. Start a new session from your lecturer dashboard.
            </p>
            <Link
              href="/lecturer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-fuoye-green text-white text-xs font-bold hover:bg-fuoye-green-dark transition-colors"
            >
              <span>Go to Operations Desk</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto styled-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider z-10 shadow-2xs">
                <tr>
                  <th className="py-3.5 px-4 bg-slate-100">Course Details</th>
                  <th className="py-3.5 px-4 bg-slate-100">Lecture Date & WAT Time</th>
                  <th className="py-3.5 px-4 bg-slate-100">Assigned Secret Word</th>
                  <th className="py-3.5 px-4 bg-slate-100">Session Status</th>
                  <th className="py-3.5 px-4 bg-slate-100">Attendance Summary</th>
                  <th className="py-3.5 px-4 text-right bg-slate-100">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredSessions.map((sess) => {
                  const dateObj = new Date(sess.opened_at);
                  const isLive = sess.status === "OPEN";

                  return (
                    <tr key={sess.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Course */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-black text-fuoye-green">
                            {sess.course?.course_code}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {sess.course?.level || "300L"}
                          </span>
                        </div>
                        <div className="text-xs text-slate-800 font-semibold mt-0.5 max-w-xs truncate">
                          {sess.course?.course_title}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Duration: {sess.duration_minutes} mins • Late threshold: {sess.late_threshold_minutes}m
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {dateObj.toLocaleDateString("en-NG", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {dateObj.toLocaleTimeString("en-NG", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            WAT
                          </span>
                        </div>
                      </td>

                      {/* Secret Word */}
                      <td className="py-4 px-4">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200">
                          <KeyRound className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                          <span className="font-mono font-black text-xs sm:text-sm text-purple-950 tracking-wider">
                            {sess.secretWord}
                          </span>
                          <button
                            onClick={() => handleCopySecretWord(sess.id, sess.secretWord)}
                            title="Copy Secret Word"
                            className="p-1 rounded-md text-purple-600 hover:text-purple-900 hover:bg-purple-100 transition-colors ml-1"
                          >
                            {copiedId === sess.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isLive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>LIVE ACTIVE</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                            CONCLUDED
                          </span>
                        )}
                      </td>

                      {/* Attendance Breakdown */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="text-xs font-black text-slate-900">
                            {sess.counts?.total || 0} Students Clocked In
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Present: {sess.counts?.present || 0}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              Late: {sess.counts?.late || 0}
                            </span>
                            {sess.counts?.excused > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                Excused: {sess.counts?.excused}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => openSessionAttendanceModal(sess)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-fuoye-green hover:bg-emerald-100 text-xs font-bold border border-emerald-200 transition-colors"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>View Roster</span>
                        </button>
                        <Link
                          href={`/lecturer/sessions/${sess.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition-colors"
                        >
                          <span>Session Room</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Attendance Sheet Drill-Down Modal */}
      {activeSessionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-black text-fuoye-green">
                    {activeSessionModal.course?.course_code}
                  </span>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-purple-700" />
                    <span>Secret Word: {activeSessionModal.secretWord}</span>
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      activeSessionModal.status === "OPEN"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {activeSessionModal.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {activeSessionModal.course?.course_title}
                </h3>
                <p className="text-xs text-slate-500">
                  Lecture Date:{" "}
                  {new Date(activeSessionModal.opened_at).toLocaleDateString("en-NG", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  at{" "}
                  {new Date(activeSessionModal.opened_at).toLocaleTimeString("en-NG", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  WAT
                </p>
              </div>

              <button
                onClick={() => setActiveSessionModal(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Filter Bar */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-60">
                  <input
                    type="text"
                    placeholder="Search matric, name, or token..."
                    value={recordSearch}
                    onChange={(e) => setRecordSearch(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2 pl-8"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                <select
                  value={recordFilterStatus}
                  onChange={(e) => setRecordFilterStatus(e.target.value)}
                  className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl p-2"
                >
                  <option value="ALL">All Attendees</option>
                  <option value="PRESENT">Present Only</option>
                  <option value="LATE">Late Only</option>
                  <option value="EXCUSED">Excused Only</option>
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => exportSessionToExcel(activeSessionModal, modalFilteredRecords)}
                  className="px-3.5 py-2 rounded-xl bg-fuoye-green text-white text-xs font-bold hover:bg-fuoye-green-dark flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Sheet (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Modal Table Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingRecords ? (
                <div className="p-12 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-fuoye-green animate-spin" />
                  <p className="text-xs text-slate-500 font-medium">
                    Loading student clock-in records...
                  </p>
                </div>
              ) : modalFilteredRecords.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <p className="text-xs text-slate-500 font-medium">
                    No students clocked in for this session matching the criteria.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[55vh] overflow-y-auto styled-scrollbar rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider z-10 shadow-2xs">
                      <tr>
                        <th className="py-2.5 px-3 bg-slate-100">#</th>
                        <th className="py-2.5 px-3 bg-slate-100">Matric Number</th>
                        <th className="py-2.5 px-3 bg-slate-100">Student Name</th>
                        <th className="py-2.5 px-3 bg-slate-100">Status</th>
                        <th className="py-2.5 px-3 bg-slate-100">Clock-In Time</th>
                        <th className="py-2.5 px-3 bg-slate-100">Verification Slip</th>
                        <th className="py-2.5 px-3 bg-slate-100">Anti-Proxy Integrity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {modalFilteredRecords.map((rec, index) => (
                        <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-slate-400 font-mono">{index + 1}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {rec.matric_number}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800">{rec.full_name}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                                rec.status === "PRESENT"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : rec.status === "LATE"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {rec.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-mono">
                            {new Date(rec.clock_in_time).toLocaleTimeString("en-NG", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono text-xs font-bold text-fuoye-green px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                              {rec.attendance_token}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {rec.is_flagged ? (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                Flagged ({rec.flag_reason || "Suspicious"})
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                <span>Hardware Verified</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
              <span>
                Total Attendees Recorded: <strong>{modalFilteredRecords.length}</strong>
              </span>
              <button
                onClick={() => setActiveSessionModal(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors"
              >
                Close Register
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
