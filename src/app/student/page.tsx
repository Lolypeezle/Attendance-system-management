"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Clock, ShieldAlert, ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";

export default function StudentPortalPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect student to clock-in
    router.replace("/clock-in");
  }, [router]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-7 text-center space-y-5">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-fuoye-green flex items-center justify-center mx-auto">
          <Clock className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-900">Student Attendance Portal</h1>
          <p className="text-xs text-slate-500">
            Attendance history and ledger records are restricted to Department Administration.
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-2">
          <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-fuoye-green" />
            <span>300L Class Attendance</span>
          </p>
          <p className="text-[11px] text-slate-600">
            Students can clock in for lecture attendance across all 8 300L courses.
          </p>
        </div>

        <Link
          href="/clock-in"
          className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 bg-fuoye-green hover:bg-fuoye-green-light text-white font-bold rounded-xl text-xs transition-all shadow-md"
        >
          <span>Proceed to Class Clock-In</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
