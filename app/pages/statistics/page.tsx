"use client";

import { useState, useEffect } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Download } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
  LineController,
} from "chart.js";
import { Bar, Pie, Line } from "react-chartjs-2";

/* Register Chart.js modules */
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  LineController,
);

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MedicalMoment {
  feedName: string;
  timestamp: string;
  description: string;
  isCritical: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function downloadCsv(moments: MedicalMoment[]) {
  const header = ["Feed", "Timestamp", "Description", "Critical"].join(",");
  const rows = moments.map((m) =>
    [m.feedName, m.timestamp, `"${m.description}"`, String(m.isCritical)].join(","),
  );
  const csv = [header, ...rows].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `firstwatch-report-${new Date().toISOString().split("T")[0]}.csv`;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function StatisticsPage() {
  const [moments, setMoments] = useState<MedicalMoment[]>([]);
  const [aiSummary, setAiSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [charts, setCharts] = useState<{
    criticalByFeed: any;
    criticalRatio: any;
    criticalTimeline: any;
  }>({ criticalByFeed: null, criticalRatio: null, criticalTimeline: null });

  /* Load saved data on mount */
  useEffect(() => {
    const raw = JSON.parse(localStorage.getItem("savedVideos") || "[]");
    const parsed: MedicalMoment[] = raw.flatMap((v: any) =>
      v.timestamps.map((ts: any) => ({
        feedName: v.name,
        timestamp: ts.timestamp,
        description: ts.description,
        isCritical: ts.isDangerous ?? false,
      })),
    );
    setMoments(parsed);

    /* Fetch AI summary */
    if (parsed.length > 0) {
      setSummaryLoading(true);
      fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyMoments: parsed }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          setAiSummary(data.summary);
        })
        .catch((err) => {
          console.error("[stats] summary error:", err);
          setAiSummary(`Error: ${err?.message ?? "Could not generate summary"}`);
        })
        .finally(() => setSummaryLoading(false));
    }

    /* Build charts */
    const critical = parsed.filter((m) => m.isCritical);
    const countByFeed: Record<string, number> = {};
    for (const m of critical) countByFeed[m.feedName] = (countByFeed[m.feedName] ?? 0) + 1;

    const trendBuckets: Record<string, number> = {};
    for (const m of critical) {
      const [h, min] = m.timestamp.split(":").map(Number);
      const bucket = `${String(h).padStart(2, "0")}:${String(Math.floor(min / 15) * 15).padEnd(2, "0")}`;
      trendBuckets[bucket] = (trendBuckets[bucket] ?? 0) + 1;
    }

    setCharts({
      criticalByFeed: {
        labels: Object.keys(countByFeed),
        datasets: [
          {
            label: "Critical Moments per Feed",
            data: Object.values(countByFeed),
            backgroundColor: "rgba(220, 38, 38, 0.6)",
            borderColor: "rgba(220, 38, 38, 1)",
            borderWidth: 1,
          },
        ],
      },
      criticalRatio: {
        labels: ["Critical", "Normal"],
        datasets: [
          {
            label: "Incident Breakdown",
            data: [critical.length, parsed.length - critical.length],
            backgroundColor: ["rgba(220, 38, 38, 0.6)", "rgba(34, 197, 94, 0.6)"],
            borderColor: ["rgba(220, 38, 38, 1)", "rgba(34, 197, 94, 1)"],
            borderWidth: 1,
          },
        ],
      },
      criticalTimeline: {
        labels: Object.keys(trendBuckets).sort(),
        datasets: [
          {
            label: "Critical Events Over Time",
            data: Object.keys(trendBuckets)
              .sort()
              .map((k) => trendBuckets[k]),
            backgroundColor: "rgba(220, 38, 38, 0.2)",
            borderColor: "rgba(220, 38, 38, 1)",
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          },
        ],
      },
    });
  }, []);

  /* ---- Table setup ---- */
  const col = createColumnHelper<MedicalMoment>();

  const columns = [
    col.accessor("feedName", {
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Feed <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: (info) => info.getValue(),
    }),
    col.accessor("timestamp", {
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Time <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: (info) => info.getValue(),
    }),
    col.accessor("description", {
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Description <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: (info) => info.getValue(),
    }),
  ];

  const table = useReactTable({
    data: moments,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex-1 w-full flex flex-col gap-8 items-center p-8">
      <div className="w-full max-w-6xl flex flex-col gap-8">
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Critical Moments by Feed</h2>
            {charts.criticalByFeed && (
              <Bar
                data={charts.criticalByFeed}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: "top" as const },
                    title: { display: true, text: "Critical Detections per Monitoring Feed" },
                  },
                }}
              />
            )}
          </div>

          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Critical vs Normal</h2>
            {charts.criticalRatio && (
              <Pie
                data={charts.criticalRatio}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: "right" as const },
                    title: { display: true, text: "Medical Incident Distribution" },
                  },
                }}
              />
            )}
          </div>

          <div className="p-6 bg-card rounded-lg border shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Critical Trend Over Time</h2>
            {charts.criticalTimeline && (
              <Line
                data={charts.criticalTimeline}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: "top" as const },
                    title: { display: true, text: "Critical Events Timeline" },
                  },
                  scales: {
                    y: { beginAtZero: true, title: { display: true, text: "Incidents" } },
                    x: { title: { display: true, text: "Time (15-min buckets)" } },
                  },
                }}
              />
            )}
          </div>
        </div>

        {/* Table header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Medical Key Moments</h1>
          <Button onClick={() => downloadCsv(moments)} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Data table */}
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-4 py-3 text-left bg-muted/50">
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} data-state={row.getIsSelected() && "selected"} className="border-t hover:bg-muted/50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-24 text-center">
                    No moments recorded yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-sm text-muted-foreground">
          {moments.length} key moment{moments.length !== 1 && "s"} across all feeds
        </p>

        {/* AI Summary */}
        <div className="mt-8 p-6 bg-white/5 rounded-lg backdrop-blur-sm border border-white/10">
          <h2 className="text-2xl font-semibold mb-4">AI Medical Summary</h2>
          {summaryLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
            </div>
          ) : (
            aiSummary && (
              <div className="prose prose-invert max-w-none">
                <div className="whitespace-pre-line">{aiSummary}</div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
