"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Users,
  ArrowLeft,
  AlertTriangle,
  Pill,
  VideoOff,
  Wifi,
  WifiOff,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CAMERA_SHARING_STORAGE_KEY } from "@/lib/supabase/events";
import { getOrgMembers, getUserOrgMembership } from "@/lib/supabase/data";
import {
  applyCameraFrame,
  applyEmergencyAlert,
  applyOfflineTimeout,
  buildMemberFeeds,
  type MemberFeed,
} from "@/lib/organizations/member-feeds";
import { getOrgChannel } from "@/lib/supabase/realtime";
import type { RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";

const MEMBERS_REFRESH_INTERVAL_MS = 5000;

export default function OrgCameraGrid() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.orgId as string;

  const [orgName, setOrgName] = useState("");
  const [feeds, setFeeds] = useState<Record<string, MemberFeed>>({});
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const membershipChannelRef = useRef<RealtimeChannel | null>(null);
  const onlineCheckRef = useRef<NodeJS.Timeout | null>(null);
  const membersRefreshRef = useRef<NodeJS.Timeout | null>(null);

  const loadMembers = useCallback(
    async (supabase: ReturnType<typeof createClient>, userId: string) => {
      const membership = await getUserOrgMembership(supabase, userId, orgId);
      if (!membership) {
        router.push("/pages/organizations");
        return false;
      }

      setOrgName(membership.name);

      const members = await getOrgMembers(supabase, orgId);
      setFeeds((prev) => buildMemberFeeds(members, prev));
      setLoading(false);
      return true;
    },
    [orgId, router],
  );

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/sign-in"); return; }
      const hasMembership = await loadMembers(supabase, user.id);
      if (!mounted || !hasMembership) return;

      // Subscribe to realtime channel
      const channel = getOrgChannel(supabase, orgId);

      channel
        .on("broadcast", { event: "camera-frame" }, (payload) => {
          const { userId, userName, frame, ts } = payload.payload;
          setFeeds((prev) =>
            applyCameraFrame(prev, { userId, userName, frame, ts }),
          );
        })
        .on("broadcast", { event: "emergency-alert" }, (payload) => {
          const { userId, userName, incident } = payload.payload;
          setFeeds((prev) =>
            applyEmergencyAlert(prev, { userId, userName, incident }),
          );

          // Play alert sound
          try {
            const audio = new Audio("/alert.mp3");
            audio.volume = 0.8;
            audio.play();
          } catch {}

          // Browser notification
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`Emergency: ${userName}`, {
              body: `${incident.type} - ${incident.description}`,
              icon: "/HawkWatchLogo.png",
              tag: `org-emergency-${userId}`,
              requireInteraction: true,
            });
          }
        })
        .on("broadcast", { event: "camera-sharing-changed" }, () => {
          void loadMembers(supabase, user.id);
        })
        .on("broadcast", { event: "org-membership-changed" }, () => {
          void loadMembers(supabase, user.id);
        })
        .subscribe();

      channelRef.current = channel;

      membershipChannelRef.current = supabase
        .channel(`org-members-${orgId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "org_members", filter: `org_id=eq.${orgId}` },
          () => {
            void loadMembers(supabase, user.id);
          },
        )
        .subscribe();

      const handleStorage = (event: StorageEvent) => {
        if (event.key !== CAMERA_SHARING_STORAGE_KEY || !event.newValue) {
          return;
        }

        try {
          const payload = JSON.parse(event.newValue) as { orgId?: string };
          if (payload.orgId === orgId) {
            void loadMembers(supabase, user.id);
          }
        } catch {
          // Ignore malformed cross-tab events.
        }
      };

      window.addEventListener("storage", handleStorage);

      // Check online status every 3 seconds
      onlineCheckRef.current = setInterval(() => {
        setFeeds((prev) => applyOfflineTimeout(prev, Date.now()));
      }, 3000);

      // Keep the grid converging even if a transient realtime refresh signal is missed.
      membersRefreshRef.current = setInterval(() => {
        void loadMembers(supabase, user.id);
      }, MEMBERS_REFRESH_INTERVAL_MS);

      return () => {
        window.removeEventListener("storage", handleStorage);
      };
    };

    let cleanupStorageListener: (() => void) | undefined;
    init().then((cleanup) => {
      cleanupStorageListener = cleanup;
    });

    return () => {
      mounted = false;
      cleanupStorageListener?.();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (membershipChannelRef.current) {
        supabase.removeChannel(membershipChannelRef.current);
      }
      if (onlineCheckRef.current) {
        clearInterval(onlineCheckRef.current);
      }
      if (membersRefreshRef.current) {
        clearInterval(membersRefreshRef.current);
      }
    };
  }, [MEMBERS_REFRESH_INTERVAL_MS, loadMembers, orgId, router]);

  const memberFeeds = Object.values(feeds);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/pages/organizations"
          className="p-2 rounded-xl bg-[#111] border border-[#1F1F1F] text-zinc-400 hover:text-white hover:border-[#2A2A2A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{orgName}</h1>
          <p className="text-zinc-500 text-sm">
            {memberFeeds.length} members · {memberFeeds.filter((f) => f.cameraEnabled && f.isOnline).length} online
          </p>
        </div>
      </div>

      {/* Camera Grid */}
      {loading ? (
        <div className="text-center py-16">
          <p className="text-zinc-600 text-sm">Loading members...</p>
        </div>
      ) : memberFeeds.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-14 h-14 text-zinc-800 mx-auto mb-4" />
          <p className="text-zinc-500">No members in this organization</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {memberFeeds.map((feed) => (
            <motion.div
              key={feed.userId}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`bg-[#111] border rounded-2xl overflow-hidden transition-all ${
                feed.hasEmergency
                  ? "border-red-600 shadow-lg shadow-red-900/20 animate-pulse"
                  : "border-[#1F1F1F] hover:border-[#2A2A2A]"
              }`}
            >
              {/* Video feed */}
              <div className="relative aspect-video bg-[#0A0A0A]">
                {feed.cameraEnabled && feed.lastFrame ? (
                  <img
                    src={feed.lastFrame}
                    alt={`${feed.userName}'s feed`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {feed.cameraEnabled ? (
                      <User className="w-12 h-12 text-zinc-800" />
                    ) : (
                      <div className="text-center text-zinc-600">
                        <VideoOff className="w-10 h-10 mx-auto mb-2" />
                        <p className="text-xs font-medium uppercase tracking-widest">Camera Off</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Online status */}
                <div className={`absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold ${
                  !feed.cameraEnabled
                    ? "bg-zinc-800/80 text-zinc-400"
                    : feed.isOnline
                    ? "bg-green-600/80 text-white"
                    : "bg-zinc-800/80 text-zinc-400"
                }`}>
                  {!feed.cameraEnabled ? <VideoOff className="w-3 h-3" /> : feed.isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {!feed.cameraEnabled ? "CAMERA OFF" : feed.isOnline ? "LIVE" : "OFFLINE"}
                </div>

                {/* Emergency badge */}
                {feed.hasEmergency && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-red-600 text-white text-[10px] font-bold animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    EMERGENCY
                  </div>
                )}
              </div>

              {/* Member info */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-white text-sm">{feed.userName}</h3>
                  <div className={`w-2 h-2 rounded-full ${feed.cameraEnabled && feed.isOnline ? "bg-green-500" : "bg-zinc-600"}`} />
                </div>

                {feed.profile && (
                  <div className="space-y-1 text-xs text-zinc-500">
                    {feed.profile.age > 0 && (
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3" />
                        Age {feed.profile.age}
                        {feed.profile.bloodType && feed.profile.bloodType !== "Unknown" && (
                          <span className="ml-1">· Blood: <span className="text-white font-medium">{feed.profile.bloodType}</span></span>
                        )}
                      </div>
                    )}
                    {feed.profile.allergies.length > 0 && (
                      <div className="flex items-center gap-1.5 text-yellow-500">
                        <AlertTriangle className="w-3 h-3" />
                        {feed.profile.allergies.join(", ")}
                      </div>
                    )}
                    {feed.profile.medications.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Pill className="w-3 h-3" />
                        {feed.profile.medications.length} medication{feed.profile.medications.length !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                )}

                {/* Emergency details */}
                {feed.hasEmergency && feed.emergencyDetails && (
                  <div className="mt-3 p-3 bg-red-950/30 border border-red-800/50 rounded-xl">
                    <div className="flex items-center gap-1.5 text-red-400 text-xs font-bold mb-1">
                      <AlertTriangle className="w-3 h-3" />
                      {feed.emergencyDetails.type} - {feed.emergencyDetails.severity}
                    </div>
                    <p className="text-xs text-red-300/80">{feed.emergencyDetails.description}</p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
