import test from "node:test";
import assert from "node:assert/strict";
import {
  applyCameraFrame,
  applyEmergencyAlert,
  applyOfflineTimeout,
  buildMemberFeeds,
} from "../lib/organizations/member-feeds";

test("buildMemberFeeds clears stale video state when camera sharing is disabled", () => {
  const feeds = buildMemberFeeds(
    [
      {
        userId: "user-1",
        role: "member",
        cameraEnabled: false,
        profile: {
          name: "Ava",
          age: 74,
          bloodType: "O+",
          allergies: [],
          conditions: [],
          medications: [],
        },
      },
    ],
    {
      "user-1": {
        userId: "user-1",
        userName: "Ava",
        lastFrame: "data:image/jpeg;base64,old",
        lastSeen: 123,
        isOnline: true,
        cameraEnabled: true,
        hasEmergency: false,
      },
    },
  );

  assert.equal(feeds["user-1"].cameraEnabled, false);
  assert.equal(feeds["user-1"].lastFrame, "");
  assert.equal(feeds["user-1"].isOnline, false);
});

test("applyCameraFrame updates feed liveness and preserves profile data", () => {
  const feeds = applyCameraFrame(
    {
      "user-1": {
        userId: "user-1",
        userName: "Ava",
        lastFrame: "",
        lastSeen: 0,
        isOnline: false,
        cameraEnabled: true,
        hasEmergency: false,
        profile: {
          name: "Ava",
          age: 74,
          bloodType: "O+",
          allergies: [],
          conditions: [],
          medications: [],
        },
      },
    },
    {
      userId: "user-1",
      userName: "Ava",
      frame: "data:image/jpeg;base64,new",
      ts: 5000,
    },
  );

  assert.equal(feeds["user-1"].lastFrame, "data:image/jpeg;base64,new");
  assert.equal(feeds["user-1"].isOnline, true);
  assert.equal(feeds["user-1"].profile?.bloodType, "O+");
});

test("applyEmergencyAlert marks the matching feed without dropping existing state", () => {
  const feeds = applyEmergencyAlert(
    {
      "user-1": {
        userId: "user-1",
        userName: "Ava",
        lastFrame: "frame",
        lastSeen: 1000,
        isOnline: true,
        cameraEnabled: true,
        hasEmergency: false,
      },
    },
    {
      userId: "user-1",
      userName: "Ava",
      incident: {
        type: "FALL",
        severity: "HIGH",
        description: "Detected a fall",
      },
    },
  );

  assert.equal(feeds["user-1"].hasEmergency, true);
  assert.equal(feeds["user-1"].lastFrame, "frame");
  assert.equal(feeds["user-1"].emergencyDetails?.type, "FALL");
});

test("applyOfflineTimeout marks enabled feeds offline after the timeout", () => {
  const feeds = applyOfflineTimeout(
    {
      "user-1": {
        userId: "user-1",
        userName: "Ava",
        lastFrame: "frame",
        lastSeen: 1000,
        isOnline: true,
        cameraEnabled: true,
        hasEmergency: false,
      },
      "user-2": {
        userId: "user-2",
        userName: "Ben",
        lastFrame: "",
        lastSeen: 0,
        isOnline: false,
        cameraEnabled: false,
        hasEmergency: false,
      },
    },
    8000,
  );

  assert.equal(feeds["user-1"].isOnline, false);
  assert.equal(feeds["user-2"].isOnline, false);
});
