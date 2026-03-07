"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  Trash2,
  ChevronDown,
  ChevronUp,
  Filter,
  AlertTriangle,
  Shield,
  Download,
  Search,
  Calendar,
  Clock,
  Play,
} from "lucide-react";
import type { Incident } from "@/types/medical";

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "text-yellow-400 border-yellow-700/50 bg-yellow-900/20",
  MEDIUM: "text-orange-400 border-orange-700/50 bg-orange-900/20",
  HIGH: "text-red-400 border-red-700/50 bg-red-900/20",
  CRITICAL: "text-red-300 border-red-600/50 bg-red-950/40",
};

const SEVERITY_DOT: Record<string, string> = {
  LOW: "bg-yellow-500",
  MEDIUM: "bg-orange-500",
  HIGH: "bg-red-500",
  CRITICAL: "bg-red-600",
};

const TYPE_ICONS: Record<string, string> = {
  STROKE: "🧠",
  FALL: "⬇️",
  CARDIAC: "❤️",
  SEIZURE: "⚡",
  DISTRESS: "🆘",
  NORMAL: "✅",
};

const TYPE_LABELS: Record<string, string> = {
  STROKE: "Stroke",
  FALL: "Fall",
  CARDIAC: "Cardiac Event",
  SEIZURE: "Seizure",
  DISTRESS: "Distress",
  NORMAL: "Normal",
};

const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export default function HistoryPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filter, setFilter] = useState<{ type: string; severity: string }>({ type: "ALL", severity: "ALL" });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("firstwatch_incidents");
    if (stored) setIncidents(JSON.parse(stored));

    // Listen for real-time updates
    const handleStorage = () => {
      const updated = localStorage.getItem("firstwatch_incidents");
      if (updated) setIncidents(JSON.parse(updated));
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const filtered = incidents
    .filter((i) => filter.type === "ALL" || i.type === filter.type)
    .filter((i) => filter.severity === "ALL" || i.severity === filter.severity)
    .filter((i) => !searchQuery || i.description.toLowerCase().includes(searchQuery.toLowerCase()) || i.type.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const handleDelete = (id: string) => {
    const updated = incidents.filter((i) => i.id !== id);
    setIncidents(updated);
    localStorage.setItem("firstwatch_incidents", JSON.stringify(updated));
  };

  const handleClearAll = () => {
    if (!confirm("Delete all incidents? This cannot be undone.")) return;
    setIncidents([]);
    localStorage.setItem("firstwatch_incidents", "[]");
  };

  const handleExportCSV = () => {
    const headers = ["ID", "Type", "Severity", "Description", "Timestamp", "Confirmed", "Has Audio"];
    const rows = filtered.map((i) => [
      i.id,
      i.type,
      i.severity,
      `"${i.description.replace(/"/g, '""')}"`,
      new Date(i.timestamp).toISOString(),
      i.isConfirmed ? "Yes" : "No",
      i.audioUrl ? "Yes" : "No",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `firstwatch-incidents-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const uniqueTypes = Array.from(new Set(incidents.map((i) => i.type)));

  // Group by date
  const groupedByDate: Record<string, Incident[]> = {};
  filtered.forEach((inc) => {
    const dateKey = new Date(inc.timestamp).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(inc);
  });

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Incident History</h1>
          <p className="text-zinc-500 text-sm">{incidents.length} total incidents recorded</p>
        </div>
        <div className="flex items-center gap-2">
          {incidents.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-2 bg-[#111] border border-[#1F1F1F] rounded-xl text-zinc-400 hover:text-white text-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          )}
          <button
            onClick={() => setShowFilters((p) => !p)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${
              showFilters ? "bg-red-950/30 border border-red-900/30 text-red-400" : "bg-[#111] border border-[#1F1F1F] text-zinc-400 hover:text-white"
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filter
          </button>
          {incidents.length > 0 && (
            <button
              onClick={handleClearAll}
              className="flex items-center gap-2 px-3 py-2 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 hover:bg-red-950/30 text-sm transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search incidents..."
          className="w-full bg-[#111] border border-[#1F1F1F] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-600/50 transition-colors"
        />
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-[#111] border border-[#1F1F1F] rounded-xl p-4 flex flex-wrap gap-4">
              <div>
                <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1.5">Type</label>
                <select
                  value={filter.type}
                  onChange={(e) => setFilter((p) => ({ ...p, type: e.target.value }))}
                  className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-red-600/50"
                >
                  <option value="ALL">All Types</option>
                  {uniqueTypes.map((t) => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1.5">Severity</label>
                <select
                  value={filter.severity}
                  onChange={(e) => setFilter((p) => ({ ...p, severity: e.target.value }))}
                  className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-red-600/50"
                >
                  <option value="ALL">All Severities</option>
                  {SEVERITY_ORDER.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {(filter.type !== "ALL" || filter.severity !== "ALL") && (
                <button
                  onClick={() => setFilter({ type: "ALL", severity: "ALL" })}
                  className="self-end text-xs text-red-500 hover:text-red-400 mb-1.5"
                >
                  Clear filters
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      {incidents.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SEVERITY_ORDER.map((sev) => {
            const count = incidents.filter((i) => i.severity === sev).length;
            return (
              <motion.div
                key={sev}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  filter.severity === sev ? "ring-1 ring-white/10" : ""
                } ${SEVERITY_COLORS[sev]}`}
                onClick={() => setFilter((p) => ({ ...p, severity: p.severity === sev ? "ALL" : sev }))}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${SEVERITY_DOT[sev]}`} />
                  <div className="text-xs font-semibold">{sev}</div>
                </div>
                <div className="text-2xl font-black">{count}</div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Incidents list - grouped by date */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          {incidents.length === 0 ? (
            <>
              <Shield className="w-14 h-14 text-zinc-800 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-zinc-500">No incidents recorded</h2>
              <p className="text-zinc-600 text-sm mt-1">Incidents will appear here after monitoring sessions.</p>
            </>
          ) : (
            <>
              <History className="w-14 h-14 text-zinc-800 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-zinc-500">No incidents match your search</h2>
              <button onClick={() => { setFilter({ type: "ALL", severity: "ALL" }); setSearchQuery(""); }} className="text-red-500 text-sm mt-2 hover:text-red-400">
                Clear all filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, dateIncidents]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{date}</h3>
                <div className="flex-1 h-px bg-[#1F1F1F]" />
                <span className="text-[10px] text-zinc-600">{dateIncidents.length} event{dateIncidents.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="space-y-2">
                {dateIncidents.map((incident, i) => (
                  <motion.div
                    key={incident.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-[#111] border border-[#1F1F1F] rounded-xl overflow-hidden hover:border-[#2A2A2A] transition-colors"
                  >
                    <div className="flex items-start gap-3 p-4">
                      <div className="text-xl flex-shrink-0 mt-0.5">
                        {TYPE_ICONS[incident.type] || "📋"}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${SEVERITY_COLORS[incident.severity]}`}>
                            {incident.severity}
                          </span>
                          <span className="text-sm font-semibold text-white">{TYPE_LABELS[incident.type] || incident.type}</span>
                          <div className="flex items-center gap-1 ml-auto text-zinc-600">
                            <Clock className="w-3 h-3" />
                            <span className="text-[11px]">
                              {new Date(incident.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{incident.description}</p>
                        {incident.audioUrl && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Play className="w-3 h-3 text-red-500" />
                            <span className="text-[10px] text-red-400">Audio recording available</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setExpanded(expanded === incident.id ? null : incident.id)}
                          className="p-1.5 rounded-lg hover:bg-[#1A1A1A] text-zinc-600 hover:text-white transition-colors"
                        >
                          {expanded === incident.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(incident.id)}
                          className="p-1.5 rounded-lg hover:bg-red-950/30 text-zinc-700 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {expanded === incident.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-[#1A1A1A] px-4 py-4 space-y-3 overflow-hidden bg-[#0D0D0D]"
                        >
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-zinc-600 block mb-0.5">Full description</span>
                              <span className="text-zinc-300">{incident.description}</span>
                            </div>
                            <div>
                              <span className="text-zinc-600 block mb-0.5">Timestamp</span>
                              <span className="text-zinc-300">{new Date(incident.timestamp).toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-zinc-600 block mb-0.5">Incident ID</span>
                              <span className="text-zinc-300 font-mono text-[11px]">{incident.id}</span>
                            </div>
                            {incident.duration && (
                              <div>
                                <span className="text-zinc-600 block mb-0.5">Recording Duration</span>
                                <span className="text-zinc-300">{incident.duration}s</span>
                              </div>
                            )}
                            {incident.isConfirmed !== undefined && (
                              <div>
                                <span className="text-zinc-600 block mb-0.5">Confirmed</span>
                                <span className={incident.isConfirmed ? "text-green-400" : "text-red-400"}>
                                  {incident.isConfirmed ? "Yes" : "No"}
                                </span>
                              </div>
                            )}
                          </div>
                          {incident.audioUrl && (
                            <div className="pt-2">
                              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Audio Recording</p>
                              <audio controls src={incident.audioUrl} className="w-full h-8 rounded" />
                            </div>
                          )}
                          {!incident.audioUrl && (
                            <p className="text-xs text-zinc-700 italic">No audio recording for this incident.</p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
