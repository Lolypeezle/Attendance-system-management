"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sliders,
  ArrowLeft,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  Clock,
  Sparkles,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form values mapped
  const [attendanceThreshold, setAttendanceThreshold] = useState("70");
  const [warningThreshold, setWarningThreshold] = useState("75");
  const [defaultLateMinutes, setDefaultLateMinutes] = useState("15");
  const [academicSession, setAcademicSession] = useState("2025/2026");
  const [currentSemester, setCurrentSemester] = useState("FIRST");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        const sList = d.settings || [];
        setSettings(sList);
        sList.forEach((s: any) => {
          if (s.key === "attendance_threshold") setAttendanceThreshold(s.value);
          if (s.key === "warning_threshold") setWarningThreshold(s.value);
          if (s.key === "default_late_minutes") setDefaultLateMinutes(s.value);
          if (s.key === "academic_session") setAcademicSession(s.value);
          if (s.key === "current_semester") setCurrentSemester(s.value);
        });
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);

    const payload = [
      { key: "attendance_threshold", value: attendanceThreshold },
      { key: "warning_threshold", value: warningThreshold },
      { key: "default_late_minutes", value: defaultLateMinutes },
      { key: "academic_session", value: academicSession },
      { key: "current_semester", value: currentSemester },
    ];

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: payload }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("Academic policy parameters updated successfully!");
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-fuoye-green animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900">Academic Policy & System Settings</h1>
          <p className="text-xs text-slate-500">
            Configure system-wide attendance thresholds and lecture session defaults.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Card 1: Attendance Policy Cutoffs */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Shield className="w-4 h-4 text-fuoye-green" />
            <h2 className="text-sm font-bold text-slate-900 uppercase">
              Attendance Cutoff Policies
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Exam Eligibility Threshold (%)
              </label>
              <input
                type="number"
                min="50"
                max="100"
                value={attendanceThreshold}
                onChange={(e) => setAttendanceThreshold(e.target.value)}
                required
                className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl p-2.5"
              />
              <span className="text-[10px] text-slate-500">
                Students below this percentage are flagged as barred from examinations.
              </span>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Warning Alert Trigger (%)
              </label>
              <input
                type="number"
                min="50"
                max="100"
                value={warningThreshold}
                onChange={(e) => setWarningThreshold(e.target.value)}
                required
                className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl p-2.5"
              />
              <span className="text-[10px] text-slate-500">
                Triggers an amber warning banner on student desks when attendance drops below this.
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Session & Academic Session Defaults */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Clock className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900 uppercase">
              Lecture & Academic Calendar Defaults
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Default Late Cutoff (Mins)
              </label>
              <input
                type="number"
                min="5"
                max="60"
                value={defaultLateMinutes}
                onChange={(e) => setDefaultLateMinutes(e.target.value)}
                required
                className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl p-2.5"
              />
              <span className="text-[10px] text-slate-500">
                Marked late after this elapsed time
              </span>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Academic Session
              </label>
              <input
                type="text"
                value={academicSession}
                onChange={(e) => setAcademicSession(e.target.value)}
                required
                className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl p-2.5"
              />
              <span className="text-[10px] text-slate-500">e.g. 2025/2026</span>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Current Semester
              </label>
              <select
                value={currentSemester}
                onChange={(e) => setCurrentSemester(e.target.value)}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl p-2.5"
              >
                <option value="FIRST">First Semester</option>
                <option value="SECOND">Second Semester</option>
              </select>
              <span className="text-[10px] text-slate-500">Current term</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-fuoye-green text-white text-xs font-extrabold rounded-xl hover:bg-fuoye-green-dark flex items-center gap-2 shadow-md transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Save System Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
