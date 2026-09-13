"use client";

import { useEffect, useState } from "react";
import { Monitor, Heartbeat } from "../types";
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  ExternalLink,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_BASE = "http://localhost:5000/api/monitors";

export default function Dashboard() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [selectedMonitor, setSelectedMonitor] = useState<Monitor | null>(null);
  const [heartbeats, setHeartbeats] = useState<Heartbeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [intervalSeconds, setIntervalSeconds] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // 1. Fetch all monitors
  const fetchMonitors = async () => {
    try {
      const res = await fetch(API_BASE);
      const json = await res.json();
      if (json.success) {
        setMonitors(json.data);
        if (!selectedMonitor && json.data.length > 0) {
          setSelectedMonitor(json.data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch monitors:", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch heartbeats for selected monitor
  const fetchHeartbeats = async (monitorId: string) => {
    setChartLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${monitorId}/heartbeats`);
      const json = await res.json();
      if (json.success) {
        setHeartbeats(json.data);
      }
    } catch (err) {
      console.error("Failed to fetch heartbeats:", err);
    } finally {
      setChartLoading(false);
    }
  };

  // Initial load & 10s auto-refresh
  useEffect(() => {
    fetchMonitors();
    const interval = setInterval(fetchMonitors, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch chart when selected monitor changes
  useEffect(() => {
    if (selectedMonitor) {
      fetchHeartbeats(selectedMonitor.id);
    }
  }, [selectedMonitor?.id]);

  // 3. Handle Add Monitor
  const handleCreateMonitor = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url, intervalSeconds }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create monitor");
      }

      setName("");
      setUrl("");
      setIsModalOpen(false);
      await fetchMonitors();
      setSelectedMonitor(json.data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Handle Delete Monitor
  const handleDeleteMonitor = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this monitor?")) return;

    try {
      await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
      setMonitors((prev) => prev.filter((m) => m.id !== id));
      if (selectedMonitor?.id === id) {
        const remaining = monitors.filter((m) => m.id !== id);
        setSelectedMonitor(remaining[0] || null);
      }
    } catch (err) {
      console.error("Failed to delete monitor:", err);
    }
  };

  // Calculate Metrics
  const totalMonitors = monitors.length;
  const upMonitors = monitors.filter((m) => m.status === "UP").length;
  const downMonitors = monitors.filter((m) => m.status === "DOWN").length;
  const avgLatency =
      heartbeats.length > 0
          ? Math.round(
              heartbeats.reduce((acc, h) => acc + h.latencyMs, 0) / heartbeats.length
          )
          : 0;

  // Format chart data
  const chartData = heartbeats.map((h) => ({
    time: new Date(h.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    latency: h.latencyMs,
    status: h.isUp ? "UP" : "DOWN",
  }));

  return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 md:p-10 font-sans">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* HEADER */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800/80 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  PulseGuard
                  <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-mono">
                  Live
                </span>
                </h1>
                <p className="text-xs text-zinc-400">
                  Autonomous API & Website Health Monitoring
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                  onClick={fetchMonitors}
                  className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-200 transition"
                  title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium px-4 py-2.5 rounded-xl transition shadow-lg shadow-emerald-500/10"
              >
                <Plus className="w-4 h-4" />
                Add Monitor
              </button>
            </div>
          </header>

          {/* METRICS ROW */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5">
              <div className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
                Total Endpoints
              </div>
              <div className="text-2xl font-bold mt-2 text-white">{totalMonitors}</div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5">
              <div className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
                Operational
              </div>
              <div className="text-2xl font-bold mt-2 text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                {upMonitors}
              </div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5">
              <div className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
                Disrupted
              </div>
              <div className="text-2xl font-bold mt-2 text-red-400 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                {downMonitors}
              </div>
            </div>
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5">
              <div className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
                Avg Latency
              </div>
              <div className="text-2xl font-bold mt-2 text-zinc-200">
                {avgLatency > 0 ? `${avgLatency}ms` : "—"}
              </div>
            </div>
          </div>

          {/* MAIN TWO-COLUMN LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* LEFT: MONITORS LIST */}
            <div className="lg:col-span-1 space-y-3">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                Monitored Targets
              </h2>

              {loading ? (
                  <div className="text-sm text-zinc-500 py-8 text-center">
                    Loading monitors...
                  </div>
              ) : monitors.length === 0 ? (
                  <div className="border border-dashed border-zinc-800 rounded-2xl p-8 text-center space-y-3">
                    <ShieldCheck className="w-8 h-8 text-zinc-600 mx-auto" />
                    <p className="text-sm text-zinc-400">No monitors configured yet.</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="text-xs text-emerald-400 hover:underline"
                    >
                      Create your first monitor
                    </button>
                  </div>
              ) : (
                  monitors.map((m) => {
                    const isSelected = selectedMonitor?.id === m.id;
                    const latestHeartbeat = m.heartbeats?.[0];

                    return (
                        <div
                            key={m.id}
                            onClick={() => setSelectedMonitor(m)}
                            className={`cursor-pointer p-4 rounded-2xl border transition relative ${
                                isSelected
                                    ? "bg-zinc-900 border-emerald-500/50 shadow-md shadow-emerald-500/5"
                                    : "bg-zinc-900/40 border-zinc-800/80 hover:bg-zinc-900/80 hover:border-zinc-700"
                            }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-white text-base">
                                {m.name}
                              </div>
                              <a
                                  href={m.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 mt-1 truncate max-w-[200px]"
                              >
                                {m.url}
                                <ExternalLink className="w-3 h-3 opacity-60" />
                              </a>
                            </div>

                            {/* Status Pill */}
                            <span
                                className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 ${
                                    m.status === "UP"
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        : m.status === "DOWN"
                                            ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                }`}
                            >
                        <span
                            className={`w-1.5 h-1.5 rounded-full ${
                                m.status === "UP"
                                    ? "bg-emerald-400 animate-pulse"
                                    : m.status === "DOWN"
                                        ? "bg-red-400 animate-ping"
                                        : "bg-amber-400"
                            }`}
                        />
                              {m.status}
                      </span>
                          </div>

                          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Every {m.intervalSeconds}s
                      </span>
                            <div className="flex items-center gap-3">
                              {latestHeartbeat && (
                                  <span className="text-zinc-300 font-mono">
                            {latestHeartbeat.latencyMs}ms
                          </span>
                              )}
                              <button
                                  onClick={(e) => handleDeleteMonitor(m.id, e)}
                                  className="text-zinc-500 hover:text-red-400 transition"
                                  title="Delete Monitor"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                    );
                  })
              )}
            </div>

            {/* RIGHT: INTERACTIVE LATENCY CHART */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6">
                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {selectedMonitor ? selectedMonitor.name : "Select a monitor"}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Response latency trend over recent check cycles
                    </p>
                  </div>
                  {selectedMonitor && (
                      <div className="text-right">
                        <div className="text-xs text-zinc-400">Current Health</div>
                        <div
                            className={`text-sm font-semibold ${
                                selectedMonitor.status === "UP"
                                    ? "text-emerald-400"
                                    : "text-red-400"
                            }`}
                        >
                          {selectedMonitor.status === "UP" ? "100% Operational" : "Service Disrupted"}
                        </div>
                      </div>
                  )}
                </div>

                {chartLoading ? (
                    <div className="h-64 flex items-center justify-center text-zinc-500 text-sm">
                      Loading metrics...
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-zinc-500 text-sm gap-2">
                      <Activity className="w-8 h-8 opacity-30" />
                      No heartbeats recorded yet. Checks run every 60 seconds!
                    </div>
                ) : (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis
                              dataKey="time"
                              stroke="#71717a"
                              fontSize={11}
                              tickLine={false}
                          />
                          <YAxis
                              stroke="#71717a"
                              fontSize={11}
                              unit="ms"
                              tickLine={false}
                              axisLine={false}
                          />
                          <Tooltip
                              contentStyle={{
                                backgroundColor: "#18181b",
                                borderColor: "#27272a",
                                borderRadius: "0.75rem",
                                color: "#fafafa",
                                fontSize: "12px",
                              }}
                          />
                          <Area
                              type="monotone"
                              dataKey="latency"
                              stroke="#10b981"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#latencyGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                )}
              </div>
            </div>
          </div>

          {/* ADD MONITOR MODAL */}
          {isModalOpen && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl">
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Plus className="w-5 h-5 text-emerald-400" />
                      Add New Monitor
                    </h3>
                    <button
                        onClick={() => setIsModalOpen(false)}
                        className="text-zinc-500 hover:text-zinc-300 text-sm"
                    >
                      ✕
                    </button>
                  </div>

                  {errorMsg && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                        {errorMsg}
                      </div>
                  )}

                  <form onSubmit={handleCreateMonitor} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                        Friendly Name
                      </label>
                      <input
                          type="text"
                          required
                          placeholder="e.g. My Portfolio API"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                        Endpoint URL
                      </label>
                      <input
                          type="url"
                          required
                          placeholder="https://myapi.com/health"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                        Check Interval
                      </label>
                      <select
                          value={intervalSeconds}
                          onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
                      >
                        <option value={30}>Every 30 seconds</option>
                        <option value={60}>Every 1 minute</option>
                        <option value={300}>Every 5 minutes</option>
                      </select>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                      <button
                          type="button"
                          onClick={() => setIsModalOpen(false)}
                          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm transition"
                      >
                        Cancel
                      </button>
                      <button
                          type="submit"
                          disabled={submitting}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-medium rounded-xl text-sm transition shadow-lg shadow-emerald-500/10 disabled:opacity-50"
                      >
                        {submitting ? "Checking & Saving..." : "Start Monitoring"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
          )}
        </div>
      </div>
  );
}