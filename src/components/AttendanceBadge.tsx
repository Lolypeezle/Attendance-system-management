import React from "react";
import { CheckCircle2, Clock, XCircle, AlertTriangle, FileText } from "lucide-react";

interface AttendanceBadgeProps {
  status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED" | string;
  isFlagged?: boolean;
  flagReason?: string | null;
  size?: "sm" | "md";
}

export function AttendanceBadge({
  status,
  isFlagged = false,
  flagReason,
  size = "md",
}: AttendanceBadgeProps) {
  const sizeClasses = size === "sm" ? "text-xs px-2 py-0.5 gap-1" : "text-xs font-semibold px-2.5 py-1 gap-1.5";

  let badgeStyle = "bg-gray-100 text-gray-700 border-gray-200";
  let icon = null;

  switch (status) {
    case "PRESENT":
      badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
      icon = <CheckCircle2 className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />;
      break;
    case "LATE":
      badgeStyle = "bg-amber-50 text-amber-800 border-amber-200";
      icon = <Clock className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />;
      break;
    case "ABSENT":
      badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
      icon = <XCircle className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />;
      break;
    case "EXCUSED":
      badgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
      icon = <FileText className={size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"} />;
      break;
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center rounded-full border ${sizeClasses} ${badgeStyle}`}
      >
        {icon}
        <span>{status}</span>
      </span>

      {isFlagged && (
        <span
          title={flagReason || "Flagged for proxy / suspicious pattern"}
          className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-300 cursor-help gap-1"
        >
          <AlertTriangle className="w-3 h-3 text-red-600" />
          <span>Flagged</span>
        </span>
      )}
    </div>
  );
}
