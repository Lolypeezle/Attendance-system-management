"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  History,
  ArrowLeft,
  Search,
  Filter,
  Download,
  Loader2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/audit-logs?limit=200");
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterAction !== "ALL" && log.action !== filterAction) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        log.actor_name.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.entity_type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const actionsList = Array.from(new Set(logs.map((l) => l.action)));

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-fuoye-green animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">System Audit Trail</h1>
            <p className="text-xs text-slate-500">
              Immutable, read-only ledger recording all security events, status modifications, and approvals.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            const jsonBlob = new Blob([JSON.stringify(logs, null, 2)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(jsonBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `FUOYE_SAMS_AuditTrail_${Date.now()}.json`;
            a.click();
          }}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 flex items-center gap-1.5 self-start sm:self-auto transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit Trail (JSON)</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-600">Action:</span>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl p-2"
          >
            <option value="ALL">All Recorded Actions</option>
            {actionsList.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Search actor, action, entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2 pl-8"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4 text-right">Change Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No audit records matching criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  const hasDetails = log.old_value || log.new_value;

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {log.actor_name}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] ${
                              log.action.includes("DELETE") || log.action.includes("DEACTIVATED")
                                ? "bg-rose-100 text-rose-800"
                                : log.action.includes("CORRECTION")
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {log.entity_type} {log.entity_id ? `(#${log.entity_id.slice(-6)})` : ""}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {hasDetails ? (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : log.id)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-fuoye-green hover:underline"
                            >
                              <span>{isExpanded ? "Hide Diff" : "Inspect Diff"}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={5} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] font-mono">
                              {log.old_value && (
                                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                                  <span className="text-slate-400 font-bold uppercase block mb-1">
                                    Previous Value (Old State)
                                  </span>
                                  <pre className="text-rose-700 whitespace-pre-wrap overflow-x-auto">
                                    {log.old_value}
                                  </pre>
                                </div>
                              )}
                              {log.new_value && (
                                <div className="p-3 bg-white border border-slate-200 rounded-xl">
                                  <span className="text-slate-400 font-bold uppercase block mb-1">
                                    Updated Value (New State)
                                  </span>
                                  <pre className="text-emerald-700 whitespace-pre-wrap overflow-x-auto">
                                    {log.new_value}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
