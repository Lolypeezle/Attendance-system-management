"use client";

import React, { useEffect, useState } from "react";
import { X, Maximize2, Minimize2, Copy, Check, QrCode } from "lucide-react";
import QRCode from "qrcode";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: {
    id: string;
    courseCode: string;
    courseTitle: string;
    qrToken: string;
    lecturerName: string;
  };
}

export function QRCodeModal({ isOpen, onClose, session }: QRCodeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const clockInUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/clock-in?session=${session.id}&token=${session.qrToken}`
      : "";

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
              Live Lecture Session
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-2">
              {session.courseCode}: {session.courseTitle}
            </h2>
            <p className="text-xs text-slate-500">{session.lecturerName}</p>
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

        {/* QR Code Container */}
        <div className="my-6 flex flex-col items-center justify-center">
          <div className="p-4 bg-white border-2 border-emerald-500 rounded-2xl shadow-lg inline-block">
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
          <p className="mt-3 text-xs font-semibold text-slate-600 text-center max-w-xs">
            Scan this QR code with your mobile camera to clock in immediately
          </p>
        </div>

        {/* URL Sharing Bar */}
        <div className="space-y-3">
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

          <div className="text-[11px] text-center text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 font-medium">
            🔒 This signed QR code token will expire automatically when the session closes.
          </div>
        </div>
      </div>
    </div>
  );
}
