"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Video,
  History,
  Settings,
  LogOut,
  Activity,
  ChevronRight,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import OrgAlertListener from "@/components/org-alert-listener";

const navItems = [
  { href: "/protected", label: "Dashboard", icon: LayoutDashboard, desc: "Overview & stats" },
  { href: "/pages/live-feed", label: "Live Feed", icon: Video, desc: "Real-time monitoring" },
  { href: "/pages/history", label: "History", icon: History, desc: "Past incidents" },
  { href: "/pages/organizations", label: "Organizations", icon: Users, desc: "Camera groups" },
  { href: "/pages/settings", label: "Settings", icon: Settings, desc: "Profile & contacts" },
];

export default function PagesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>("");
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [incidentCount, setIncidentCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email || "");
    });

    const checkState = () => {
      setIsMonitoring(localStorage.getItem("firstwatch_monitoring") === "true");
      const incidents = JSON.parse(localStorage.getItem("firstwatch_incidents") || "[]");
      setIncidentCount(incidents.length);
    };
    checkState();
    window.addEventListener("storage", checkState);

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => window.removeEventListener("storage", checkState);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
  };

  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <OrgAlertListener />
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-[#080808] border-r border-[#1A1A1A] flex flex-col fixed h-full z-30">
        {/* Logo */}
        <div className="p-5 border-b border-[#1A1A1A]">
          <Link href="/protected" className="flex items-center gap-2.5 group">
            <div className="p-1.5 rounded-lg bg-red-600/10 group-hover:bg-red-600/20 transition-colors">
              <Activity className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <span className="text-red-500 font-black tracking-widest text-xs block">FIRSTWATCH</span>
              <span className="text-zinc-600 text-[10px] tracking-wider">AI MEDICAL GUARDIAN</span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-3 pt-3 pb-2">Navigation</p>
          {navItems.map(({ href, label, icon: Icon, desc }) => {
            const active = pathname === href || (href !== "/protected" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group ${active
                  ? "bg-red-950/30 text-red-400"
                  : "text-zinc-500 hover:bg-[#111] hover:text-zinc-300"
                  }`}
              >
                <div className={`p-1.5 rounded-lg ${active ? "bg-red-600/15" : "bg-transparent group-hover:bg-white/5"} transition-colors`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[13px] leading-tight">{label}</div>
                  <div className={`text-[10px] ${active ? "text-red-500/50" : "text-zinc-700"} leading-tight`}>{desc}</div>
                </div>
                {label === "History" && incidentCount > 0 && (
                  <span className="text-[10px] font-bold bg-red-600/20 text-red-400 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {incidentCount}
                  </span>
                )}
                {active && <ChevronRight className="w-3 h-3 text-red-500/50" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-3 border-t border-[#1A1A1A] space-y-2">
          {/* Monitoring status */}
          <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isMonitoring ? "bg-red-950/20" : "bg-[#111]"}`}>
            <div className="relative">
              <div className={`w-2.5 h-2.5 rounded-full ${isMonitoring ? "bg-red-500" : "bg-zinc-600"}`} />
              {isMonitoring && (
                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping opacity-75" />
              )}
            </div>
            <div className="flex-1">
              <div className={`text-[11px] font-semibold ${isMonitoring ? "text-red-400" : "text-zinc-500"}`}>
                {isMonitoring ? "Monitoring Active" : "Not Monitoring"}
              </div>
              {isMonitoring && (
                <div className="text-[10px] text-red-500/40">AI analyzing feed</div>
              )}
            </div>
            {isMonitoring && (
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 status-pulse" />
            )}
          </div>

          {/* User info */}
          <div className="px-3 py-2">
            <p className="text-[11px] text-zinc-600 truncate">{userEmail}</p>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-zinc-600 hover:text-zinc-300 hover:bg-[#111] rounded-xl transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}
