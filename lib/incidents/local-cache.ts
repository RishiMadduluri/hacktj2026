import type { Incident } from "@/types/medical";

export function replaceIncidentId(
  incidents: Incident[],
  currentId: string,
  nextId: string,
): Incident[] {
  if (currentId === nextId) {
    return incidents;
  }

  return incidents.map((incident) =>
    incident.id === currentId ? { ...incident, id: nextId } : incident,
  );
}

export function applyIncidentAudioUpdate(
  incidents: Incident[],
  incidentId: string,
  audioUrl: string,
  duration: number,
): Incident[] {
  return incidents.map((incident) =>
    incident.id === incidentId
      ? { ...incident, audioUrl, duration }
      : incident,
  );
}
