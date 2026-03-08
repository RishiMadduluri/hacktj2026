import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

export function getOrgChannel(supabase: SupabaseClient, orgId: string): RealtimeChannel {
  return supabase.channel(`org-${orgId}`);
}

export function broadcastFrame(
  channel: RealtimeChannel,
  userId: string,
  userName: string,
  frameDataUrl: string
) {
  channel.send({
    type: "broadcast",
    event: "camera-frame",
    payload: { userId, userName, frame: frameDataUrl, ts: Date.now() },
  });
}

export function broadcastEmergency(
  channel: RealtimeChannel,
  userId: string,
  userName: string,
  incident: { type: string; severity: string; description: string; timestamp: string }
) {
  channel.send({
    type: "broadcast",
    event: "emergency-alert",
    payload: { userId, userName, incident, ts: Date.now() },
  });
}

export function broadcastCameraSharingChange(
  channel: RealtimeChannel,
  userId: string,
  enabled: boolean,
) {
  return channel.send({
    type: "broadcast",
    event: "camera-sharing-changed",
    payload: { userId, enabled, ts: Date.now() },
  });
}

export function broadcastOrgMembershipChange(
  channel: RealtimeChannel,
  userId: string,
  action: "joined" | "left" | "created",
) {
  return channel.send({
    type: "broadcast",
    event: "org-membership-changed",
    payload: { userId, action, ts: Date.now() },
  });
}

async function subscribeChannel(channel: RealtimeChannel) {
  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      resolve(false);
    }, 8000);

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timeout);
        resolve(true);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        clearTimeout(timeout);
        resolve(false);
      }
    });
  });
}

export async function broadcastCameraSharingChangeToOrg(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  enabled: boolean,
) {
  const channel = getOrgChannel(supabase, orgId);

  try {
    const subscribed = await subscribeChannel(channel);
    if (!subscribed) {
      return;
    }
    await broadcastCameraSharingChange(channel, userId, enabled);
  } finally {
    supabase.removeChannel(channel);
  }
}

export async function broadcastOrgMembershipChangeToOrg(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  action: "joined" | "left" | "created",
) {
  const channel = getOrgChannel(supabase, orgId);

  try {
    const subscribed = await subscribeChannel(channel);
    if (!subscribed) {
      return;
    }
    await broadcastOrgMembershipChange(channel, userId, action);
  } finally {
    supabase.removeChannel(channel);
  }
}
