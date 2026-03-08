import test from "node:test";
import assert from "node:assert/strict";
import type { Incident } from "../types/medical";
import {
  applyIncidentAudioUpdate,
  replaceIncidentId,
} from "../lib/incidents/local-cache";

function makeIncident(overrides: Partial<Incident> = {}): Incident {
  return {
    id: "temp-1",
    type: "FALL",
    severity: "HIGH",
    description: "Detected a fall",
    timestamp: "2026-03-07T12:00:00.000Z",
    ...overrides,
  };
}

test("replaceIncidentId swaps only the matching incident id", () => {
  const incidents = [
    makeIncident(),
    makeIncident({ id: "temp-2", type: "DISTRESS" }),
  ];

  const updated = replaceIncidentId(incidents, "temp-1", "db-1");

  assert.deepEqual(updated.map((incident) => incident.id), ["db-1", "temp-2"]);
});

test("applyIncidentAudioUpdate attaches audio metadata to the matching incident", () => {
  const incidents = [makeIncident()];

  const updated = applyIncidentAudioUpdate(
    incidents,
    "temp-1",
    "blob:audio-url",
    42,
  );

  assert.equal(updated[0].audioUrl, "blob:audio-url");
  assert.equal(updated[0].duration, 42);
});
