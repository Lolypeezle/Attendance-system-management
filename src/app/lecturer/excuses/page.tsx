"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  ExternalLink,
  Loader2,
  X,
  Send,
  User,
  Hash,
} from "lucide-react";

export default function LecturerExcusesPage() {
  const [excuses, setExcuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");

  // Review Modal
  const [selectedExcuse, setSelectedExcuse] = useState<any>(null);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchExcuses();
  }, []);

  const fetchExcuses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/excuses");
      const data = await res.json();
      setExcuses(data.excuses || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/excuses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          excuseId: selectedExcuse.id,
          status: decision,
          reviewerNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || "Failed to update excuse status.");
        setSubmitting(false);
        return;
      }

      setSelectedExcuse(null);
      setReviewerNotes("");
      fetchExcuses();
    } catch {
      setErrorMsg("Network error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredExcuses = excuses.filter((e) => {
    if (filter === "ALL") return true;
    return e.status === filter;
  });

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-fuoye-green animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/lecturer"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Student Attendance Excuses</h1>
            <p className="text-xs text-slate-500">
              Review and act on student medical reports and absence justification requests.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 text-xs">
          {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                filter === st
                  ? "bg-fuoye-green text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Excuses Grid */}
      {filteredExcuses.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center text-slate-400 space-y-2">
          <FileText className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold">No excuse requests found in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExcuses.map((exc) => (
            <div
              key={exc.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black text-fuoye-green px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                    {exc.session.course.course_code}
                  </span>
                  <span
                    className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                      exc.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800"
                        : exc.status === "REJECTED"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {exc.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">{exc.student.full_name}</h3>
                  <p className="text-xs font-mono font-semibold text-slate-500">
                    {exc.student.matric_number} • {exc.student.level}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  <span className="font-bold text-slate-900 block mb-1">Reason:</span>
                  <p className="leading-relaxed">{exc.reason}</p>
                </div>

                {exc.document_url && (
                  <a
                    href={exc.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-fuoye-green hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Supporting Medical Document</span>
                  </a>
                )}

                {exc.reviewer_notes && (
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
                    <span className="font-bold block">Reviewer Feedback:</span>
                    {exc.reviewer_notes}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  {new Date(exc.created_at).toLocaleDateString()}
                </span>

                {exc.status === "PENDING" && (
                  <button
                    onClick={() => {
                      setSelectedExcuse(exc);
                      setDecision("APPROVED");
                      setReviewerNotes("");
                      setErrorMsg(null);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-fuoye-green text-white text-xs font-bold hover:bg-fuoye-green-dark transition-colors"
                  >
                    Review Request
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedExcuse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Review Excuse Request</h3>
              <button
                onClick={() => setSelectedExcuse(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <p>
                <span className="font-bold">Student:</span> {selectedExcuse.student.full_name}
              </p>
              <p>
                <span className="font-bold">Matric Number:</span> {selectedExcuse.student.matric_number}
              </p>
              <p>
                <span className="font-bold">Course:</span> {selectedExcuse.session.course.course_code}
              </p>
              <p className="mt-2 text-slate-700 font-medium">
                &ldquo;{selectedExcuse.reason}&rdquo;
              </p>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">Decision</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDecision("APPROVED")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      decision === "APPROVED"
                        ? "bg-emerald-100 border-emerald-300 text-emerald-800"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Approve Excuse</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDecision("REJECTED")}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                      decision === "REJECTED"
                        ? "bg-rose-100 border-rose-300 text-rose-800"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    <span>Reject Excuse</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Reviewer Notes / Feedback
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Verified with University Health Centre records. Excuse accepted."
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedExcuse(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-fuoye-green text-white text-xs font-bold rounded-xl hover:bg-fuoye-green-dark flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>Save Decision</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
