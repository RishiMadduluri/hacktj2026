/*
 * FirstWatch — static seed data used for demos & development.
 * All data is medical-monitoring oriented (fall detection, stroke, cardiac, etc.).
 */

import type { Incident, MonitorZone, BoundingBoxPayload } from "@/types";

/* ------------------------------------------------------------------ */
/*  Monitoring zones & feeds                                          */
/* ------------------------------------------------------------------ */

export const monitorZones: MonitorZone[] = [
	{
		id: "living-area",
		name: "Living Area",
		feeds: [
			{
				id: "living-feed-1",
				label: "FallDetect_LivingRoom",
				zone: "Living Area",
				address: "Sunrise Senior Living, 120 Oak St, Apt 3B",
				thumbnail: "/placeholder.svg?height=480&width=640",
				streamUrl: "/videos/FallDetect0.mp4",
			},
			{
				id: "living-feed-2",
				label: "FallDetect_Hallway",
				zone: "Living Area",
				address: "Golden Years Residence, 88 Maple Dr, Unit 7",
				thumbnail: "/placeholder.svg?height=480&width=640",
				streamUrl: "/videos/FallDetect1.mp4",
			},
		],
	},
	{
		id: "bedroom",
		name: "Bedroom",
		feeds: [
			{
				id: "bed-feed-1",
				label: "NightMonitor_Master",
				zone: "Bedroom",
				address: "Harbor View Assisted Living, 42 Shore Rd, Room 12",
				thumbnail: "/placeholder.svg?height=480&width=640",
				streamUrl: "/videos/NightMonitor0.mp4",
			},
		],
	},
	{
		id: "kitchen",
		name: "Kitchen",
		feeds: [
			{
				id: "kitchen-feed-1",
				label: "KitchenSafety_Main",
				zone: "Kitchen",
				address: "Evergreen Home Care, 555 Pine Ave, Suite 2A",
				thumbnail: "/placeholder.svg?height=480&width=640",
				streamUrl: "/videos/KitchenSafety0.mp4",
			},
		],
	},
	{
		id: "bathroom",
		name: "Bathroom",
		feeds: [
			{
				id: "bath-feed-1",
				label: "SlipDetect_Bath",
				zone: "Bathroom",
				address: "Comfort Care Home, 300 Elm Blvd, Apt 5C",
				thumbnail: "/placeholder.svg?height=480&width=640",
				streamUrl: "/videos/SlipDetect0.mp4",
			},
		],
	},
];

/* ------------------------------------------------------------------ */
/*  Pre-analysed medical events (demo timeline entries)               */
/* ------------------------------------------------------------------ */

export const analysedMedicalEvents = [
	{
		feedId: "FallDetect_LivingRoom",
		timeline: [
			{ time: "00:05", event: "Resident stands unsteadily from couch" },
			{ time: "00:18", event: "Sudden loss of balance detected" },
			{ time: "00:20", event: "Fall confirmed — resident on floor" },
		],
		incidentType: ["Fall", "Immobility"],
		zone: "Living Area",
	},
	{
		feedId: "FallDetect_Hallway",
		timeline: [
			{ time: "00:12", event: "Abnormal gait pattern observed" },
			{ time: "00:30", event: "Resident grips wall for support" },
		],
		incidentType: ["Mobility Issue"],
		zone: "Living Area",
	},
	{
		feedId: "NightMonitor_Master",
		timeline: [
			{ time: "02:15", event: "Restless movement detected in bed" },
			{ time: "02:40", event: "Resident unresponsive to verbal check-in" },
		],
		incidentType: ["Unresponsive", "Cardiac Concern"],
		zone: "Bedroom",
	},
	{
		feedId: "KitchenSafety_Main",
		timeline: [
			{ time: "00:45", event: "Resident appears disoriented near stove" },
			{ time: "01:10", event: "Facial asymmetry detected — potential stroke sign" },
		],
		incidentType: ["Stroke Indicator", "Disorientation"],
		zone: "Kitchen",
	},
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeStringToSeconds(ts: string): number {
	const parts = ts.split(":").map(Number);
	return parts[0] * 60 + parts[1];
}

/** Flatten analysed events into `Incident[]` for components that need them. */
function buildIncidentList(): Incident[] {
	return analysedMedicalEvents.flatMap((entry, _entryIdx) => {
		const feed = monitorZones
			.flatMap((z) => z.feeds)
			.find((f) => f.label === entry.feedId);

		if (!feed) return [];

		return entry.timeline.map((step, idx) => ({
			id: `${entry.feedId}-${idx}`,
			category: entry.incidentType[0],
			summary: step.event,
			occurredAt: new Date(timeStringToSeconds(step.time) * 1000),
			feed,
			thumbnail: feed.thumbnail,
		}));
	});
}

export const incidents = buildIncidentList();

/* ------------------------------------------------------------------ */
/*  System stats (used by dashboard widgets)                          */
/* ------------------------------------------------------------------ */

export interface SystemOverview {
	totalFeeds: number;
	activeFeeds: number;
}

export function getSystemOverview(): SystemOverview {
	const allFeeds = monitorZones.flatMap((z) => z.feeds);
	return {
		totalFeeds: allFeeds.length,
		activeFeeds: allFeeds.length, // all feeds considered active in dev
	};
}

/* ------------------------------------------------------------------ */
/*  Bounding-box loader                                               */
/* ------------------------------------------------------------------ */

export async function loadBoundingBoxes(
	feedLabel: string,
): Promise<BoundingBoxPayload | null> {
	try {
		const resp = await fetch(`/bounding_boxes/${feedLabel}_boxes.json`);
		if (!resp.ok) {
			console.error(`[loadBoundingBoxes] failed for feed "${feedLabel}"`);
			return null;
		}
		return (await resp.json()) as BoundingBoxPayload;
	} catch (err) {
		console.error(`[loadBoundingBoxes] error loading "${feedLabel}":`, err);
		return null;
	}
}
