"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  QrCode,
  Users,
  CheckCircle2,
  AlertTriangle,
  StopCircle,
  UserX,
  Edit3,
  ArrowLeft,
  Loader2,
  Maximize2,
  ShieldAlert,
  RefreshCw,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { QRCodeModal } from "@/components/QRCodeModal";
import { AttendanceBadge } from "@/components/AttendanceBadge";

export default function LiveSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [closing, setClosing] = useState(false);
  const [markingAbsent, setMarkingAbsent] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Manual status correction modal
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<string>("PRESENT");
  const [correctionReason, setCorrectionReason] = useState("");
  const [savingCorrection, setSavingCorrection] = useState(false);
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  const fetchLiveFeed = async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/live`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveFeed();
    const interval = setInterval(() => {
      if (autoRefresh) fetchLiveFeed();
    }, 3000); // 3-second live polling
    return () => clearInterval(interval);
  }, [sessionId, autoRefresh]);

  const handleCloseSession = async () => {
    if (!confirm("Are you sure you want to close this lecture session? Students will no longer be able to clock in.")) {
      return;
    }
    setClosing(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action: "CLOSE" }),
      });
      if (res.ok) {
        setActionMessage("Session successfully closed.");
        fetchLiveFeed();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClosing(false);
    }
  };

  const handleMarkAbsent = async () => {
    if (
      !confirm(
        `Mark all ${data?.stats?.unclockedCount || 0} unclocked students as ABSENT for this session?`
      )
    ) {
      return;
    }
    setMarkingAbsent(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/records`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        setActionMessage(json.message || "Marked absent.");
        fetchLiveFeed();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMarkingAbsent(false);
    }
  };

  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionReason.trim()) {
      setCorrectionError("A justification reason is strictly mandatory for the audit log.");
      return;
    }
    setSavingCorrection(true);
    setCorrectionError(null);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/records`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId: selectedRecord.id,
          newStatus,
          reason: correctionReason,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setCorrectionError(json.error || "Failed to update record.");
        setSavingCorrection(false);
        return;
      }

      setSelectedRecord(null);
      setCorrectionReason("");
      setActionMessage("Record status updated and audit log recorded.");
      fetchLiveFeed();
    } catch {
      setCorrectionError("Network error occurred.");
    } finally {
      setSavingCorrection(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-fuoye-green animate-spin" />
      </div>
    );
  }

  const { session, stats, records, unclockedStudents } = data;
  const isOpen = session.status === "OPEN";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Action Notification Toast */}
      {actionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center justify-between">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/lecturer"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black text-fuoye-green px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                {session.courseCode}
              </span>
              <h1 className="text-xl font-black text-slate-900">{session.courseTitle}</h1>
              {isOpen ? (
                <span className="inline-flex items-center gap-1 text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  LIVE
                </span>
              ) : (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  CLOSED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Lecturer: {session.lecturerName} • Level: {session.level}
            </p>
          </div>
        </div>

        {/* Live Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
              autoRefresh
                ? "bg-emerald-50 border-emerald-300 text-fuoye-green"
                : "bg-white border-slate-300 text-slate-600"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? "animate-spin text-fuoye-green" : ""}`} />
            <span>{autoRefresh ? "Live Feed Active (3s)" : "Paused"}</span>
          </button>

          <button
            onClick={() => setIsQrModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-black flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <QrCode className="w-4 h-4" />
            <span>Projector QR Code</span>
          </button>

          {isOpen && (
            <button
              onClick={handleCloseSession}
              disabled={closing}
              className="px-3.5 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              <StopCircle className="w-4 h-4" />
              <span>{closing ? "Closing..." : "Close Session"}</span>
            </button>
          )}

          {!isOpen && unclockedStudents.length > 0 && (
            <button
              onClick={handleMarkAbsent}
              disabled={markingAbsent}
              className="px-3.5 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-900 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              <UserX className="w-4 h-4" />
              <span>Mark {unclockedStudents.length} Absent</span>
            </button>
          )}

          <Link
            href={`/lecturer/reports?courseId=${session.courseId}`}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export Course Report</span>
          </Link>
        </div>
      </div>

      {/* Real-Time Live Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <span className="text-[10px] font-extrabold uppercase text-slate-400">Total Enrolled</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.totalEnrolled}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <span className="text-[10px] font-extrabold uppercase text-emerald-700">Present (On Time)</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{stats.presentCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <span className="text-[10px] font-extrabold uppercase text-amber-700">Late Arrivals</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{stats.lateCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <span className="text-[10px] font-extrabold uppercase text-blue-700">Excused</span>
          <div className="text-2xl font-black text-blue-600 mt-1">{stats.excusedCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <span className="text-[10px] font-extrabold uppercase text-rose-700">Flagged (Proxy)</span>
          <div className="text-2xl font-black text-rose-600 mt-1">{stats.flaggedCount}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm text-center">
          <span className="text-[10px] font-extrabold uppercase text-slate-500">Unclocked</span>
          <div className="text-2xl font-black text-slate-500 mt-1">{stats.unclockedCount}</div>
        </div>
      </div>

      {/* Flagged Submissions Warning Notice */}
      {stats.flaggedCount > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>Anti-Proxy Alert: {stats.flaggedCount} suspicious submission(s) detected!</span>
          </div>
          <p className="text-rose-800">
            Submissions have been flagged either because more than 3 students clocked in from the exact same device fingerprint/IP, or outside coordinates were detected. See records below marked with &quot;Flagged&quot;.
          </p>
        </div>
      )}

      {/* Live Clock-In Feed Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Clocked-In Students ({records.length})</h2>
            <p className="text-xs text-slate-500">
              Live submission feed updating in real time. Click &quot;Edit&quot; to perform audit-logged corrections.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Matric Number</th>
                <th className="py-3 px-4">Clock-In Time</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Device / IP</th>
                <th className="py-3 px-4">Token</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 space-y-2">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-semibold">Waiting for students to clock in...</p>
                    <p className="text-xs">
                      Project the QR Code on screen or share the clock-in link.
                    </p>
                  </td>
                </tr>
              ) : (
                records.map((rec: any, idx: number) => (
                  <tr
                    key={rec.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      rec.isFlagged ? "bg-rose-50/50" : ""
                    }`}
                  >
                    <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{rec.fullName}</td>
                    <td className="py-3 px-4 font-mono font-bold text-fuoye-green">
                      {rec.matricNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(rec.clockInTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <AttendanceBadge
                        status={rec.status}
                        isFlagged={rec.isFlagged}
                        flagReason={rec.flagReason}
                      />
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {rec.ipAddress || "127.0.0.1"}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {rec.attendanceToken}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedRecord(rec);
                          setNewStatus(rec.status);
                          setCorrectionReason("");
                          setCorrectionError(null);
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 text-slate-600 hover:text-fuoye-green transition-colors"
                        title="Manually Correct Status"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unclocked Students Roster */}
      {unclockedStudents.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Enrolled Students Not Yet Clocked In ({unclockedStudents.length})
              </h3>
              <p className="text-xs text-slate-500">
                Students registered in this course who haven&apos;t recorded attendance.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {unclockedStudents.map((s: any) => (
              <div
                key={s.id}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-800 block">{s.fullName}</span>
                  <span className="font-mono text-[11px] text-slate-500">{s.matricNumber}</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                  Unmarked
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Projector QR Modal */}
      <QRCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        session={{
          id: session.id,
          courseCode: session.courseCode,
          courseTitle: session.courseTitle,
          qrToken: session.qrToken,
          lecturerName: session.lecturerName,
        }}
      />

      {/* Manual Status Correction Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Correct Attendance Record</h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <p>
                <span className="font-bold">Student:</span> {selectedRecord.fullName} (
                <span className="font-mono font-bold text-fuoye-green">
                  {selectedRecord.matricNumber}
                </span>
                )
              </p>
              <p>
                <span className="font-bold">Current Status:</span> {selectedRecord.status}
              </p>
            </div>

            {correctionError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {correctionError}
              </div>
            )}

            <form onSubmit={handleSaveCorrection} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                >
                  <option value="PRESENT">PRESENT</option>
                  <option value="LATE">LATE</option>
                  <option value="EXCUSED">EXCUSED</option>
                  <option value="ABSENT">ABSENT</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Correction Justification / Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Student arrived with departmental project lab coordinator endorsement."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium"
                />
                <span className="text-[10px] text-slate-400 block">
                  Mandatory audit requirement: This reason and your name are logged permanently in the departmental audit log.
                </span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCorrection}
                  className="px-4 py-2 bg-fuoye-green text-white text-xs font-bold rounded-xl hover:bg-fuoye-green-dark flex items-center gap-1.5"
                >
                  {savingCorrection ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Save Correction & Log Audit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
