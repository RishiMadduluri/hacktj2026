import test from "node:test";
import assert from "node:assert/strict";

import { initializeTfBackend } from "../lib/ml/backend";

test("initializeTfBackend prefers webgl when available", async () => {
  const attempts: string[] = [];

  const backend = await initializeTfBackend({
    async ready() {},
    async setBackend(candidate) {
      attempts.push(candidate);
      return candidate === "webgl";
    },
  });

  assert.equal(backend, "webgl");
  assert.deepEqual(attempts, ["webgl"]);
});

test("initializeTfBackend falls back to cpu when webgl fails", async () => {
  const attempts: string[] = [];

  const backend = await initializeTfBackend({
    async ready() {},
    async setBackend(candidate) {
      attempts.push(candidate);
      if (candidate === "webgl") {
        throw new Error("backend unavailable");
      }
      return true;
    },
  });

  assert.equal(backend, "cpu");
  assert.deepEqual(attempts, ["webgl", "cpu"]);
});

test("initializeTfBackend throws when no backend can be initialized", async () => {
  await assert.rejects(
    initializeTfBackend({
      async ready() {},
      async setBackend() {
        return false;
      },
    }),
    /No supported TensorFlow backend is available/,
  );
});
