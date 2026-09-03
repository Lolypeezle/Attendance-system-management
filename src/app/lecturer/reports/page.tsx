"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  FileSpreadsheet,
  Printer,
  Download,
  ArrowLeft,
  BookOpen,
  Calendar,
  Users,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react";

function ReportsContent() {
  const searchParams = useSearchParams();
  const defaultCourseId = searchParams.get("courseId") || "";

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState(defaultCourseId);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [reportType, setReportType] = useState<"course" | "sheet" | "at-risk" | "department">("course");
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    fetch("/api/courses")
      .then((r) => r.json())
      .then((d) => {
        const cList = d.courses || [];
        setCourses(cList);
        if (!selectedCourseId && cList.length > 0) {
          setSelectedCourseId(cList[0].id);
        }
      });
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetch(`/api/sessions?courseId=${selectedCourseId}`)
        .then((r) => r.json())
        .then((d) => {
          const sList = d.sessions || [];
          setSessions(sList);
          if (sList.length > 0) setSelectedSessionId(sList[0].id);
        });
    }
  }, [selectedCourseId]);

  useEffect(() => {
    loadPreview();
  }, [reportType, selectedCourseId, selectedSessionId]);

  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      let url = "";
      if (reportType === "course" && selectedCourseId) {
        url = `/api/reports/export?type=course&courseId=${selectedCourseId}&format=json`;
      } else if (reportType === "sheet" && selectedSessionId) {
        url = `/api/reports/export?type=session-sheet&sessionId=${selectedSessionId}&format=json`;
      } else if (reportType === "at-risk") {
        url = `/api/reports/export?type=at-risk&format=json`;
      } else if (reportType === "department") {
        url = `/api/reports/export?type=department&format=json`;
      }

      if (url) {
        const res = await fetch(url);
        const json = await res.json();
        setPreviewData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = (format: "csv" | "xlsx") => {
    let url = "";
    if (reportType === "course") {
      url = `/api/reports/export?type=course&courseId=${selectedCourseId}&format=${format}`;
    } else if (reportType === "sheet") {
      url = `/api/reports/export?type=session-sheet&sessionId=${selectedSessionId}&format=${format}`;
    } else if (reportType === "at-risk") {
      url = `/api/reports/export?type=at-risk&format=${format}`;
    } else if (reportType === "department") {
      url = `/api/reports/export?type=department&format=${format}`;
    }
    if (url) window.open(url, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Control Panel (Hidden when printing) */}
      <div className="space-y-6 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/lecturer"
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Attendance Reports & Exports</h1>
              <p className="text-xs text-slate-500">
                Generate formatted course ledgers, official sign-in sheets, and Excel datasets.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownload("xlsx")}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel (.xlsx)</span>
            </button>

            <button
              onClick={() => handleDownload("csv")}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            {reportType === "sheet" && (
              <button
                onClick={handlePrint}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Sheet</span>
              </button>
            )}
          </div>
        </div>

        {/* Report Selector Ribbon */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setReportType("course")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                reportType === "course"
                  ? "bg-fuoye-green text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Per-Course Ledger
            </button>

            <button
              onClick={() => setReportType("sheet")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                reportType === "sheet"
                  ? "bg-fuoye-green text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Printable Sign-In Sheet
            </button>

            <button
              onClick={() => setReportType("at-risk")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                reportType === "at-risk"
                  ? "bg-rose-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              At-Risk Students (&lt;70%)
            </button>

            <button
              onClick={() => setReportType("department")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                reportType === "department"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Department Semester Matrix
            </button>
          </div>

          {/* Conditional Filters */}
          <div className="flex items-center gap-3">
            {(reportType === "course" || reportType === "sheet") && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Course:</span>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg p-1.5"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_code} ({c.level})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {reportType === "sheet" && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500">Session:</span>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg p-1.5"
                >
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {new Date(s.opened_at).toLocaleDateString()} ({s.duration_minutes}m)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REPORT PREVIEW / PRINT CANVAS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 print-container">
        {/* Printable Official Header (Always shown on print, styled clean) */}
        <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center space-y-1">
          <div className="text-lg font-black tracking-wide text-slate-900 uppercase">
            Federal University Oye-Ekiti, Ekiti State, Nigeria
          </div>
          <div className="text-sm font-extrabold text-fuoye-green uppercase">
            Faculty of Science • Department of Computer Science
          </div>
          <div className="text-xs font-bold text-slate-700 tracking-wider">
            OFFICIAL STUDENT ATTENDANCE REPORT — 2025/2026 ACADEMIC SESSION
          </div>
          {reportType === "sheet" && previewData?.sessionInfo && (
            <div className="pt-2 text-xs font-medium text-slate-800 flex flex-wrap justify-between border-t border-slate-200 mt-3 px-2">
              <span>
                <strong>Course:</strong> {previewData.sessionInfo.courseCode} ({previewData.sessionInfo.courseTitle})
              </span>
              <span>
                <strong>Lecturer:</strong> {previewData.sessionInfo.lecturerName}
              </span>
              <span>
                <strong>Date:</strong> {previewData.sessionInfo.date} ({previewData.sessionInfo.time})
              </span>
            </div>
          )}
        </div>

        {loadingPreview ? (
          <div className="py-16 text-center">
            <Loader2 className="w-8 h-8 text-fuoye-green animate-spin mx-auto" />
            <p className="text-xs text-slate-400 mt-2">Loading report data...</p>
          </div>
        ) : !previewData ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            No data available for the selected report filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Dynamic Table based on report type */}
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-y border-slate-300 font-bold text-slate-800 uppercase">
                {reportType === "sheet" ? (
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Matric Number</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Verification Token</th>
                    <th className="py-2.5 px-3 text-center border-l border-slate-300">
                      Physical Signature
                    </th>
                  </tr>
                ) : (
                  <tr>
                    {Object.keys(previewData?.data?.[0] || {}).map((header) => (
                      <th key={header} className="py-2.5 px-3">
                        {header}
                      </th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {reportType === "sheet" ? (
                  (previewData?.students || []).map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-400">{i + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {row["Matric Number"]}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        {row["Full Name"]}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{row["Clock-In Time"]}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            row["Status"] === "PRESENT"
                              ? "text-emerald-800 bg-emerald-100"
                              : row["Status"] === "LATE"
                              ? "text-amber-800 bg-amber-100"
                              : "text-rose-800 bg-rose-100"
                          }`}
                        >
                          {row["Status"]}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {row["Verification Token"]}
                      </td>
                      <td className="py-2.5 px-3 border-l border-slate-200 w-36">
                        <div className="h-6 border-b border-dotted border-slate-400"></div>
                      </td>
                    </tr>
                  ))
                ) : (
                  (previewData?.data || []).map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50">
                      {Object.values(row).map((val: any, j: number) => (
                        <td key={j} className="py-2.5 px-3 text-slate-800">
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Official Signature Footer for Physical Sign-in Sheets */}
        {reportType === "sheet" && (
          <div className="mt-12 pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-800">
            <div>
              <p className="font-bold">Course Lecturer Signature:</p>
              <div className="mt-6 border-b border-slate-400 w-48"></div>
              <p className="text-[11px] text-slate-500 mt-1">Date: ________________________</p>
            </div>
            <div className="text-right">
              <p className="font-bold">Head of Department (HOD) Endorsement:</p>
              <div className="mt-6 border-b border-slate-400 w-48 ml-auto"></div>
              <p className="text-[11px] text-slate-500 mt-1">Date: ________________________</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LecturerReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-fuoye-green animate-spin" />
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}
