"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  Download,
  Users,
  BookOpen,
  Calendar,
  Clock,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Printer,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";

interface CourseAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseCode?: string;
  courseTitle?: string;
}

export function CourseAttendanceModal({
  isOpen,
  onClose,
  courseId,
  courseCode: initialCourseCode,
  courseTitle: initialCourseTitle,
}: CourseAttendanceModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("CLOCKED_IN"); // "ALL", "CLOCKED_IN", "ELIGIBLE", "AT_RISK", "NOT_CLOCKED_IN"
  const [expandedStudentMatric, setExpandedStudentMatric] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && courseId) {
      fetchCourseAttendance(selectedSessionId);
    }
  }, [isOpen, courseId, selectedSessionId]);

  const fetchCourseAttendance = async (sessionIdParam: string = "ALL") => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/lecturer/course-attendance?courseId=${courseId}${
        sessionIdParam !== "ALL" ? `&sessionId=${sessionIdParam}` : ""
      }`;
      const res = await fetch(url);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Failed to load course attendance.");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Error loading student attendance.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const course = data?.course || {
    courseCode: initialCourseCode || "COURSE",
    courseTitle: initialCourseTitle || "Course Attendance",
    units: 3,
    level: "300L",
  };

  const allStudents: any[] = data?.students || [];
  const sessions: any[] = data?.sessions || [];
  const stats = data?.stats || {
    totalSessionsHeld: sessions.length,
    totalClockedInStudents: allStudents.filter((s) => s.timesClockedIn > 0).length,
    totalRecords: 0,
  };

  // Filter students based on search and status
  const filteredStudents = allStudents.filter((st) => {
    // Status filter
    if (statusFilter === "CLOCKED_IN" && st.timesClockedIn === 0) return false;
    if (statusFilter === "NOT_CLOCKED_IN" && st.timesClockedIn > 0) return false;
    if (statusFilter === "ELIGIBLE" && (st.timesClockedIn === 0 || st.attendancePercentage < 70)) return false;
    if (statusFilter === "AT_RISK" && (st.timesClockedIn === 0 || st.attendancePercentage >= 70)) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchName = st.fullName?.toLowerCase().includes(q);
      const matchMatric = st.matricNumber?.toLowerCase().includes(q);
      if (!matchName && !matchMatric) return false;
    }

    return true;
  });

  const exportToExcel = () => {
    const code = course.courseCode || "COURSE";
    const dateStr = new Date().toLocaleDateString("en-NG").replace(/\//g, "-");

    const exportRows = filteredStudents.map((st, idx) => ({
      "S/N (#)": idx + 1,
      "Student Full Name": st.fullName,
      "Matriculation Number": st.matricNumber,
      "Course Code": code,
      "Course Title": course.courseTitle,
      "Lectures Attended": st.timesClockedIn,
      "Total Lectures Held": st.totalSessionsHeld,
      "Attendance Rate (%)": `${st.attendancePercentage}%`,
      "Exam Eligibility (70% min)":
        st.timesClockedIn === 0
          ? "NOT CLOCKED IN"
          : st.attendancePercentage >= 70
          ? "ELIGIBLE (QUALIFIED)"
          : st.attendancePercentage >= 50
          ? "WARNING (LOW ATTENDANCE)"
          : "BARRED (BELOW 70%)",
      "Latest Clock-In (WAT)": st.lastClockInTime
        ? new Date(st.lastClockInTime).toLocaleString("en-NG", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "Never",
      "Proxy Integrity": st.isFlaggedAny ? "FLAGGED: Proxy Suspected" : "VERIFIED HARDWARE",
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${code}_Attendance`);
    XLSX.writeFile(wb, `${code}_ClockedIn_Students_Roster_${dateStr}.xlsx`);
  };

  const toggleStudentExpand = (matric: string) => {
    setExpandedStudentMatric(expandedStudentMatric === matric ? null : matric);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50/80 shrink-0">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-base font-black px-2.5 py-0.5 rounded-lg bg-emerald-100 text-fuoye-green border border-emerald-200">
                {course.courseCode}
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800">
                {course.level} • {course.units} Units
              </span>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-fuoye-green" />
                <span>{stats.totalClockedInStudents} Students Clocked In</span>
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                {stats.totalSessionsHeld} Session{stats.totalSessionsHeld === 1 ? "" : "s"} Held
              </span>
            </div>
            <h2 className="text-lg font-black text-slate-900 leading-tight">
              {course.courseTitle}
            </h2>
            <p className="text-xs text-slate-500">
              Complete student clock-in roster with verified names, matriculation numbers, and attendance eligibility.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Action Ribbon */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search student name or matric..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 pl-8 text-slate-900 focus:outline-none focus:ring-2 focus:ring-fuoye-green font-medium"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
            </div>

            {/* Session Filter */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 hidden sm:inline">Lecture:</span>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-fuoye-green flex-1 sm:flex-initial"
              >
                <option value="ALL">All Course Lectures ({sessions.length})</option>
                {sessions.map((s: any, idx: number) => (
                  <option key={s.id} value={s.id}>
                    Lecture #{sessions.length - idx}:{" "}
                    {new Date(s.openedAt).toLocaleDateString("en-NG", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    ({s.secretWord}) - {s.clockedInCount} in
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-fuoye-green flex-1 sm:flex-initial"
              >
                <option value="CLOCKED_IN">Clocked-In Only ({stats.totalClockedInStudents})</option>
                <option value="ALL">All Students ({allStudents.length})</option>
                <option value="ELIGIBLE">Eligible (70%+ Attendance)</option>
                <option value="AT_RISK">At Risk (&lt;70% Attendance)</option>
                <option value="NOT_CLOCKED_IN">Never Clocked In</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => fetchCourseAttendance(selectedSessionId)}
              className="p-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-colors cursor-pointer"
              title="Refresh Roster"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>

            {filteredStudents.length > 0 && (
              <button
                onClick={exportToExcel}
                className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Download full course clock-in roster as an Excel spreadsheet"
              >
                <Download className="w-3.5 h-3.5 text-purple-700" />
                <span>Export Excel (.xlsx)</span>
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4 styled-scrollbar">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-fuoye-green animate-spin" />
              <p className="text-xs font-bold text-slate-600">Loading course clock-in roster...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-rose-900">{error}</p>
              <button
                onClick={() => fetchCourseAttendance(selectedSessionId)}
                className="px-4 py-2 rounded-xl bg-fuoye-green text-white text-xs font-bold"
              >
                Retry Loading
              </button>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">No Students Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? `No students matching "${searchQuery}" for the selected filter.`
                  : "No students have clocked in for this course yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider z-10 shadow-2xs">
                  <tr>
                    <th className="py-3 px-3.5 bg-slate-100 w-12">#</th>
                    <th className="py-3 px-4 bg-slate-100">Student Full Name</th>
                    <th className="py-3 px-4 bg-slate-100">Matriculation Number</th>
                    <th className="py-3 px-4 bg-slate-100">Clock-Ins Attended</th>
                    <th className="py-3 px-4 bg-slate-100">Attendance Rate</th>
                    <th className="py-3 px-4 bg-slate-100">Exam Eligibility</th>
                    <th className="py-3 px-4 bg-slate-100">Latest Clock-In</th>
                    <th className="py-3 px-3.5 bg-slate-100 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStudents.map((st, idx) => {
                    const isExpanded = expandedStudentMatric === st.matricNumber;
                    const isClocked = st.timesClockedIn > 0;

                    return (
                      <React.Fragment key={st.matricNumber || idx}>
                        <tr
                          className={`hover:bg-slate-50 transition-colors ${
                            st.isFlaggedAny ? "bg-rose-50/40" : ""
                          }`}
                        >
                          {/* Number (#) */}
                          <td className="py-3 px-3.5 text-slate-400 font-mono font-bold">
                            {st.sn || idx + 1}
                          </td>

                          {/* Student Full Name */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <span>{st.fullName}</span>
                              {st.isFlaggedAny && (
                                <span
                                  className="text-rose-500 cursor-pointer"
                                  title={`Suspicious submission flagged: ${st.flagReasons?.join(", ")}`}
                                >
                                  <ShieldAlert className="w-3.5 h-3.5 inline" />
                                </span>
                              )}
                            </div>
                            {st.level && (
                              <span className="text-[10px] text-slate-400">{st.level}</span>
                            )}
                          </td>

                          {/* Matriculation Number */}
                          <td className="py-3 px-4">
                            <span className="font-mono font-black text-fuoye-green text-xs sm:text-sm tracking-wide">
                              {st.matricNumber}
                            </span>
                          </td>

                          {/* Clock-Ins Attended */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs">
                                {st.timesClockedIn}
                              </span>
                              <span className="text-slate-400 text-[11px]">
                                / {st.totalSessionsHeld} {st.totalSessionsHeld === 1 ? "lecture" : "lectures"}
                              </span>
                            </div>
                          </td>

                          {/* Attendance Rate */}
                          <td className="py-3 px-4">
                            <div className="w-24 space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-bold">
                                <span
                                  className={
                                    st.attendancePercentage >= 70
                                      ? "text-emerald-700"
                                      : st.attendancePercentage >= 50
                                      ? "text-amber-700"
                                      : "text-rose-700"
                                  }
                                >
                                  {st.attendancePercentage}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    st.attendancePercentage >= 70
                                      ? "bg-emerald-500"
                                      : st.attendancePercentage >= 50
                                      ? "bg-amber-500"
                                      : "bg-rose-500"
                                  }`}
                                  style={{ width: `${Math.min(st.attendancePercentage, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Exam Eligibility */}
                          <td className="py-3 px-4">
                            {st.timesClockedIn === 0 ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                Unmarked
                              </span>
                            ) : st.attendancePercentage >= 70 ? (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Eligible</span>
                              </span>
                            ) : st.attendancePercentage >= 50 ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1 w-fit">
                                <AlertTriangle className="w-3 h-3 text-amber-700" />
                                <span>Warning</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 w-fit block">
                                Barred (&lt;70%)
                              </span>
                            )}
                          </td>

                          {/* Latest Clock-In (WAT) */}
                          <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                            {st.lastClockInTime ? (
                              <div>
                                <span>
                                  {new Date(st.lastClockInTime).toLocaleDateString("en-NG", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>{" "}
                                <span className="text-slate-400">
                                  {new Date(st.lastClockInTime).toLocaleTimeString("en-NG", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Details Button */}
                          <td className="py-3 px-3.5 text-right">
                            {isClocked ? (
                              <button
                                onClick={() => toggleStudentExpand(st.matricNumber)}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                                title={isExpanded ? "Hide class breakdown" : "View class breakdown"}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-fuoye-green" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            ) : (
                              <span className="text-slate-300 text-[10px]">No logs</span>
                            )}
                          </td>
                        </tr>

                        {/* Expanded Student Session Logs */}
                        {isExpanded && isClocked && (
                          <tr className="bg-emerald-50/30">
                            <td colSpan={8} className="p-3.5 pl-12">
                              <div className="space-y-2">
                                <span className="text-[11px] font-black uppercase text-emerald-950 tracking-wider flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-fuoye-green" />
                                  <span>
                                    Class Attendance History for {st.fullName} ({st.matricNumber})
                                  </span>
                                </span>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {st.records.map((r: any, rIdx: number) => (
                                    <div
                                      key={r.id || rIdx}
                                      className="p-2.5 rounded-xl bg-white border border-emerald-200 shadow-2xs space-y-1 text-xs"
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-800">
                                          {r.sessionDate
                                            ? new Date(r.sessionDate).toLocaleDateString("en-NG", {
                                                weekday: "short",
                                                month: "short",
                                                day: "numeric",
                                              })
                                            : "Lecture Session"}
                                        </span>
                                        <span
                                          className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                                            r.status === "PRESENT"
                                              ? "bg-emerald-100 text-emerald-800"
                                              : r.status === "LATE"
                                              ? "bg-amber-100 text-amber-800"
                                              : "bg-blue-100 text-blue-800"
                                          }`}
                                        >
                                          {r.status}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                                        <span>
                                          Clocked at:{" "}
                                          {new Date(r.clockInTime).toLocaleTimeString("en-NG", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                            second: "2-digit",
                                          })}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100 text-slate-500">
                                        <span>Word: <strong>{r.secretWord}</strong></span>
                                        <span className="font-mono text-fuoye-green font-bold">
                                          {r.attendanceToken}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div>
            Showing <strong>{filteredStudents.length}</strong> of{" "}
            <strong>{stats.totalClockedInStudents}</strong> clocked-in student(s) for{" "}
            <strong className="text-fuoye-green">{course.courseCode}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors cursor-pointer"
          >
            Close Roster
          </button>
        </div>
      </div>
    </div>
  );
}
