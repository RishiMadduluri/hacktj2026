"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Calendar,
  Shield,
  Video,
  User,
  Heart,
  Pill,
  ChevronRight,
  StopCircle,
  Clock,
  TrendingUp,
  Phone,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  Eye,
  MapPin,
} from "lucide-react";
import type { MedicalProfile, Incident, EmergencyContact } from "@/types/medical";

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "text-yellow-400 bg-yellow-900/20 border-yellow-800/50",
  MEDIUM: "text-orange-400 bg-orange-900/20 border-orange-800/50",
  HIGH: "text-red-400 bg-red-900/20 border-red-800/50",
  CRITICAL: "text-red-300 bg-red-950/40 border-red-700/50",
};

const TYPE_LABELS: Record<string, string> = {
  STROKE: "Stroke",
  FALL: "Fall",
  CARDIAC: "Cardiac",
  SEIZURE: "Seizure",
  DISTRESS: "Distress",
  NORMAL: "Normal",
};

const TYPE_ICONS: Record<string, string> = {
  STROKE: "🧠",
  FALL: "⬇️",
  CARDIAC: "❤️",
  SEIZURE: "⚡",
  DISTRESS: "🆘",
};

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  accent = false,
  trend,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
  accent?: boolean;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl p-5 border transition-all ${
        accent
          ? "bg-gradient-to-br from-red-950/40 to-[#111] border-red-900/30"
          : "bg-[#111] border-[#1F1F1F] hover:border-[#2A2A2A]"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-xl ${accent ? "bg-red-600/15" : "bg-white/5"}`}>
          <Icon className={`w-4.5 h-4.5 ${accent ? "text-red-500" : "text-zinc-500"}`} />
        </div>
        {trend && (
          <div className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            trend === "up" ? "bg-red-900/20 text-red-400" : trend === "down" ? "bg-green-900/20 text-green-400" : "bg-zinc-800 text-zinc-500"
          }`}>
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "—"}
          </div>
        )}
      </div>
      <div className="text-3xl font-black text-white mb-0.5 tracking-tight">{value}</div>
      <div className="text-[13px] text-zinc-500">{label}</div>
      {sub && <div className="text-[11px] text-zinc-600 mt-0.5">{sub}</div>}
    </motion.div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<MedicalProfile | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [daysMonitored, setDaysMonitored] = useState(0);
  const [latestEmergency, setLatestEmergency] = useState<Incident | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Geolocation watcher
  useEffect(() => {
    // Load cached location
    const cached = localStorage.getItem("firstwatch_location");
    if (cached) setLocation(JSON.parse(cached));

    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    let lastGeocode = 0;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc: { lat: number; lng: number; address?: string } = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        const now = Date.now();
        if (now - lastGeocode > 30000) {
          lastGeocode = now;
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${loc.lat}&lon=${loc.lng}&format=json`)
            .then((r) => r.json())
            .then((data) => {
              if (data.display_name) {
                loc.address = data.display_name;
                setLocation({ ...loc });
                localStorage.setItem("firstwatch_location", JSON.stringify(loc));
              }
            })
            .catch(() => {});
        }
        setLocation((prev) => ({ ...loc, address: prev?.address }));
        localStorage.setItem("firstwatch_location", JSON.stringify(loc));
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    const p = localStorage.getItem("firstwatch_profile");
    if (!p) {
      router.push("/onboarding");
      return;
    }
    setProfile(JSON.parse(p));

    const inc: Incident[] = JSON.parse(localStorage.getItem("firstwatch_incidents") || "[]");
    setIncidents(inc);

    const ct: EmergencyContact[] = JSON.parse(localStorage.getItem("firstwatch_contacts") || "[]");
    setContacts(ct);

    const monitoring = localStorage.getItem("firstwatch_monitoring") === "true";
    setIsMonitoring(monitoring);

    const startDate = localStorage.getItem("firstwatch_start_date");
    if (startDate) {
      const days = Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
      setDaysMonitored(Math.max(1, days));
    } else {
      localStorage.setItem("firstwatch_start_date", new Date().toISOString());
      setDaysMonitored(1);
    }
  }, [router]);

  useEffect(() => {
    const handleStorage = () => {
      const inc: Incident[] = JSON.parse(localStorage.getItem("firstwatch_incidents") || "[]");
      setIncidents(inc);

      const monitoring = localStorage.getItem("firstwatch_monitoring") === "true";
      setIsMonitoring(monitoring);

      if (inc.length > 0) {
        const latest = inc[inc.length - 1];
        if (latest.severity === "HIGH" || latest.severity === "CRITICAL") {
          setLatestEmergency(latest);
          setTimeout(() => setLatestEmergency(null), 8000);
        }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const todayIncidents = incidents.filter((i) => {
    const d = new Date(i.timestamp);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const thisWeekIncidents = incidents.filter((i) => {
    const d = new Date(i.timestamp);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  });

  const recentIncidents = incidents.slice(-5).reverse();
  const highSeverityCount = incidents.filter((i) => i.severity === "HIGH" || i.severity === "CRITICAL").length;

  // Get most common incident type
  const typeCounts: Record<string, number> = {};
  incidents.forEach((i) => {
    typeCounts[i.type] = (typeCounts[i.type] || 0) + 1;
  });
  const mostCommonType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  const greeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 text-sm">
            {profile ? `${greeting()}, ${profile.name.split(" ")[0]}` : "Good to see you"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isMonitoring ? (
            <Link
              href="/pages/live-feed"
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm shadow-lg shadow-red-900/20"
            >
              <Eye className="w-4 h-4" />
              View Feed
            </Link>
          ) : (
            <Link
              href="/pages/live-feed"
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2.5 rounded-xl transition-all text-sm shadow-lg shadow-red-900/20"
            >
              <Video className="w-4 h-4" />
              Start Monitoring
            </Link>
          )}
        </div>
      </div>

      {/* Emergency Alert Banner */}
      {latestEmergency && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20 }}
          className="p-5 rounded-2xl border-2 border-red-600 bg-gradient-to-r from-red-950/50 to-red-950/20 flex items-center gap-4 shadow-xl shadow-red-900/10"
        >
          <div className="p-2.5 rounded-xl bg-red-600 animate-pulse">
            <AlertTriangle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-red-300 font-bold text-lg tracking-tight">
                {TYPE_LABELS[latestEmergency.type] || latestEmergency.type} Detected
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${SEVERITY_COLORS[latestEmergency.severity]}`}>
                {latestEmergency.severity}
              </span>
            </div>
            <p className="text-red-200/80 text-sm mt-0.5">{latestEmergency.description}</p>
            <p className="text-red-400/60 text-xs mt-1">{new Date(latestEmergency.timestamp).toLocaleString()}</p>
          </div>
          <Link
            href="/pages/live-feed"
            className="flex-shrink-0 bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-xl transition-all text-sm"
          >
            View Feed
          </Link>
        </motion.div>
      )}

      {/* Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-center justify-between p-4 rounded-2xl border ${isMonitoring
          ? "bg-gradient-to-r from-red-950/20 to-transparent border-red-900/30"
          : "bg-[#111] border-[#1F1F1F]"
          }`}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-3 h-3 rounded-full ${isMonitoring ? "bg-red-500" : "bg-zinc-600"}`} />
            {isMonitoring && (
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-500 animate-ping opacity-75" />
            )}
          </div>
          <div>
            <span className={`font-semibold text-sm ${isMonitoring ? "text-red-400" : "text-zinc-400"}`}>
              {isMonitoring ? "Monitoring Active" : "Monitoring Inactive"}
            </span>
            <p className="text-xs text-zinc-600">
              {isMonitoring ? "AI is watching and analyzing the live feed" : "Start live feed to begin monitoring"}
            </p>
          </div>
        </div>
        <Link
          href="/pages/live-feed"
          className="text-sm text-red-500 hover:text-red-400 flex items-center gap-1 transition-colors"
        >
          {isMonitoring ? "View Feed" : "Activate"}
          <ChevronRight className="w-4 h-4" />
        </Link>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Alerts"
          value={todayIncidents.length}
          icon={AlertTriangle}
          accent={todayIncidents.length > 0}
          sub={todayIncidents.length === 0 ? "All clear today" : `${todayIncidents.filter(i => i.severity === "HIGH" || i.severity === "CRITICAL").length} high severity`}
          trend={todayIncidents.length > 0 ? "up" : "neutral"}
        />
        <StatCard
          label="This Week"
          value={thisWeekIncidents.length}
          icon={TrendingUp}
          sub={`${highSeverityCount} high severity total`}
        />
        <StatCard
          label="Total Incidents"
          value={incidents.length}
          icon={Activity}
          sub="All time"
        />
        <StatCard
          label="Days Monitored"
          value={daysMonitored}
          icon={Calendar}
          sub="Since setup"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Incidents - wider */}
        <div className="lg:col-span-2 bg-[#111] border border-[#1F1F1F] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-white">Recent Incidents</h2>
              <p className="text-xs text-zinc-600 mt-0.5">Latest detected events</p>
            </div>
            <Link href="/pages/history" className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1 transition-colors">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          {recentIncidents.length === 0 ? (
            <div className="text-center py-12">
              <ShieldCheck className="w-12 h-12 text-zinc-800 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm font-medium">No incidents recorded yet</p>
              <p className="text-zinc-700 text-xs mt-1">Start monitoring to detect events</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentIncidents.map((incident, i) => (
                <motion.div
                  key={incident.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 bg-[#0D0D0D] rounded-xl hover:bg-[#141414] transition-colors group"
                >
                  <div className="text-lg flex-shrink-0">{TYPE_ICONS[incident.type] || "📋"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {TYPE_LABELS[incident.type] || incident.type}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-bold ${SEVERITY_COLORS[incident.severity]}`}>
                        {incident.severity}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">{incident.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-[11px] text-zinc-600">
                      {new Date(incident.timestamp).toLocaleDateString()}
                    </div>
                    <div className="text-[10px] text-zinc-700">
                      {new Date(incident.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Live Location */}
          <div className="bg-[#111] border border-[#1F1F1F] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-red-500" />
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Live Location</h3>
            </div>
            {location ? (
              <div className="space-y-2">
                {location.address && (
                  <p className="text-sm text-zinc-300 leading-relaxed">{location.address}</p>
                )}
                <p className="text-xs text-zinc-600 font-mono">
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </p>
                <a
                  href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 transition-colors mt-1"
                >
                  <MapPin className="w-3 h-3" />
                  View on map
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <div className="text-center py-4">
                <MapPin className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                <p className="text-zinc-600 text-sm">Location not available</p>
                <p className="text-zinc-700 text-xs mt-1">Enable location access in your browser</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-[#111] border border-[#1F1F1F] rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                href="/pages/live-feed"
                className="flex items-center gap-3 p-3 bg-red-950/20 hover:bg-red-950/30 border border-red-900/30 rounded-xl text-red-400 text-sm transition-colors group"
              >
                <Video className="w-4 h-4" />
                <span className="font-medium">Open Live Feed</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                href="/pages/settings"
                className="flex items-center gap-3 p-3 bg-[#0D0D0D] hover:bg-[#141414] rounded-xl text-zinc-400 text-sm transition-colors group"
              >
                <Phone className="w-4 h-4" />
                <span className="font-medium">Manage Contacts</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                href="/pages/history"
                className="flex items-center gap-3 p-3 bg-[#0D0D0D] hover:bg-[#141414] rounded-xl text-zinc-400 text-sm transition-colors group"
              >
                <Clock className="w-4 h-4" />
                <span className="font-medium">View History</span>
                <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </div>

          {/* Emergency Contacts */}
          <div className="bg-[#111] border border-[#1F1F1F] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Emergency Contacts</h3>
              <Link href="/pages/settings" className="text-[10px] text-red-500 hover:text-red-400 transition-colors">
                Manage
              </Link>
            </div>
            {contacts.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-zinc-600 text-sm">No contacts added</p>
                <Link href="/pages/settings" className="text-xs text-red-500 hover:text-red-400 mt-1 inline-block">
                  Add emergency contacts →
                </Link>
              </div>
            ) : (
              <div className="space-y-1.5">
                {contacts.slice(0, 3).map((contact, i) => (
                  <div key={contact.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#0D0D0D] transition-colors">
                    <div className="w-7 h-7 rounded-full bg-red-950/50 flex items-center justify-center text-[10px] font-bold text-red-400 border border-red-900/30">
                      {i + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white">{contact.name}</div>
                      <div className="text-[11px] text-zinc-600">{contact.relationship} · {contact.phone}</div>
                    </div>
                  </div>
                ))}
                {contacts.length > 3 && (
                  <p className="text-[11px] text-zinc-600 text-center pt-1">+{contacts.length - 3} more</p>
                )}
              </div>
            )}
          </div>

          {/* Health Profile */}
          {profile && (
            <div className="bg-[#111] border border-[#1F1F1F] rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Health Profile</h3>
                <Link href="/pages/settings" className="text-[10px] text-red-500 hover:text-red-400 transition-colors">
                  Edit
                </Link>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                  <span className="text-sm text-zinc-300">{profile.name}{profile.age ? `, ${profile.age}` : ""}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Heart className="w-4 h-4 text-red-500/60 flex-shrink-0" />
                  <span className="text-sm text-zinc-300">Blood: <span className="text-white font-medium">{profile.bloodType}</span></span>
                </div>
                {profile.allergies.length > 0 && (
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-yellow-500/60 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-zinc-300">{profile.allergies.join(", ")}</span>
                  </div>
                )}
                {profile.medications.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Pill className="w-4 h-4 text-zinc-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-zinc-300">{profile.medications.length} medication{profile.medications.length !== 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>

              {/* Incident breakdown */}
              {mostCommonType && (
                <div className="mt-4 pt-4 border-t border-[#1F1F1F]">
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-2">Most Common Alert</p>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{TYPE_ICONS[mostCommonType[0]] || "📋"}</span>
                    <div>
                      <span className="text-sm font-medium text-white">{TYPE_LABELS[mostCommonType[0]] || mostCommonType[0]}</span>
                      <span className="text-xs text-zinc-600 ml-2">{mostCommonType[1]}x</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
