"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
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
  Camera,
  RefreshCw,
} from "lucide-react";
import { getBrowserFingerprint } from "@/lib/fingerprint";
import { getRemainingExpirySeconds } from "@/lib/tokens";
import { CameraQRScanner, ScannedQRResult } from "@/components/CameraQRScanner";

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
  const [qrToken, setQrToken] = useState<string>(urlQrToken);
  const [matricNumber, setMatricNumber] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [secretWord, setSecretWord] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<string>("");
  const [location, setLocation] = useState<{ lat?: number; lng?: number } | null>(null);
  const [remainingSecs, setRemainingSecs] = useState<number | null>(null);
  const [isWindowExpired, setIsWindowExpired] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const [currentTime, setCurrentTime] = useState<string>("");

  const secretWordInputRef = useRef<HTMLInputElement>(null);
  const matricInputRef = useRef<HTMLInputElement>(null);

  // Sync token from URL query if user clicked direct link
  useEffect(() => {
    if (urlQrToken) {
      setQrToken(urlQrToken);
    }
  }, [urlQrToken]);

  // Restore student matric and name from device localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMatric = localStorage.getItem("sams_student_matric");
      const savedName = localStorage.getItem("sams_student_name");
      if (savedMatric) setMatricNumber(savedMatric);
      if (savedName) setFullName(savedName);
    }
  }, []);

  // Nigeria Standard Time live clock
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

  // Track 20-minute expiry countdown
  useEffect(() => {
    const currentSession = activeSessions.find(
      (s) => s.id === selectedCourseOrSession || s.course_id === selectedCourseOrSession
    );

    if (currentSession?.opened_at) {
      const updateTimer = () => {
        const secs = getRemainingExpirySeconds(currentSession.opened_at);
        setRemainingSecs(secs);
        setIsWindowExpired(secs <= 0);
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setRemainingSecs(null);
      setIsWindowExpired(false);
    }
  }, [selectedCourseOrSession, activeSessions]);

  // Core submission handler
  const performClockIn = async (opts: {
    sessionId: string;
    token: string;
    matric: string;
    name: string;
    secret: string;
  }) => {
    setErrorMessage(null);
    setSubmitting(true);

    // Save student profile to localStorage for future frictionless scans
    if (typeof window !== "undefined") {
      localStorage.setItem("sams_student_matric", opts.matric.trim().toUpperCase());
      localStorage.setItem("sams_student_name", opts.name.trim());
    }

    try {
      const fp = fingerprint || (await getBrowserFingerprint());
      const payload = {
        sessionId: opts.sessionId,
        matricNumber: opts.matric.trim().toUpperCase(),
        fullName: opts.name.trim(),
        secretWord: opts.secret.trim().toUpperCase(),
        deviceFingerprint: fp,
        latitude: location?.lat,
        longitude: location?.lng,
        qrToken: opts.token.trim(),
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

  // Called when CameraQRScanner successfully decodes the lecturer's QR code
  const handleScanResult = (scanned: ScannedQRResult) => {
    setIsScannerOpen(false);
    const tokenVal = scanned.qrToken.trim();
    setQrToken(tokenVal);

    let sessionVal = selectedCourseOrSession;
    if (scanned.sessionId) {
      sessionVal = scanned.sessionId;
      setSelectedCourseOrSession(scanned.sessionId);
    }

    const currentMatric =
      matricNumber.trim() ||
      (typeof window !== "undefined" ? localStorage.getItem("sams_student_matric") || "" : "");
    const currentName =
      fullName.trim() ||
      (typeof window !== "undefined" ? localStorage.getItem("sams_student_name") || "" : "");
    const currentSecret = secretWord.trim();

    if (currentMatric && !matricNumber) setMatricNumber(currentMatric);
    if (currentName && !fullName) setFullName(currentName);

    // "Scan and Login / Clock In":
    // If student credentials and the lecturer's secret word are already filled, auto-submit immediately!
    if (currentMatric && currentName && currentSecret) {
      setScanNotice("QR code verified! Automatically logging in and clocking you in...");
      performClockIn({
        sessionId: sessionVal,
        token: tokenVal,
        matric: currentMatric,
        name: currentName,
        secret: currentSecret,
      });
    } else if (!currentSecret) {
      setScanNotice("✅ In-Class QR Code Verified! Enter the Class Unique Word to complete attendance.");
      setTimeout(() => {
        secretWordInputRef.current?.focus();
      }, 350);
    } else if (!currentMatric) {
      setScanNotice("✅ In-Class QR Code Verified! Please enter your Matriculation Number.");
      setTimeout(() => {
        matricInputRef.current?.focus();
      }, 350);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedCourseOrSession) {
      setErrorMessage("Please select a course for class attendance.");
      return;
    }

    // If QR code hasn't been scanned yet, clicking submit turns on the camera immediately!
    if (!qrToken) {
      setIsScannerOpen(true);
      return;
    }

    if (!matricNumber.trim()) {
      setErrorMessage("Please enter your matriculation number.");
      matricInputRef.current?.focus();
      return;
    }
    if (!fullName.trim()) {
      setErrorMessage("Please enter your full name.");
      return;
    }
    if (!secretWord.trim()) {
      setErrorMessage("Please enter the unique class word announced verbally by the lecturer in class.");
      secretWordInputRef.current?.focus();
      return;
    }

    await performClockIn({
      sessionId: selectedCourseOrSession,
      token: qrToken,
      matric: matricNumber,
      name: fullName,
      secret: secretWord,
    });
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
          {/* Primary Automatic Camera QR Scanner Trigger */}
          {qrToken ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-400/90 text-emerald-950 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                    <span>In-Class QR Code Verified</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold uppercase tracking-wider">
                      Locked
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-800 block mt-0.5">
                    Lecturer screen verified. Enter the unique word to finish.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0"
              >
                <Camera className="w-3.5 h-3.5 text-emerald-700" />
                <span>Rescan</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-fuoye-green to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-emerald-900/25 hover:shadow-emerald-900/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center text-white shadow-inner group-hover:rotate-6 transition-transform">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-300">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      Automatic Device Camera
                    </div>
                    <div className="font-black text-sm sm:text-base leading-tight mt-0.5">
                      Scan Lecturer&apos;s QR Code
                    </div>
                  </div>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-white/20 backdrop-blur text-xs font-bold text-white border border-white/20 group-hover:bg-white/30 transition-colors">
                  Tap to Scan &rarr;
                </div>
              </button>
              <p className="text-[11px] text-center text-slate-500 font-medium">
                Turns on device camera automatically to scan and authenticate your attendance.
              </p>
            </div>
          )}

          {scanNotice && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{scanNotice}</span>
            </div>
          )}

          {remainingSecs !== null && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                isWindowExpired
                  ? "bg-rose-50 border-rose-300 text-rose-800"
                  : remainingSecs < 180
                  ? "bg-rose-50 border-rose-300 text-rose-800 animate-pulse"
                  : remainingSecs < 600
                  ? "bg-amber-50 border-amber-300 text-amber-900"
                  : "bg-emerald-50 border-emerald-300 text-emerald-900"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>20-Minute Window:</span>
              </div>
              <span className="font-mono font-black text-sm tracking-wider">
                {isWindowExpired
                  ? "EXPIRED (LOCKED)"
                  : `${Math.floor(remainingSecs / 60)}:${(remainingSecs % 60)
                      .toString()
                      .padStart(2, "0")} remaining`}
              </span>
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
                  ref={matricInputRef}
                  type="text"
                  placeholder="e.g. CSC/2023/1001"
                  value={matricNumber}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setMatricNumber(val);
                    if (typeof window !== "undefined") {
                      localStorage.setItem("sams_student_matric", val);
                    }
                  }}
                  required
                  className="w-full text-xs font-mono font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-xl p-3 pl-9 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuoye-green focus:border-transparent transition-all uppercase placeholder:normal-case placeholder:font-sans"
                />
                <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
              <p className="text-[11px] text-slate-400">
                All 300L matriculation numbers (e.g. CSC/2023/...) are accepted and saved on this device.
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setFullName(val);
                    if (typeof window !== "undefined") {
                      localStorage.setItem("sams_student_name", val);
                    }
                  }}
                  required
                  className="w-full text-xs font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-xl p-3 pl-9 focus:bg-white focus:outline-none focus:ring-2 focus:ring-fuoye-green focus:border-transparent transition-all"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>

            {/* Unique Class Attendance Secret Word */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Class Attendance Unique Word <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  ref={secretWordInputRef}
                  type="text"
                  placeholder="Enter unique word announced in class..."
                  value={secretWord}
                  onChange={(e) => setSecretWord(e.target.value.toUpperCase())}
                  required
                  className="w-full text-xs font-mono font-bold tracking-widest text-purple-950 bg-purple-50/60 border border-purple-300 rounded-xl p-3 pl-9 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all uppercase placeholder:normal-case placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
                />
                <KeyRound className="w-4 h-4 text-purple-600 absolute left-3 top-3.5" />
              </div>
              <p className="text-[11px] text-slate-500 italic">
                Only students physically attending the lecture receive this unique word from the lecturer.
              </p>
            </div>

            {/* Strict Anti-Proxy Notice */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-[11px] text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Single Device & IP Enforcement: Submissions from the same IP address for this lecture are blocked.</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || isWindowExpired}
              className="w-full mt-2 py-3.5 px-4 bg-fuoye-green hover:bg-fuoye-green-light text-white font-extrabold rounded-xl text-xs sm:text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying & Clocking In...</span>
                </>
              ) : isWindowExpired ? (
                <span>Attendance Closed (20m Window Expired)</span>
              ) : !qrToken ? (
                <>
                  <Camera className="w-4 h-4 text-amber-300" />
                  <span>Turn On Camera & Scan to Clock In</span>
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

      {/* In-Browser Automatic Camera QR Scanner Modal */}
      <CameraQRScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanResult}
      />
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
