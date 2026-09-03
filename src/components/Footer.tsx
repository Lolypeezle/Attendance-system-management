import React from "react";

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800 no-print text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-fuoye-green flex items-center justify-center text-white font-bold text-xs">
              FU
            </div>
            <div>
              <p className="font-semibold text-slate-200">
                Department of Computer Science
              </p>
              <p className="text-[11px] text-slate-500">
                Federal University Oye-Ekiti, Ekiti State, Nigeria
              </p>
            </div>
          </div>

          <div className="text-center md:text-right">
            <p className="italic text-slate-300 font-serif text-[12px]">
              &ldquo;Innovation and Character for National Transformation&rdquo;
            </p>
            <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center justify-center md:justify-end gap-2">
              <span>Student Attendance Management System (SAMS) • 2025/2026 Academic Session</span>
              <span className="hidden sm:inline">•</span>
              <a
                href="/login"
                className="text-slate-500 hover:text-slate-300 transition-colors underline"
              >
                Admin Login
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
