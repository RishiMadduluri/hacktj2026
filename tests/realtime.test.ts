import test from "node:test";
import assert from "node:assert/strict";
import {
  broadcastCameraSharingChangeToOrg,
  broadcastOrgMembershipChangeToOrg,
} from "../lib/supabase/realtime";

type SubscribeStatus = "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED";

class MockRealtimeChannel {
  sendCalls: unknown[] = [];

  constructor(private readonly statuses: SubscribeStatus[] = []) {}

  subscribe(callback: (status: SubscribeStatus) => void) {
    queueMicrotask(() => {
      for (const status of this.statuses) {
        callback(status);
      }
    });

    return this;
  }

  async send(payload: unknown) {
    this.sendCalls.push(payload);
    return "ok";
  }
}

class MockSupabaseClient {
  channelNames: string[] = [];
  removedChannels: unknown[] = [];

  constructor(private readonly mockChannel: MockRealtimeChannel) {}

  channel(name: string) {
    this.channelNames.push(name);
    return this.mockChannel;
  }

  async removeChannel(channel: unknown) {
    this.removedChannels.push(channel);
    return "ok";
  }
}

test("broadcastCameraSharingChangeToOrg sends after the org channel subscribes", async () => {
  const channel = new MockRealtimeChannel(["SUBSCRIBED"]);
  const supabase = new MockSupabaseClient(channel);

  await broadcastCameraSharingChangeToOrg(supabase as never, "org-123", "user-1", true);

  assert.deepEqual(supabase.channelNames, ["org-org-123"]);
  assert.equal(channel.sendCalls.length, 1);
  assert.deepEqual(channel.sendCalls[0], {
    type: "broadcast",
    event: "camera-sharing-changed",
    payload: {
      userId: "user-1",
      enabled: true,
      ts: (channel.sendCalls[0] as { payload: { ts: number } }).payload.ts,
    },
  });
  assert.deepEqual(supabase.removedChannels, [channel]);
});

test("broadcastOrgMembershipChangeToOrg skips send when the org channel never subscribes", async () => {
  const originalSetTimeout = global.setTimeout;
  const originalClearTimeout = global.clearTimeout;

  global.setTimeout = ((callback: (...args: unknown[]) => void) => {
    callback();
    return 0 as never;
  }) as unknown as typeof setTimeout;
  global.clearTimeout = (() => {}) as unknown as typeof clearTimeout;

  try {
    const channel = new MockRealtimeChannel();
    const supabase = new MockSupabaseClient(channel);

    await assert.doesNotReject(() =>
      broadcastOrgMembershipChangeToOrg(supabase as never, "org-456", "user-2", "joined"),
    );

    assert.equal(channel.sendCalls.length, 0);
    assert.deepEqual(supabase.removedChannels, [channel]);
  } finally {
    global.setTimeout = originalSetTimeout;
    global.clearTimeout = originalClearTimeout;
  }
});
