"use client";

import React, { useEffect, useState } from "react";
import { X, Maximize2, Minimize2, Copy, Check, QrCode, Clock, KeyRound, ShieldAlert } from "lucide-react";
import QRCode from "qrcode";
import { getRemainingExpirySeconds, isSessionAttendanceExpired } from "@/lib/tokens";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: {
    id: string;
    courseCode: string;
    courseTitle: string;
    qrToken: string;
    secretWord?: string;
    openedAt?: string | Date;
    lecturerName: string;
  };
}

export function QRCodeModal({ isOpen, onClose, session }: QRCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [remainingSecs, setRemainingSecs] = useState<number>(() =>
    session.openedAt ? getRemainingExpirySeconds(session.openedAt) : 1200
  );

  const clockInUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/clock-in?session=${session.id}&token=${session.qrToken}`
      : "";

  useEffect(() => {
    if (!isOpen || !session.openedAt) return;
    setRemainingSecs(getRemainingExpirySeconds(session.openedAt));
    const timer = setInterval(() => {
      setRemainingSecs(getRemainingExpirySeconds(session.openedAt!));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, session.openedAt]);

  useEffect(() => {
    if (isOpen && clockInUrl) {
      QRCode.toDataURL(clockInUrl, {
        width: 480,
        margin: 2,
        color: {
          dark: "#004D2C", // FUOYE deep green
          light: "#FFFFFF",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("Error generating QR code:", err));
    }
  }, [isOpen, clockInUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(clockInUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const minutes = Math.floor(remainingSecs / 60);
  const seconds = remainingSecs % 60;
  const isExpired = remainingSecs <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className={`bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          isFullscreen
            ? "fixed inset-0 rounded-none w-screen h-screen p-8 justify-between"
            : "max-w-md w-full p-6"
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
              Lecturer Mobile & Projector Screen
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-2">
              {session.courseCode}: {session.courseTitle}
            </h2>
            <p className="text-xs text-slate-500">Lecturer: {session.lecturerName}</p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              title={isFullscreen ? "Exit Fullscreen" : "Projector Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 20-Minute Expiry Countdown Bar */}
        <div className={`mt-3 p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
          isExpired
            ? "bg-rose-50 border-rose-300 text-rose-800"
            : remainingSecs < 180
            ? "bg-rose-50 border-rose-300 text-rose-800 animate-pulse"
            : remainingSecs < 600
            ? "bg-amber-50 border-amber-300 text-amber-900"
            : "bg-emerald-50 border-emerald-300 text-emerald-900"
        }`}>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>20-Minute Attendance Window:</span>
          </div>
          <span className="font-mono text-sm font-black tracking-wider">
            {isExpired ? "EXPIRED (Locked)" : `${minutes}:${seconds.toString().padStart(2, "0")} remaining`}
          </span>
        </div>

        {/* Class Unique Word Display */}
        {session.secretWord && (
          <div className="mt-2.5 p-3 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-purple-700" />
              <div>
                <span className="text-[10px] uppercase font-bold text-purple-600 block">Class Unique Word</span>
                <span className="font-mono text-base font-black text-purple-950 tracking-widest">
                  {session.secretWord}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-purple-700 bg-white px-2 py-1 rounded-lg border border-purple-200">
              Announce in class
            </span>
          </div>
        )}

        {/* QR Code Container */}
        <div className="my-4 flex flex-col items-center justify-center">
          <div className={`p-4 bg-white border-2 rounded-2xl shadow-lg inline-block ${
            isExpired ? "border-slate-300 opacity-60" : "border-emerald-500"
          }`}>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Session Clock-In QR Code"
                className={`transition-all duration-300 ${
                  isFullscreen ? "w-96 h-96" : "w-64 h-64"
                } object-contain`}
              />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center text-slate-400">
                <QrCode className="w-12 h-12 animate-pulse" />
              </div>
            )}
          </div>
          <p className="mt-2.5 text-xs font-semibold text-slate-600 text-center max-w-xs">
            Students must scan this QR code with their mobile phone and enter the Unique Word
          </p>
        </div>

        {/* URL Sharing Bar */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 border border-slate-200">
            <input
              type="text"
              readOnly
              value={clockInUrl}
              className="bg-transparent text-xs text-slate-600 w-full truncate focus:outline-none px-2 font-mono"
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-fuoye-green text-white hover:bg-fuoye-green-dark shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>

          <div className="text-[11px] text-center text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium flex items-center justify-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Anti-Proxy: QR scan token, unique word, and single-IP validation enforced.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
