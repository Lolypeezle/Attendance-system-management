"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Clock,
  KeyRound,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  BookOpen,
} from "lucide-react";

export default function AdminSessionsPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [lectureDate, setLectureDate] = useState("");
  const [lectureStartTime, setLectureStartTime] = useState("09:00");
  const [durationMinutes, setDurationMinutes] = useState("90");
  const [lateThresholdMinutes, setLateThresholdMinutes] = useState("15");
  const [secretWord, setSecretWord] = useState("");

  useEffect(() => {
    // Set default date to today in Nigeria Time
    const today = new Date().toISOString().slice(0, 10);
    setLectureDate(today);

    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        fetch("/api/courses"),
        fetch("/api/sessions"),
      ]);

      const cData = await cRes.json();
      const sData = await sRes.json();

      if (cData.courses) {
        setCourses(cData.courses);
        if (cData.courses.length > 0 && !selectedCourseId) {
          setSelectedCourseId(cData.courses[0].id);
        }
      }

      if (sData.sessions) {
        setSessions(sData.sessions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generateRandomWord = () => {
    const words = [
      "ALGORITHM",
      "DATABASE",
      "SYSTEMS",
      "COMPLEXITY",
      "RECURSION",
      "STRUCTURE",
      "OPERATING",
      "AUTOMATA",
      "DISCRETE",
      "NETWORK",
      "INNOVATION",
      "CHARACTER",
      "ANALYSIS",
      "SECURITY",
    ];
    const randWord = words[Math.floor(Math.random() * words.length)];
    const randNum = Math.floor(100 + Math.random() * 900);
    setSecretWord(`${randWord}${randNum}`);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourseId,
          lectureDate,
          lectureStartTime,
          durationMinutes,
          lateThresholdMinutes,
          secretWord,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to schedule lecture." });
      } else {
        setMessage({
          type: "success",
          text: `Lecture scheduled successfully! Secret word set to "${secretWord.toUpperCase()}". Give this word ONLY to students physically in class.`,
        });
        fetchData();
      }
    } catch {
      setMessage({ type: "error", text: "Network error occurred. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyWord = (word: string, id: string) => {
    navigator.clipboard.writeText(word);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCloseSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to close this lecture session? Students will no longer be able to clock in.")) {
      return;
    }

    try {
      const res = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action: "CLOSE" }),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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
              Lecture Schedule & Class Secret Word
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800">
              Admin & Lecturer Console
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Set lecture start times in <strong>Nigeria Time (WAT)</strong> and assign unique secret words. Only students physically in class receiving the secret word can clock in.
          </p>
        </div>

        <button
          onClick={fetchData}
          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-sm text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Schedules</span>
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-start gap-2.5 ${
            message.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Grid: Form on Left, Active Sessions on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Schedule Form */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">
                Fix Lecture Time & Secret Word
              </h2>
              <p className="text-[11px] text-slate-400">
                Nigeria Standard Time (WAT • GMT+1)
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateOrUpdate} className="space-y-4 text-xs">
            {/* Course Selector */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 uppercase">
                Select 300L Course
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuoye-green"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.course_code} — {c.course_title}
                  </option>
                ))}
              </select>
            </div>

            {/* Lecture Date & Time (WAT) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 uppercase">
                  Lecture Date
                </label>
                <input
                  type="date"
                  value={lectureDate}
                  onChange={(e) => setLectureDate(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuoye-green"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700 uppercase">
                  Start Time (WAT)
                </label>
                <input
                  type="time"
                  value={lectureStartTime}
                  onChange={(e) => setLectureStartTime(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuoye-green"
                />
              </div>
            </div>

            {/* Duration & Late Grace Threshold */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700 uppercase">
                  Duration
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuoye-green"
                >
                  <option value="60">1 Hour (60m)</option>
                  <option value="90">1.5 Hours (90m)</option>
                  <option value="120">2 Hours (120m)</option>
                  <option value="180">3 Hours (180m)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700 uppercase">
                  Late Grace Period
                </label>
                <select
                  value={lateThresholdMinutes}
                  onChange={(e) => setLateThresholdMinutes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuoye-green"
                >
                  <option value="10">10 Minutes</option>
                  <option value="15">15 Minutes (Default)</option>
                  <option value="20">20 Minutes</option>
                  <option value="30">30 Minutes</option>
                </select>
              </div>
            </div>

            {/* Unique Attendance Secret Word */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-700 uppercase">
                  Unique Class Secret Word <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={generateRandomWord}
                  className="text-[10px] font-bold text-fuoye-green hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Generate Word</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. ALGORITHM901"
                  value={secretWord}
                  onChange={(e) => setSecretWord(e.target.value.toUpperCase())}
                  required
                  className="w-full uppercase font-mono font-bold tracking-widest text-slate-900 bg-slate-50 border border-slate-300 rounded-xl p-3 pl-9 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuoye-green"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
              <p className="text-[11px] text-slate-500 italic">
                Only give this secret word to students present in the lecture room. Without it, students cannot clock in.
              </p>
            </div>

            {/* 20-Minute Strict Policy Notice */}
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Strict 20-Minute Rule:</strong> The secret word expires automatically <strong>20 minutes</strong> after the class start time. Students arriving more than 20 minutes late are locked out and cannot clock in.
              </span>
            </div>

            <button
              type="submit"

              disabled={saving}
              className="w-full py-3 px-4 rounded-xl bg-fuoye-green hover:bg-fuoye-green-dark text-white font-extrabold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Scheduling Lecture...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Save & Activate Class Word</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Active & Scheduled Sessions List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Active Lecture Schedules ({sessions.length})
            </h2>
            <span className="text-[11px] text-slate-500">Nigeria Time (WAT)</span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-fuoye-green mb-2" />
              <p>Loading lecture schedules from Supabase...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200 space-y-2">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">No scheduled sessions found</p>
              <p className="text-[11px]">Use the form to schedule a class and set its attendance secret word.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => {
                const startTimeWAT = new Date(s.opened_at).toLocaleTimeString("en-NG", {
                  timeZone: "Africa/Lagos",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                });
                const startDateWAT = new Date(s.opened_at).toLocaleDateString("en-NG", {
                  timeZone: "Africa/Lagos",
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
                const isOpen = s.status === "OPEN";

                return (
                  <div
                    key={s.id}
                    className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs px-2.5 py-0.5 rounded-md bg-emerald-50 text-fuoye-green border border-emerald-200">
                          {s.course?.course_code || "CSC"}
                        </span>
                        <span className="text-xs font-bold text-slate-900">
                          {s.course?.course_title || "Computer Science Course"}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            isOpen
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isOpen ? "🟢 OPEN" : "CLOSED"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {startDateWAT}
                        </span>
                        <span className="flex items-center gap-1 font-bold text-slate-800">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Starts: {startTimeWAT} (WAT)
                        </span>
                        {(() => {
                          const openedTime = new Date(s.opened_at).getTime();
                          const codeExpiresTime = openedTime + 60 * 60 * 1000;
                          const isExpired = Date.now() > codeExpiresTime;
                          const expiryTimeWAT = new Date(codeExpiresTime).toLocaleTimeString("en-NG", {
                            timeZone: "Africa/Lagos",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          });
                          return (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isExpired
                                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                                  : "bg-amber-100 text-amber-800 border border-amber-300"
                              }`}
                            >
                              Code Window: {expiryTimeWAT} WAT ({isExpired ? "Expired (>1hr)" : "Valid for 1hr"})
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Secret Word Box & Actions */}
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          Class Secret Word

                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono font-black text-sm text-purple-900 bg-purple-50 px-3 py-1 rounded-xl border border-purple-200 shadow-inner">
                            {s.qr_token || "NO-WORD"}
                          </span>
                          <button
                            onClick={() => handleCopyWord(s.qr_token, s.id)}
                            title="Copy Secret Word"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                          >
                            {copiedId === s.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {isOpen && (
                        <button
                          onClick={() => handleCloseSession(s.id)}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition-colors"
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
