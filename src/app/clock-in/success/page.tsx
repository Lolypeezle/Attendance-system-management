"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";

export default function ClockInSuccessPage() {
  useEffect(() => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#006B3F", "#E5A823", "#10B981"],
      });
    } catch {}
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-slate-50">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 p-8 sm:p-10 text-center space-y-6">
          {/* Success Check Icon */}
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-200 animate-in zoom-in-95 duration-200">
            <CheckCircle2 className="w-12 h-12 text-fuoye-green stroke-[2.5]" />
          </div>

          {/* Clean User-Specified Message */}
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Success!
            </h1>
            <p className="text-base sm:text-lg font-bold text-emerald-800">
              Your attendance has been recorded.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Federal University Oye-Ekiti • Department of Computer Science
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <Link
              href="/"
              className="w-full py-3.5 px-4 rounded-xl bg-fuoye-green hover:bg-fuoye-green-dark text-white font-extrabold text-xs sm:text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <span>Back to Home</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
