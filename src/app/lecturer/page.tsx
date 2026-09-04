"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Play,
  Clock,
  BookOpen,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  Plus,
  X,
  Loader2,
  ArrowRight,
  QrCode,
  MapPin,
  ExternalLink,
  KeyRound,
  RefreshCw,
  Sparkles,
  LayoutDashboard,
  History,
  Search,
  Download,
} from "lucide-react";
import * as XLSX from "xlsx";
import { StatCard } from "@/components/StatCard";
import { QRCodeModal } from "@/components/QRCodeModal";
import {
  generateRandomSecretWord,
  getRemainingExpirySeconds,
  isSessionAttendanceExpired,
} from "@/lib/tokens";

export default function LecturerPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // New Session Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [lateThreshold, setLateThreshold] = useState("15");
  const [secretWord, setSecretWord] = useState("");
  const [requireQr, setRequireQr] = useState(true);
  const [requireGeo, setRequireGeo] = useState(false);
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Quick QR preview modal
  const [qrModalSession, setQrModalSession] = useState<any>(null);

  // Clocked-in students roster modal
  const [attendanceModalSession, setAttendanceModalSession] = useState<any>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState("ALL");

  useEffect(() => {
    loadData();
  }, []);

  const openNewSessionModal = () => {
    setSecretWord(generateRandomSecretWord());
    setModalError(null);
    setIsModalOpen(true);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [coursesRes, sessionsRes, meRes] = await Promise.all([
        fetch("/api/courses"),
        fetch("/api/sessions"),
        fetch("/api/auth/me"),
      ]);

      const coursesData = await coursesRes.json();
      const sessionsData = await sessionsRes.json();
      const meData = await meRes.json();

      setCourses(coursesData.courses || []);
      setSessions(sessionsData.sessions || []);
      if (meData.user) {
        setCurrentUser(meData.user);
      }

      if (coursesData.courses?.length > 0) {
        setSelectedCourseId(coursesData.courses[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setModalError(null);

    const activeWord = (secretWord || generateRandomSecretWord()).trim().toUpperCase();

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourseId,
          durationMinutes: parseInt(durationMinutes, 10),
          lateThresholdMinutes: parseInt(lateThreshold, 10),
          secretWord: activeWord,
          requireQr: true,
          requireGeo,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error || "Failed to start session.");
        setCreating(false);
        return;
      }

      setIsModalOpen(false);
      window.location.href = `/lecturer/sessions/${data.session.id}`;
    } catch {
      setModalError("Network error occurred.");
      setCreating(false);
    }
  };

  const activeSessions = sessions.filter((s) => s.status === "OPEN");
  const closedSessions = sessions.filter((s) => s.status === "CLOSED");

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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-fuoye-green text-xs font-bold">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>
              {currentUser ? `${currentUser.name} • ${currentUser.role}` : "Faculty Member"}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Course & Session Workspace</h1>
          <p className="text-xs text-slate-500">
            Launch attendance sessions, broadcast projector QR codes, and review clock-in feeds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/lecturer/history"
            className="px-4 py-2.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 hover:bg-purple-100 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <History className="w-4 h-4 text-purple-700" />
            <span>Secret Word & Attendance History</span>
          </Link>
          <Link
            href="/lecturer/excuses"
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <FileText className="w-4 h-4 text-fuoye-green" />
            <span>Student Excuses</span>
          </Link>
          <Link
            href="/lecturer/reports"
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4 text-amber-600" />
            <span>Export Reports</span>
          </Link>
          <button
            onClick={openNewSessionModal}
            className="px-4 py-2.5 rounded-xl bg-fuoye-green text-white text-xs font-extrabold hover:bg-fuoye-green-dark shadow-md flex items-center gap-1.5 transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start New Session</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Assigned Courses"
          value={courses.length}
          subtitle="Department courses"
          icon={<BookOpen className="w-5 h-5 text-emerald-700" />}
          color="emerald"
        />
        <StatCard
          title="Active Live Sessions"
          value={activeSessions.length}
          subtitle="Open for clock-in right now"
          icon={<Clock className="w-5 h-5 text-amber-700" />}
          color="gold"
        />
        <StatCard
          title="Total Past Sessions"
          value={closedSessions.length}
          subtitle="Conducted this semester"
          icon={<CheckCircle2 className="w-5 h-5 text-blue-700" />}
          color="blue"
        />
        <StatCard
          title="Total Clock-Ins"
          value={sessions.reduce((acc, s) => acc + (s.clockedInCount || s.records?.length || s._count?.attendance_records || 0), 0)}
          subtitle="Recorded student entries"
          icon={<Users className="w-5 h-5 text-purple-700" />}
          color="purple"
        />
      </div>

      {/* Active Sessions Live Spotlight */}
      {activeSessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Active Lecture Room Sessions In Progress
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeSessions.map((session) => (
              <div
                key={session.id}
                className="bg-white rounded-2xl p-5 border-2 border-emerald-500/80 shadow-lg shadow-emerald-900/5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-black text-fuoye-green">
                      {session.course?.course_code || "Course"}
                    </span>
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 animate-pulse">
                      ● LIVE NOW
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    {session.course?.course_title || "Lecture Session"}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Opened at: {new Date(session.opened_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • Duration: {session.duration_minutes} mins
                  </p>

                  <div className="mt-3 p-2.5 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-purple-700 shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-purple-600 block">Class Unique Word</span>
                        <span className="font-mono text-xs sm:text-sm font-black text-purple-950 tracking-wider">
                          {session.secretWord || session.qr_token}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setQrModalSession(session)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1 shadow-xs transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Display QR</span>
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <button
                      onClick={() => {
                        setAttendanceModalSession(session);
                        setStudentSearch("");
                        setStudentStatusFilter("ALL");
                      }}
                      className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Click to view student names & matric numbers"
                    >
                      <Users className="w-3.5 h-3.5 text-fuoye-green" />
                      <span>Clocked In: {session.clockedInCount || session.records?.length || session._count?.attendance_records || 0} Students (View List)</span>
                    </button>
                    <span className={`px-2.5 py-1 rounded-lg font-bold border flex items-center gap-1 ${
                      session.isExpired
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200"
                    }`}>
                      <Clock className="w-3 h-3" />
                      {session.isExpired ? "20m Expiry Elapsed" : "20m Window Active"}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Lecturer: {session.lecturer?.name || session.course?.lecturer?.name || currentUser?.name || "Faculty Lecturer"}
                  </span>
                  <Link
                    href={`/lecturer/sessions/${session.id}`}
                    className="px-4 py-2 rounded-xl bg-fuoye-green text-white text-xs font-bold hover:bg-fuoye-green-dark shadow-sm flex items-center gap-1.5 transition-colors"
                  >
                    <span>Enter Live Lecture Room</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Courses & Session History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Past Lecture Sessions</h2>
            <p className="text-xs text-slate-500">
              Completed sessions, secret words used, and recorded attendance.
            </p>
          </div>
          <Link
            href="/lecturer/history"
            className="inline-flex items-center gap-1 text-xs font-bold text-fuoye-green hover:underline"
          >
            <span>Open Detailed Attendance Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Course</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Secret Word</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Clocked In</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No sessions created yet. Click &quot;Start New Session&quot; to open attendance.
                  </td>
                </tr>
              ) : (
                sessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 block">
                        {sess.course?.course_code || "Course"}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {sess.course?.course_title || "Lecture Session"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {new Date(sess.opened_at).toLocaleDateString("en-NG", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 font-mono font-black text-xs border border-purple-200">
                        <KeyRound className="w-3 h-3 text-purple-700" />
                        <span>{sess.secretWord || sess.qr_token}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {sess.duration_minutes} mins
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          setAttendanceModalSession(sess);
                          setStudentSearch("");
                          setStudentStatusFilter("ALL");
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Click to view clocked-in student names & matric numbers"
                      >
                        <Users className="w-3.5 h-3.5 text-purple-700" />
                        <span>{sess.clockedInCount || sess.records?.length || sess._count?.attendance_records || sess.counts?.total || 0} students</span>
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          sess.status === "OPEN"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {sess.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setAttendanceModalSession(sess);
                          setStudentSearch("");
                          setStudentStatusFilter("ALL");
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-fuoye-green hover:underline cursor-pointer"
                        title="View student names and matric numbers"
                      >
                        <Users className="w-3 h-3" />
                        <span>Roster</span>
                      </button>
                      <Link
                        href={`/lecturer/history?courseId=${sess.course_id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:underline"
                      >
                        <span>History</span>
                        <History className="w-3 h-3" />
                      </Link>
                      <Link
                        href={`/lecturer/sessions/${sess.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:underline"
                      >
                        <span>Live Room</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Start New Session Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-fuoye-green flex items-center justify-center">
                  <Play className="w-4 h-4 fill-current" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Start Attendance Session</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Select Course
                </label>
                {courses.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    No courses are currently allocated to your lecturer account. Please contact the Department HOD or Administrator to allocate your course(s).
                  </div>
                ) : (
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    required
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.course_code} — {c.course_title} ({c.level})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Session Duration (Mins)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="180"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    required
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                  />
                  <span className="text-[10px] text-slate-400">Total lecture duration</span>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Late Cutoff (Mins)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={lateThreshold}
                    onChange={(e) => setLateThreshold(e.target.value)}
                    required
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                  />
                  <span className="text-[10px] text-slate-400">Marked late after this</span>
                </div>
              </div>

              {/* Class Unique Word */}
              <div className="space-y-1.5 p-3 rounded-xl bg-purple-50/80 border border-purple-200">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-purple-900 uppercase tracking-wider">
                    Class Unique Word <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setSecretWord(generateRandomSecretWord())}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-950 bg-white px-2 py-0.5 rounded-lg border border-purple-300 shadow-2xs transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate Word</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={secretWord}
                    onChange={(e) => setSecretWord(e.target.value.toUpperCase())}
                    placeholder="e.g. SPECTRUM"
                    required
                    className="w-full text-sm font-mono font-black tracking-widest text-purple-950 bg-white border border-purple-300 rounded-xl p-2.5 pl-9 focus:outline-none focus:ring-2 focus:ring-purple-600 uppercase placeholder:normal-case placeholder:font-sans placeholder:tracking-normal placeholder:font-normal"
                  />
                  <KeyRound className="w-4 h-4 text-purple-600 absolute left-3 top-3" />
                </div>
                <div className="text-[11px] text-purple-800 space-y-0.5">
                  <p>
                    🔒 <strong>Security Enforcement:</strong> Both the QR Code and this unique word expire <strong>strictly 20 minutes</strong> from official class start.
                  </p>
                  <p className="text-purple-700">
                    Students must scan the QR code from your phone <em>and</em> enter this word to clock in.
                  </p>
                </div>
              </div>

              {/* Anti-fraud toggles */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <span className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Anti-Fraud Controls
                </span>

                <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={requireQr}
                    onChange={(e) => setRequireQr(e.target.checked)}
                    className="mt-0.5 rounded text-fuoye-green focus:ring-fuoye-green"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Require In-Class QR Code Scan
                    </span>
                    <span className="text-[11px] text-slate-500 leading-tight block">
                      Students must scan the projected signed QR code to access clock-in.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={requireGeo}
                    onChange={(e) => setRequireGeo(e.target.checked)}
                    className="mt-0.5 rounded text-fuoye-green focus:ring-fuoye-green"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Enable Campus Geolocation Check
                    </span>
                    <span className="text-[11px] text-slate-500 leading-tight block">
                      Flags submissions that occur outside the FUOYE Main Campus perimeter.
                    </span>
                  </div>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || courses.length === 0}
                  className="px-5 py-2.5 bg-fuoye-green text-white text-xs font-extrabold rounded-xl hover:bg-fuoye-green-dark flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>Open Live Session</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Quick QR Code Modal */}
      {qrModalSession && (
        <QRCodeModal
          isOpen={true}
          onClose={() => setQrModalSession(null)}
          session={{
            id: qrModalSession.id,
            courseCode: qrModalSession.course?.course_code || qrModalSession.courseCode,
            courseTitle: qrModalSession.course?.course_title || qrModalSession.courseTitle,
            qrToken: qrModalSession.signedQrToken || qrModalSession.qr_token,
            secretWord: qrModalSession.secretWord || qrModalSession.qr_token,
            openedAt: qrModalSession.opened_at,
            lecturerName: qrModalSession.lecturer?.name || "Lecturer",
          }}
        />
      )}

      {/* Clocked-In Students Roster Modal */}
      {attendanceModalSession && (() => {
        const rawRecords: any[] = attendanceModalSession.records || attendanceModalSession.attendance_records || [];
        const records = rawRecords.map((r: any) => ({
          id: r.id,
          matricNumber: r.matricNumber || r.matric_number,
          fullName: r.fullName || r.full_name,
          clockInTime: r.clockInTime || r.clock_in_time,
          status: r.status,
          isFlagged: r.isFlagged || r.is_flagged,
        }));

        const filteredRecords = records.filter((r) => {
          if (studentStatusFilter !== "ALL" && r.status !== studentStatusFilter) return false;
          if (studentSearch.trim()) {
            const q = studentSearch.trim().toLowerCase();
            return (
              (r.fullName && r.fullName.toLowerCase().includes(q)) ||
              (r.matricNumber && r.matricNumber.toLowerCase().includes(q))
            );
          }
          return true;
        });

        const exportToExcel = () => {
          const courseCode = attendanceModalSession.course?.course_code || "COURSE";
          const dateStr = new Date(attendanceModalSession.opened_at).toLocaleDateString("en-NG");
          const exportRows = filteredRecords.map((r, idx) => ({
            "S/N": idx + 1,
            "Student Full Name": r.fullName,
            "Matriculation Number": r.matricNumber,
            Status: r.status,
            "Clock-In Time (WAT)": new Date(r.clockInTime).toLocaleTimeString("en-NG", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            "Secret Word": attendanceModalSession.secretWord || attendanceModalSession.qr_token,
          }));
          const ws = XLSX.utils.json_to_sheet(exportRows);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Attendance");
          XLSX.writeFile(wb, `${courseCode}_ClockedIn_Students_${dateStr.replace(/\//g, "-")}.xlsx`);
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50/80">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-fuoye-green">
                      {attendanceModalSession.course?.course_code || "COURSE"}
                    </span>
                    <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {records.length} Student{records.length === 1 ? "" : "s"} Clocked In
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200 flex items-center gap-1 font-mono">
                      <KeyRound className="w-3 h-3 text-purple-700" />
                      <span>{attendanceModalSession.secretWord || attendanceModalSession.qr_token}</span>
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        attendanceModalSession.status === "OPEN"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {attendanceModalSession.status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {attendanceModalSession.course?.course_title || "Lecture Session"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Opened at: {new Date(attendanceModalSession.opened_at).toLocaleDateString("en-NG", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    {new Date(attendanceModalSession.opened_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })} WAT
                  </p>
                </div>

                <button
                  onClick={() => setAttendanceModalSession(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search & Filter Bar */}
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative w-full sm:w-72">
                    <input
                      type="text"
                      placeholder="Search student full name or matric..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 pl-8 text-slate-900 focus:outline-none focus:ring-1 focus:ring-fuoye-green font-medium"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                  </div>

                  <select
                    value={studentStatusFilter}
                    onChange={(e) => setStudentStatusFilter(e.target.value)}
                    className="text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-700"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PRESENT">Present Only</option>
                    <option value="LATE">Late Only</option>
                    <option value="EXCUSED">Excused Only</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {records.length > 0 && (
                    <button
                      onClick={exportToExcel}
                      className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-purple-700" />
                      <span>Export (.xlsx)</span>
                    </button>
                  )}
                  <Link
                    href={`/lecturer/sessions/${attendanceModalSession.id}`}
                    className="px-3.5 py-2 rounded-xl bg-fuoye-green hover:bg-fuoye-green-dark text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <span>Enter Live Room</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Students Roster Table */}
              <div className="flex-1 overflow-y-auto p-4">
                {records.length === 0 ? (
                  <div className="p-10 text-center space-y-2">
                    <Users className="w-10 h-10 text-slate-300 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-700">No Students Have Clocked In Yet</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      When students scan your session QR code or input the class secret word, their full name and matric number will appear here in real time.
                    </p>
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="p-8 text-center space-y-1">
                    <p className="text-xs text-slate-500 font-medium">
                      No clocked-in students match &quot;{studentSearch}&quot;.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Student Full Name</th>
                          <th className="py-2.5 px-3">Matriculation Number</th>
                          <th className="py-2.5 px-3">Clock-In Time (WAT)</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {filteredRecords.map((r, idx) => (
                          <tr key={r.id || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 text-sm">
                              {r.fullName || "Student Name"}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-fuoye-green text-xs">
                              {r.matricNumber}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-mono">
                              {new Date(r.clockInTime).toLocaleTimeString("en-NG", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                                  r.status === "PRESENT"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : r.status === "LATE"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {r.status}
                              </span>
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
                  Showing <strong>{filteredRecords.length}</strong> of <strong>{records.length}</strong> clocked-in student(s)
                </span>
                <button
                  onClick={() => setAttendanceModalSession(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
