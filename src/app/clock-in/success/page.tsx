"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  Printer,
  ArrowRight,
  ShieldCheck,
  Calendar,
  User,
  Hash,
  BookOpen,
  Copy,
  Check,
} from "lucide-react";
import confetti from "canvas-confetti";

export default function ClockInSuccessPage() {
  const router = useRouter();
  const [record, setRecord] = useState<any>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const data = sessionStorage.getItem("last_attendance_record");
      if (data) {
        try {
          const parsed = JSON.parse(data);
          setRecord(parsed);
          // Trigger subtle academic confetti
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ["#006B3F", "#E5A823", "#10B981"],
          });
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const handleCopyToken = () => {
    if (!record?.attendanceToken) return;
    navigator.clipboard.writeText(record.attendanceToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Fallback demo state if accessed directly
  const displayRecord = record || {
    courseCode: "CSC 302",
    courseTitle: "Object-Oriented Programming & Systems",
    lecturerName: "Mrs. F. I. Okonjo",
    studentName: "Ajayi Damilola",
    matricNumber: "CSC/2023/1001",
    clockInTime: new Date().toISOString(),
    status: "PRESENT",
    attendanceToken: "FY-302A",
    isFlagged: false,
    isLate: false,
    punctualityNote: "On-Time / Early",
  };


  const formattedDate = new Date(displayRecord.clockInTime).toLocaleDateString("en-NG", {
    timeZone: "Africa/Lagos",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime =
    new Date(displayRecord.clockInTime).toLocaleTimeString("en-NG", {
      timeZone: "Africa/Lagos",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }) + " WAT";


  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-slate-50">
      <div className="max-w-md w-full">
        {/* Receipt Container */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden print-container">
          {/* Top Green Academic Header */}
          <div className="bg-gradient-to-r from-fuoye-green to-fuoye-green-dark p-6 text-white text-center relative">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/30 shadow-inner">
              <CheckCircle2 className="w-8 h-8 text-amber-300" />
            </div>
            <h1 className="text-xl font-black tracking-tight">Clock-In Confirmed!</h1>
            <p className="text-xs text-emerald-100 mt-0.5">
              Federal University Oye-Ekiti • Computer Science
            </p>

            {/* Verified Status Pill (Punctuality is strictly evaluated and viewed by Admin) */}
            <div className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white text-fuoye-green text-xs font-extrabold shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Attendance Recorded</span>
            </div>
          </div>



          {/* Unique Attendance Token Card */}
          <div className="p-6 bg-amber-50/70 border-b border-amber-200/80 text-center">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-800">
              Official Verification Token
            </span>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span className="text-3xl font-black font-mono tracking-widest text-slate-900 bg-white px-4 py-1.5 rounded-xl border border-amber-300 shadow-sm">
                {displayRecord.attendanceToken}
              </span>
              <button
                onClick={handleCopyToken}
                title="Copy Token"
                className="p-2 rounded-xl bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 transition-colors shadow-sm"
              >
                {copiedToken ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-[11px] text-amber-700/90 mt-2 font-medium">
              Keep this 6-character token as digital proof of physical attendance.
            </p>
          </div>

          {/* Details Slip List */}
          <div className="p-6 space-y-3.5 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                Course
              </span>
              <span className="font-bold text-slate-900 text-right">
                {displayRecord.courseCode} — {displayRecord.courseTitle}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Lecturer
              </span>
              <span className="font-semibold text-slate-800">{displayRecord.lecturerName}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Student Name
              </span>
              <span className="font-bold text-slate-900">{displayRecord.studentName}</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                Matric Number
              </span>
              <span className="font-mono font-bold text-slate-900">
                {displayRecord.matricNumber}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date
              </span>
              <span className="font-semibold text-slate-800">{formattedDate}</span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Clock-In Time (Nigeria Time • WAT)
              </span>
              <span className="font-mono font-bold text-slate-900">{formattedTime}</span>
            </div>


            {displayRecord.isFlagged && (
              <div className="mt-2 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-[11px]">
                ⚠️ Note: This submission has been flagged for lecturer review (proxy or location check).
              </div>
            )}
          </div>

          {/* Action Buttons (Hidden on Print) */}
          <div className="p-6 pt-0 space-y-2 no-print">
            <button
              onClick={handlePrint}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save Receipt</span>
            </button>

            <Link
              href="/clock-in"
              className="w-full py-3 px-4 rounded-xl bg-fuoye-green text-white font-bold text-xs hover:bg-fuoye-green-dark transition-colors flex items-center justify-center gap-2"
            >
              <span>Clock In Another Course</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Footnote */}
        <p className="text-center text-[11px] text-slate-400 mt-4 no-print">
          Official Electronic Verification Slip • FUOYE SAMS
        </p>
      </div>
    </div>
  );
}
