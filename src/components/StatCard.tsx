import React, { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  color?: "emerald" | "gold" | "blue" | "rose" | "purple";
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = "emerald",
}: StatCardProps) {
  const colorMap = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    gold: "bg-amber-50 text-amber-700 border-amber-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm hover:shadow transition-shadow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        <div className={`p-2.5 rounded-lg border ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {value}
        </div>
        {(subtitle || trend) && (
          <div className="mt-1 flex items-center text-xs gap-1.5">
            {trend && (
              <span
                className={`font-semibold ${
                  trend.positive ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {trend.value}
              </span>
            )}
            {subtitle && <span className="text-slate-500">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
