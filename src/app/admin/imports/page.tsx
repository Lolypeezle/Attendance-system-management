"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  Upload,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";

export default function AdminBulkImportsPage() {
  const [importType, setImportType] = useState<"students" | "courses">("students");
  const [csvContent, setCsvContent] = useState("");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const sampleStudentCsv = `full_name,matric_number,level,courses_enrolled
Oladipo Victor,CSC/2021/1010,400L,"CSC 401, CSC 415"
Adekunle Tosin,CSC/2021/1011,400L,"CSC 401, CSC 415"
Bakare Samuel,CSC/2023/1010,300L,"CSC 301, CSC 305"
Fashina Mariam,CSC/2023/1011,300L,CSC 201`;

  const sampleCourseCsv = `course_code,course_title,units,level,lecturer_email
CSC 403,Compiler Construction & Design,3,400L,adeyemi@fuoye.edu.ng
CSC 307,Object-Oriented Programming with Java,3,300L,okonjo@fuoye.edu.ng
CSC 205,Discrete Mathematics for Computing,3,200L,balogun@fuoye.edu.ng`;

  const handleLoadSample = () => {
    const sample = importType === "students" ? sampleStudentCsv : sampleCourseCsv;
    setCsvContent(sample);
    parseCsv(sample);
    setResult(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      setCsvContent(text);
      parseCsv(text);
      setResult(null);
    };
    reader.readAsText(file);
  };

  const parseCsv = (text: string) => {
    try {
      const lines = text.trim().split("\n");
      if (lines.length < 2) {
        setParsedRows([]);
        return;
      }

      const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
      const rows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Handle quoted values containing commas
        const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(",");
        const rowObj: any = {};
        headers.forEach((h, idx) => {
          let val = (matches[idx] || "").trim().replace(/^["']|["']$/g, "");
          rowObj[h] = val;
        });
        rows.push(rowObj);
      }
      setParsedRows(rows);
    } catch (err) {
      console.error(err);
      setParsedRows([]);
    }
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: importType,
          records: parsedRows,
        }),
      });

      const json = await res.json();
      setResult(json);
    } catch {
      setResult({ error: "Network error occurred during batch import." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Bulk CSV Data Onboarding</h1>
            <p className="text-xs text-slate-500">
              Import enrolled student directories and course curricula via standard CSV files.
            </p>
          </div>
        </div>

        <button
          onClick={handleLoadSample}
          className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-100 flex items-center gap-1.5 self-start sm:self-auto transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>Load Sample Template</span>
        </button>
      </div>

      {/* Mode Selector */}
      <div className="flex rounded-xl bg-slate-100 p-1 max-w-sm">
        <button
          onClick={() => {
            setImportType("students");
            setCsvContent("");
            setParsedRows([]);
            setResult(null);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            importType === "students"
              ? "bg-white text-fuoye-green shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Import Students
        </button>
        <button
          onClick={() => {
            setImportType("courses");
            setCsvContent("");
            setParsedRows([]);
            setResult(null);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            importType === "courses"
              ? "bg-white text-fuoye-green shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Import Courses
        </button>
      </div>

      {/* CSV Input Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Paste CSV Content or Upload File
            </h3>
            <label className="cursor-pointer px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1">
              <Upload className="w-3.5 h-3.5" />
              <span>Choose .csv</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <p className="text-[11px] text-slate-500">
            {importType === "students"
              ? "Required columns: full_name, matric_number, level, courses_enrolled"
              : "Required columns: course_code, course_title, units, level, lecturer_email"}
          </p>

          <textarea
            rows={10}
            value={csvContent}
            onChange={(e) => {
              setCsvContent(e.target.value);
              parseCsv(e.target.value);
              setResult(null);
            }}
            placeholder="Paste CSV text here..."
            className="w-full font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuoye-green"
          />

          <button
            onClick={handleExecuteImport}
            disabled={submitting || parsedRows.length === 0}
            className="w-full py-3 rounded-xl bg-fuoye-green text-white text-xs font-extrabold hover:bg-fuoye-green-dark disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            <span>Process & Import {parsedRows.length} Records</span>
          </button>
        </div>

        {/* Preview Panel */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Parsed Table Preview ({parsedRows.length} rows)
              </h3>
              <span className="text-[11px] text-slate-400 font-semibold">Live validation</span>
            </div>

            {result && (
              <div
                className={`p-3 rounded-xl text-xs font-medium space-y-1 ${
                  result.error
                    ? "bg-rose-50 text-rose-800 border border-rose-200"
                    : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  {result.error ? (
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                  <span>{result.message || result.error}</span>
                </div>
                {result.errors?.length > 0 && (
                  <ul className="list-disc pl-5 text-[11px] text-rose-700">
                    {result.errors.map((err: string, i: number) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="overflow-x-auto max-h-[340px]">
              {parsedRows.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs">
                  No CSV data parsed. Click &quot;Load Sample Template&quot; above to test.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase sticky top-0">
                    <tr>
                      {Object.keys(parsedRows[0]).map((h) => (
                        <th key={h} className="py-2 px-3">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        {Object.values(row).map((val: any, j) => (
                          <td key={j} className="py-2 px-3 text-slate-800">
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
