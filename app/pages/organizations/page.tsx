"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Users,
  Plus,
  Copy,
  Check,
  LogOut,
  Video,
  VideoOff,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CAMERA_SHARING_STORAGE_KEY, ORGS_CHANGED_EVENT } from "@/lib/supabase/events";
import { getUserOrgs, getOrgMemberCount } from "@/lib/supabase/data";
import {
  broadcastCameraSharingChangeToOrg,
  broadcastOrgMembershipChangeToOrg,
} from "@/lib/supabase/realtime";
import { createOrganization, joinOrganization, leaveOrganization, toggleCameraSharing } from "./actions";

interface OrgInfo {
  orgId: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  role: string;
  cameraEnabled: boolean;
  memberCount?: number;
}

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<OrgInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [createName, setCreateName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadOrgs = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const userOrgs = await getUserOrgs(supabase, user.id);
    const withCounts = await Promise.all(
      userOrgs.map(async (org) => ({
        ...org,
        memberCount: await getOrgMemberCount(supabase, org.orgId),
      }))
    );
    setOrgs(withCounts);
    setLoading(false);
  };

  useEffect(() => { loadOrgs(); }, []);

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const created = await createOrganization(createName.trim());
      setCreateName("");
      await loadOrgs();
      window.dispatchEvent(new Event(ORGS_CHANGED_EVENT));

      if (user) {
        broadcastOrgMembershipChangeToOrg(supabase, created.orgId, user.id, "created").catch((broadcastError) => {
          console.error("Failed to broadcast org creation:", broadcastError);
        });
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const joined = await joinOrganization(joinCode.trim());
      setJoinCode("");
      await loadOrgs();
      window.dispatchEvent(new Event(ORGS_CHANGED_EVENT));

      if (user) {
        broadcastOrgMembershipChangeToOrg(supabase, joined.orgId, user.id, "joined").catch((broadcastError) => {
          console.error("Failed to broadcast org join:", broadcastError);
        });
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async (orgId: string) => {
    if (!confirm("Leave this organization?")) return;
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await leaveOrganization(orgId);
      await loadOrgs();
      window.dispatchEvent(new Event(ORGS_CHANGED_EVENT));

      if (user) {
        broadcastOrgMembershipChangeToOrg(supabase, orgId, user.id, "left").catch((broadcastError) => {
          console.error("Failed to broadcast org leave:", broadcastError);
        });
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleToggleCamera = async (orgId: string, current: boolean) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      await toggleCameraSharing(orgId, !current);
      setOrgs((prev) =>
        prev.map((o) => (o.orgId === orgId ? { ...o, cameraEnabled: !current } : o))
      );

      if (user) {
        const payload = JSON.stringify({
          orgId,
          userId: user.id,
          enabled: !current,
          ts: Date.now(),
        });
        localStorage.setItem(CAMERA_SHARING_STORAGE_KEY, payload);
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: CAMERA_SHARING_STORAGE_KEY,
            newValue: payload,
          }),
        );

        broadcastCameraSharingChangeToOrg(supabase, orgId, user.id, !current).catch((broadcastError) => {
          console.error("Failed to broadcast camera sharing change:", broadcastError);
        });
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Organizations</h1>
        <p className="text-zinc-500 text-sm">Share camera feeds and receive emergency alerts together</p>
      </div>

      {error && (
        <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Create / Join */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111] border border-[#1F1F1F] rounded-2xl p-5">
          <h2 className="font-semibold text-white text-sm mb-3">Create Organization</h2>
          <div className="flex gap-2">
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Organization name"
              className="flex-1 bg-transparent border-b border-[#2A2A2A] px-1 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-red-600/50 transition-colors"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !createName.trim()}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create
            </button>
          </div>
        </div>

        <div className="bg-[#111] border border-[#1F1F1F] rounded-2xl p-5">
          <h2 className="font-semibold text-white text-sm mb-3">Join Organization</h2>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="6-character invite code"
              maxLength={6}
              className="flex-1 bg-transparent border-b border-[#2A2A2A] px-1 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-red-600/50 font-mono tracking-widest uppercase transition-colors"
            />
            <button
              onClick={handleJoin}
              disabled={joining || joinCode.length < 6}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
            >
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              Join
            </button>
          </div>
        </div>
      </div>

      {/* Org List */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 text-zinc-600 animate-spin mx-auto mb-3" />
          <p className="text-zinc-600 text-sm">Loading organizations...</p>
        </div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-14 h-14 text-zinc-800 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-zinc-500">No organizations yet</h2>
          <p className="text-zinc-600 text-sm mt-1">Create one or join with an invite code</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orgs.map((org, i) => (
            <motion.div
              key={org.orgId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-[#111] border border-[#1F1F1F] rounded-2xl p-5 hover:border-[#2A2A2A] transition-colors top-stripe overflow-hidden"
            >
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-red-600/10">
                  <Users className="w-5 h-5 text-red-500" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{org.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-medium">
                      {org.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-zinc-500">{org.memberCount} member{org.memberCount !== 1 ? "s" : ""}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-zinc-600">Code:</span>
                      <span className="text-xs font-mono text-red-400 tracking-wider">{org.inviteCode}</span>
                      <button onClick={() => copyCode(org.inviteCode)} className="p-0.5 hover:text-white text-zinc-600 transition-colors">
                        {copiedCode === org.inviteCode ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Camera toggle */}
                  <button
                    onClick={() => handleToggleCamera(org.orgId, org.cameraEnabled)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${org.cameraEnabled
                        ? "bg-green-950/20 border border-green-800/40 text-green-400"
                        : "bg-zinc-800 border border-zinc-700 text-zinc-500"
                      }`}
                  >
                    {org.cameraEnabled ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
                    {org.cameraEnabled ? "Sharing" : "Off"}
                  </button>

                  {/* View grid */}
                  <Link
                    href={`/pages/organizations/${org.orgId}`}
                    className="flex items-center gap-1.5 px-3 py-2 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 text-xs font-medium hover:bg-red-950/30 transition-colors"
                  >
                    View <ChevronRight className="w-3 h-3" />
                  </Link>

                  {/* Leave */}
                  <button
                    onClick={() => handleLeave(org.orgId)}
                    className="p-2 rounded-xl hover:bg-red-950/20 text-zinc-600 hover:text-red-400 transition-colors"
                    title="Leave organization"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
