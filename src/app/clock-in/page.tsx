"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Clock,
  User,
  Hash,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  QrCode,
  MapPin,
  Loader2,
  Sparkles,
  ShieldCheck,
  KeyRound,
} from "lucide-react";
import { getBrowserFingerprint } from "@/lib/fingerprint";

const DEFAULT_300L_COURSES = [
  { id: "crs_302", course_code: "CSC 302", course_title: "Object-Oriented Programming & Systems" },
  { id: "crs_304", course_code: "CSC 304", course_title: "Database Systems & File Organization" },
  { id: "crs_306", course_code: "CSC 306", course_title: "Algorithms & Complexity Analysis" },
  { id: "crs_308", course_code: "CSC 308", course_title: "Formal Languages & Automata Theory" },
  { id: "crs_312", course_code: "CSC 312", course_title: "Computer Architecture & Organization" },
  { id: "crs_314", course_code: "CSC 314", course_title: "Operations Research & Computing" },
  { id: "crs_316", course_code: "CSC 316", course_title: "Web Development & Technologies" },
  { id: "crs_320", course_code: "CSC 320", course_title: "Human-Computer Interaction (HCI)" },
];

function ClockInForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlSessionId = searchParams.get("session") || "";
  const urlQrToken = searchParams.get("token") || "";

  const [courses, setCourses] = useState<any[]>(DEFAULT_300L_COURSES);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [selectedCourseOrSession, setSelectedCourseOrSession] = useState<string>(urlSessionId || "crs_302");
  const [matricNumber, setMatricNumber] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [secretWord, setSecretWord] = useState<string>(urlQrToken || "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string>("");
  const [location, setLocation] = useState<{ lat?: number; lng?: number } | null>(null);


  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const getNigeriaTime = () =>
      new Date().toLocaleTimeString("en-NG", {
        timeZone: "Africa/Lagos",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });

    setCurrentTime(getNigeriaTime());
    const timer = setInterval(() => {
      setCurrentTime(getNigeriaTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);


  useEffect(() => {
    getBrowserFingerprint().then((fp) => setFingerprint(fp));


    // Fetch active sessions and courses
    Promise.all([
      fetch("/api/sessions/active").then((r) => r.json()).catch(() => ({ sessions: [] })),
      fetch("/api/courses").then((r) => r.json()).catch(() => ({ courses: [] })),
    ]).then(([sessData, courseData]) => {
      const liveSessions = sessData.sessions || [];
      setActiveSessions(liveSessions);

      if (courseData.courses && courseData.courses.length > 0) {
        setCourses(courseData.courses);
      }

      if (urlSessionId) {
        setSelectedCourseOrSession(urlSessionId);
      } else if (liveSessions.length > 0) {
        setSelectedCourseOrSession(liveSessions[0].id);
      }
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { timeout: 5000 }
      );
    }
  }, [urlSessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedCourseOrSession) {
      setErrorMessage("Please select a course for class attendance.");
      return;
    }
    if (!matricNumber.trim()) {
      setErrorMessage("Please enter your matriculation number.");
      return;
    }
    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!secretWord.trim()) {
      setErrorMessage("Please enter the unique class secret word announced by the lecturer in class.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        sessionId: selectedCourseOrSession,
        matricNumber: matricNumber.trim().toUpperCase(),
        fullName: fullName.trim(),
        secretWord: secretWord.trim().toUpperCase(),
        deviceFingerprint: fingerprint,
        latitude: location?.lat,
        longitude: location?.lng,
        qrToken: urlQrToken || secretWord.trim().toUpperCase(),
      };


      const res = await fetch("/api/clock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to clock in. Please try again.");
        setSubmitting(false);
        return;
      }

      if (typeof window !== "undefined") {
        sessionStorage.setItem("last_attendance_record", JSON.stringify(data.record));
      }

      router.push("/clock-in/success");
    } catch {
      setErrorMessage("A network error occurred. Please check your connection.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 bg-slate-50">
      <div className="max-w-md w-full">
        {/* Card Header */}
        <div className="text-center mb-6 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-fuoye-green text-xs font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>Official Student Attendance Desk</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Lecture Attendance
          </h1>
          <p className="text-xs text-slate-500">
            Federal University Oye-Ekiti • Department of Computer Science (300L)
          </p>
        </div>

        {/* Clock-In Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-7 space-y-5">
          {urlQrToken && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-fuoye-green text-xs font-semibold">
              <QrCode className="w-4 h-4 shrink-0" />
              <span>Verified Class Session Token Attached</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Live Attendance Clock (Nigeria Time - WAT) */}
          <div className="bg-slate-900 text-white rounded-xl p-3.5 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
              <div>
                <div className="text-[11px] font-bold text-slate-200">Nigeria Standard Time (WAT)</div>
                <div className="text-[10px] text-slate-400">FUOYE Official Lecture Clock (GMT+1)</div>
              </div>
            </div>
            <div className="font-mono text-xs sm:text-sm font-black text-emerald-400 tracking-wider bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
              {currentTime || "--:--:--"}
            </div>
          </div>


          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Course Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Course for Class <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedCourseOrSession}
                  onChange={(e) => setSelectedCourseOrSession(e.target.value)}
                  required
                  className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-xl p-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuoye-green focus:border-transparent transition-all"
                >
                  <optgroup label="Active Live Sessions">
                    {activeSessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        🟢 {s.course?.course_code} — {s.course?.course_title} (Live Session)
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="300-Level Computer Science Courses">
                    {courses.map((c) => (
                      <option key={c.id || c.course_code} value={c.id || c.course_code}>
                        📚 {c.course_code} — {c.course_title}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Matric Number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Matriculation Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. CSC/2022/1001"
                  value={matricNumber}
                  onChange={(e) => setMatricNumber(e.target.value.toUpperCase())}
                  required
                  className="w-full text-xs font-mono font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl p-3 pl-9 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuoye-green focus:border-transparent transition-all uppercase placeholder:normal-case placeholder:font-sans"
                />
                <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
              <p className="text-[11px] text-slate-400">
                All 300L matriculation numbers are accepted.
              </p>
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Full Name (Surname First) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Ajayi Damilola"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-xl p-3 pl-9 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuoye-green focus:border-transparent transition-all"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>

            {/* Unique Class Attendance Secret Word */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Class Attendance Secret Word <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter secret word announced in class..."
                  value={secretWord}
                  onChange={(e) => setSecretWord(e.target.value.toUpperCase())}
                  required
                  className="w-full text-xs font-mono font-bold tracking-widest text-purple-950 bg-purple-50/60 border border-purple-300 rounded-xl p-3 pl-9 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all uppercase placeholder:normal-case placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
                />
                <KeyRound className="w-4 h-4 text-purple-600 absolute left-3 top-3.5" />
              </div>
              <p className="text-[11px] text-slate-500 italic">
                Only students physically attending the lecture will receive this unique word from the lecturer.
              </p>
            </div>

            {/* Submit Button */}

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 bg-fuoye-green hover:bg-fuoye-green-light text-white font-bold rounded-xl text-xs transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Recording Attendance...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Clock In for Class</span>
                </>
              )}
            </button>
          </form>

          {/* Institutional footer */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Attendance records are archived directly to Department Records.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClockInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-xs text-slate-500">
          Loading attendance desk...
        </div>
      }
    >
      <ClockInForm />
    </Suspense>
  );
}
