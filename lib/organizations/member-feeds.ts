export interface OrgMemberProfile {
  name: string;
  age: number;
  bloodType: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
}

export interface OrgMemberSnapshot {
  userId: string;
  role: string;
  cameraEnabled: boolean;
  profile: OrgMemberProfile | null;
}

export interface MemberFeed {
  userId: string;
  userName: string;
  lastFrame: string;
  lastSeen: number;
  isOnline: boolean;
  cameraEnabled: boolean;
  hasEmergency: boolean;
  emergencyDetails?: { type: string; severity: string; description: string };
  profile?: OrgMemberProfile;
}

interface CameraFramePayload {
  userId: string;
  userName: string;
  frame: string;
  ts: number;
}

interface EmergencyPayload {
  userId: string;
  userName: string;
  incident: { type: string; severity: string; description: string };
}

export function buildMemberFeeds(
  members: OrgMemberSnapshot[],
  previous: Record<string, MemberFeed> = {},
): Record<string, MemberFeed> {
  return members.reduce<Record<string, MemberFeed>>((feeds, member) => {
    const existing = previous[member.userId];
    const cameraEnabled = member.cameraEnabled;

    feeds[member.userId] = {
      userId: member.userId,
      userName: member.profile?.name || existing?.userName || "Unknown",
      lastFrame: cameraEnabled ? existing?.lastFrame || "" : "",
      lastSeen: cameraEnabled ? existing?.lastSeen || 0 : 0,
      isOnline: cameraEnabled ? existing?.isOnline || false : false,
      cameraEnabled,
      hasEmergency: existing?.hasEmergency || false,
      emergencyDetails: existing?.emergencyDetails,
      profile: member.profile || undefined,
    };

    return feeds;
  }, {});
}

export function applyCameraFrame(
  feeds: Record<string, MemberFeed>,
  payload: CameraFramePayload,
): Record<string, MemberFeed> {
  const existing = feeds[payload.userId];

  return {
    ...feeds,
    [payload.userId]: {
      userId: payload.userId,
      userName: payload.userName || existing?.userName || "Unknown",
      lastFrame: payload.frame,
      lastSeen: payload.ts,
      isOnline: true,
      cameraEnabled: existing?.cameraEnabled ?? true,
      hasEmergency: existing?.hasEmergency || false,
      emergencyDetails: existing?.emergencyDetails,
      profile: existing?.profile,
    },
  };
}

export function applyEmergencyAlert(
  feeds: Record<string, MemberFeed>,
  payload: EmergencyPayload,
): Record<string, MemberFeed> {
  const existing = feeds[payload.userId];

  return {
    ...feeds,
    [payload.userId]: {
      userId: payload.userId,
      userName: payload.userName || existing?.userName || "Unknown",
      lastFrame: existing?.lastFrame || "",
      lastSeen: existing?.lastSeen || 0,
      isOnline: existing?.isOnline || false,
      cameraEnabled: existing?.cameraEnabled ?? true,
      hasEmergency: true,
      emergencyDetails: payload.incident,
      profile: existing?.profile,
    },
  };
}

export function applyOfflineTimeout(
  feeds: Record<string, MemberFeed>,
  now: number,
  offlineAfterMs = 5000,
): Record<string, MemberFeed> {
  return Object.fromEntries(
    Object.entries(feeds).map(([userId, feed]) => [
      userId,
      {
        ...feed,
        isOnline:
          feed.cameraEnabled && feed.lastSeen > 0
            ? now - feed.lastSeen < offlineAfterMs
            : false,
      },
    ]),
  );
}
