import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPasswordResetRedirectUrl,
  getAppOrigin,
} from "../lib/auth/reset-url";

test("getAppOrigin prefers explicit site URL and trims trailing slash", () => {
  const origin = getAppOrigin({
    NEXT_PUBLIC_SITE_URL: "https://firstwatch.example.com/",
    VERCEL_URL: "ignored.vercel.app",
  });

  assert.equal(origin, "https://firstwatch.example.com");
});

test("getAppOrigin falls back to Vercel URL when no site URL is configured", () => {
  const origin = getAppOrigin({
    VERCEL_URL: "firstwatch-preview.vercel.app",
  });

  assert.equal(origin, "https://firstwatch-preview.vercel.app");
});

test("buildPasswordResetRedirectUrl appends the reset path", () => {
  const url = buildPasswordResetRedirectUrl({
    SITE_URL: "https://firstwatch.example.com",
  });

  assert.equal(url, "https://firstwatch.example.com/protected/reset-password");
});
