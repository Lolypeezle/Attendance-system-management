"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  X,
  RefreshCw,
  Zap,
  ZapOff,
  AlertCircle,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

export interface ScannedQRResult {
  sessionId?: string;
  qrToken: string;
  rawText: string;
}

interface CameraQRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (result: ScannedQRResult) => void;
}

/**
 * Robust parser for attendance QR code content
 * Handles:
 * 1. Full URLs: https://.../clock-in?session=XYZ&token=ABC
 * 2. Query Strings: ?session=XYZ&token=ABC or session=XYZ&token=ABC
 * 3. JSON payloads: {"session": "XYZ", "token": "ABC"}
 * 4. Raw token strings
 */
export function parseAttendanceQR(raw: string): ScannedQRResult {
  const trimmed = raw.trim();

  // 1. Full URL
  try {
    const url = new URL(trimmed);
    const session = url.searchParams.get("session") || undefined;
    const token = url.searchParams.get("token") || undefined;
    if (token) {
      return { sessionId: session, qrToken: token, rawText: trimmed };
    }
  } catch {
    // Not a full URL with protocol
  }

  // 2. Relative URL / Query string
  if (trimmed.includes("?")) {
    const query = trimmed.split("?")[1];
    const params = new URLSearchParams(query);
    const session = params.get("session") || undefined;
    const token = params.get("token") || undefined;
    if (token) {
      return { sessionId: session, qrToken: token, rawText: trimmed };
    }
  }

  // 3. JSON string
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const obj = JSON.parse(trimmed);
      const session = obj.session || obj.sessionId || undefined;
      const token = obj.token || obj.qrToken || undefined;
      if (token) {
        return { sessionId: session, qrToken: token, rawText: trimmed };
      }
    } catch {
      // Ignore JSON parse error
    }
  }

  // 4. Default: fallback as raw token
  return { qrToken: trimmed, rawText: trimmed };
}

/**
 * Play a pleasant acoustic confirmation chime via Web Audio API
 */
function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5
    osc.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.16); // E6

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.23);
  } catch {
    // AudioContext blocked or not supported
  }
}

export function CameraQRScanner({ isOpen, onClose, onScan }: CameraQRScannerProps) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [cameraIndex, setCameraIndex] = useState(0);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasHandledScanRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn("Could not cleanly stop scanner:", err);
      } finally {
        scannerRef.current = null;
      }
    }
    setIsScanning(false);
  }, []);

  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      if (hasHandledScanRef.current) return;
      hasHandledScanRef.current = true;

      setScanSuccess(true);
      playSuccessChime();

      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([80, 40, 80]);
      }

      const parsed = parseAttendanceQR(decodedText);

      // Short delay for visual checkmark before stopping & closing
      setTimeout(async () => {
        await stopScanner();
        onScan(parsed);
      }, 400);
    },
    [onScan, stopScanner]
  );

  const startCamera = useCallback(
    async (preferredCameraId?: string) => {
      setIsInitializing(true);
      setCameraError(null);
      hasHandledScanRef.current = false;
      setScanSuccess(false);

      try {
        // Clean up any existing scanner instance first
        if (scannerRef.current) {
          await stopScanner();
        }

        const scanner = new Html5Qrcode("sams-qr-reader", {
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
        scannerRef.current = scanner;

        // Query available video devices
        let cameraList: Array<{ id: string; label: string }> = [];
        try {
          const rawCams = await Html5Qrcode.getCameras();
          if (rawCams && rawCams.length > 0) {
            cameraList = rawCams.map((c) => ({ id: c.id, label: c.label || "Camera" }));
            setCameras(cameraList);
          }
        } catch {
          // getCameras query may fail in some restrictive iframes
        }

        const scanConfig = {
          fps: 15,
          qrbox: (w: number, h: number) => {
            const min = Math.min(w, h);
            const edge = Math.max(180, Math.floor(min * 0.72));
            return { width: edge, height: edge };
          },
          aspectRatio: 1.0,
        };

        // Determine camera target: specific ID, or environment (rear), fallback to user
        let started = false;

        if (preferredCameraId) {
          try {
            await scanner.start(
              preferredCameraId,
              scanConfig,
              (decoded) => handleScanSuccess(decoded),
              () => {}
            );
            started = true;
          } catch (e) {
            console.warn("Failed starting camera by ID, attempting fallback", e);
          }
        }

        if (!started) {
          try {
            // First priority: mobile rear camera (environment)
            await scanner.start(
              { facingMode: "environment" },
              scanConfig,
              (decoded) => handleScanSuccess(decoded),
              () => {}
            );
            started = true;
          } catch (envErr) {
            console.warn("Environment camera not available, trying first camera device:", envErr);
            // Second priority: first available camera device
            const fallbackId = cameraList[0]?.id || { facingMode: "user" };
            await scanner.start(
              fallbackId,
              scanConfig,
              (decoded) => handleScanSuccess(decoded),
              () => {}
            );
            started = true;
          }
        }

        setIsScanning(true);
        setIsInitializing(false);

        // Check torch capability
        try {
          const caps = scanner.getRunningTrackCapabilities() as any;
          if (caps && caps.torch) {
            setHasTorch(true);
          }
        } catch {
          setHasTorch(false);
        }
      } catch (err: any) {
        console.error("Camera activation error:", err);
        setIsInitializing(false);
        setIsScanning(false);

        const msg = String(err?.message || err);
        if (msg.includes("NotAllowedError") || msg.includes("Permission denied")) {
          setCameraError(
            "Camera permission was denied. Please allow camera access in your browser address bar settings to scan the lecturer's QR code."
          );
        } else if (msg.includes("NotFoundError") || msg.includes("Requested device not found")) {
          setCameraError("No camera hardware detected on this device. You can choose a photo of the QR code instead.");
        } else {
          setCameraError(
            "Unable to access the device camera. Please make sure no other app is using it, or select a photo of the QR code."
          );
        }
      }
    },
    [handleScanSuccess, stopScanner]
  );

  // Switch between front/back or next camera
  const handleSwitchCamera = async () => {
    if (cameras.length <= 1) return;
    const nextIdx = (cameraIndex + 1) % cameras.length;
    setCameraIndex(nextIdx);
    await startCamera(cameras[nextIdx].id);
  };

  // Toggle flashlight / torch if supported
  const handleToggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any],
      });
      setTorchOn(nextTorch);
    } catch (e) {
      console.warn("Could not toggle torch:", e);
    }
  };

  // File upload fallback
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsInitializing(true);
      setCameraError(null);

      // Create a temporary scanner if not active
      const scanner = scannerRef.current || new Html5Qrcode("sams-qr-reader", { verbose: false });
      scannerRef.current = scanner;

      const decodedText = await scanner.scanFile(file, false);
      handleScanSuccess(decodedText);
    } catch {
      setIsInitializing(false);
      setCameraError("No clear QR code could be read from that photo. Please point camera directly or pick a clearer photo.");
    }
  };

  // Open & Close lifecycle
  useEffect(() => {
    if (isOpen) {
      // Delay slightly for modal mount transition
      const timer = setTimeout(() => {
        startCamera();
      }, 150);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, startCamera, stopScanner]);

  // Handle escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm sm:max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-white">
        {/* Header Bar */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 bg-slate-900/90 backdrop-blur z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-1.5">
                <span>In-Class QR Scanner</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
              </h2>
              <p className="text-[11px] text-slate-400">Point your camera at lecturer&apos;s screen</p>
            </div>
          </div>

          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close scanner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewfinder Box */}
        <div className="relative w-full aspect-square bg-black overflow-hidden flex items-center justify-center">
          {/* Html5Qrcode video target container */}
          <div id="sams-qr-reader" className="w-full h-full object-cover" />

          {/* Initializing Spinner Overlay */}
          {isInitializing && (
            <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-3 z-10">
              <Loader2 className="w-9 h-9 text-emerald-400 animate-spin" />
              <div className="text-center px-6">
                <span className="text-xs font-bold text-slate-200 block">Starting Device Camera...</span>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Please allow camera permission when prompted by your browser
                </span>
              </div>
            </div>
          )}

          {/* Success Checkmark Flash */}
          {scanSuccess && (
            <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-30 animate-in zoom-in-95 duration-150">
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/50">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
              <span className="text-sm font-black text-emerald-200">QR Code Verified!</span>
              <span className="text-xs text-emerald-300/80">Applying credentials & logging in...</span>
            </div>
          )}

          {/* Interactive Scanning HUD Overlay (Shown when actively scanning) */}
          {isScanning && !scanSuccess && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6 sm:p-8">
              {/* Outer Viewfinder Boundary */}
              <div className="relative w-full h-full max-w-[260px] max-h-[260px] border border-emerald-500/30 rounded-2xl">
                {/* Glowing Reticle Corners */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg shadow-[0_0_12px_#10B981]" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg shadow-[0_0_12px_#10B981]" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg shadow-[0_0_12px_#10B981]" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg shadow-[0_0_12px_#10B981]" />

                {/* Animated Horizontal Laser Scanline */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_10px_#10B981] animate-laser" />
              </div>
            </div>
          )}

          {/* Camera Error / Permission Block Screen */}
          {cameraError && (
            <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center gap-3 z-20">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-rose-200">Camera Access Issue</h3>
              <p className="text-xs text-slate-300 max-w-xs leading-relaxed">{cameraError}</p>

              <div className="flex flex-col sm:flex-row gap-2 mt-2 w-full max-w-xs">
                <button
                  onClick={() => startCamera()}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Camera</span>
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-600 transition-all flex items-center justify-center gap-1.5"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Upload Photo</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scanner Controls Toolbar */}
        <div className="p-3.5 sm:p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2">
          {/* Camera Toggle Button (if multiple cameras detected) */}
          {cameras.length > 1 ? (
            <button
              onClick={handleSwitchCamera}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
              title="Flip camera"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Flip ({cameras.length})</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/90 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Auto-focus enabled</span>
            </div>
          )}

          {/* Torch toggle if hardware supports */}
          {hasTorch && (
            <button
              onClick={handleToggleTorch}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors ${
                torchOn
                  ? "bg-amber-500/20 text-amber-300 border-amber-400"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
              }`}
              title="Toggle Flashlight"
            >
              {torchOn ? <Zap className="w-4 h-4 text-amber-400" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          {/* Photo File Picker fallback */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Photo</span>
            </button>
          </div>
        </div>

        {/* Helper Instructions Footer */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800/60 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            Hold your phone steady until the lecturer&apos;s QR code is centered.
          </p>
        </div>
      </div>
    </div>
  );
}
