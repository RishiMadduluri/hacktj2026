import { NextResponse } from "next/server";

let twilioClient: any = null;
try {
    if (
        process.env.TWILIO_API_KEY_SID &&
        process.env.TWILIO_API_KEY_SECRET &&
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_PHONE_NUMBER
    ) {
        const twilio = require("twilio");
        twilioClient = twilio(
            process.env.TWILIO_API_KEY_SID,
            process.env.TWILIO_API_KEY_SECRET,
            { accountSid: process.env.TWILIO_ACCOUNT_SID }
        );
    }
} catch {
    console.warn("Twilio not available — Call notifications disabled");
}

interface ContactInput {
    name: string;
    phone: string;
    email: string;
    relationship: string;
    priority: number;
    notifyCall?: boolean;
}

interface IncidentInput {
    type: string;
    severity: string;
    description: string;
    timestamp: string;
    transcript?: string;
}


interface ProfileInput {
    name: string;
    age: number;
    bloodType: string;
    allergies: string[];
    conditions: string[];
    medications: string[];
    height: string;
    weight: string;
}

interface LocationInput {
    lat: number;
    lng: number;
    address?: string;
}

function buildLocationText(location?: LocationInput): string {
    if (!location) return "";
    const mapLink = `https://maps.google.com/?q=${location.lat},${location.lng}`;
    if (location.address) {
        return `Location: ${location.address}\nCoordinates: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}\nMap: ${mapLink}`;
    }
    return `Location: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}\nMap: ${mapLink}`;
}

function buildCallTwiML(
    incident: IncidentInput,
    profile: ProfileInput,
    contactName: string,
    contactRelationship: string,
    location?: LocationInput
): string {
    const allergiesText = profile.allergies.length > 0
        ? ` Known allergies include ${profile.allergies.join(" and ")}.`
        : " No known allergies.";
    const locationSay = location
        ? ` Their current location is ${location.address || `latitude ${location.lat.toFixed(4)}, longitude ${location.lng.toFixed(4)}`}. I repeat, ${location.address || `latitude ${location.lat.toFixed(4)}, longitude ${location.lng.toFixed(4)}`}.`
        : " Location is currently unavailable.";
    const conditionsText = profile.conditions && profile.conditions.length > 0
        ? ` They have the following medical conditions: ${profile.conditions.join(", ")}.`
        : "";
    const medsText = profile.medications && profile.medications.length > 0
        ? ` Current medications: ${profile.medications.join(", ")}.`
        : "";

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-US">
    Hello ${contactName}. This is an urgent emergency call from First Watch Medical Monitoring. Your ${contactRelationship}, ${profile.name}, may need immediate help. Our system has detected a ${incident.severity} severity ${incident.type.toLowerCase()} event. Here is what happened: ${incident.description}. Patient details: ${profile.name}, age ${profile.age}, blood type ${profile.bloodType}.${allergiesText}${conditionsText}${medsText}${locationSay} Please try to reach ${profile.name} immediately or call 9 1 1 if you cannot. This message will now repeat.
  </Say>
  <Pause length="2"/>
  <Say voice="alice" language="en-US">
    Repeating: ${contactName}, this is First Watch. ${profile.name} has experienced a ${incident.severity} severity ${incident.type.toLowerCase()} event.${locationSay} Please respond immediately.
  </Say>
</Response>`;
}

function buildEMSCallTwiML(
    incident: IncidentInput,
    profile: ProfileInput,
    location?: LocationInput
): string {
    const allergiesText = profile.allergies.length > 0
        ? ` Patient has allergies to ${profile.allergies.join(" and ")}.`
        : " No known drug allergies.";
    const conditionsText = profile.conditions.length > 0
        ? ` Pre-existing conditions: ${profile.conditions.join(", ")}.`
        : " No known pre-existing conditions.";
    const medsText = profile.medications.length > 0
        ? ` Current medications: ${profile.medications.join(", ")}.`
        : "";
    const locationSay = location
        ? ` The patient is located at ${location.address || `latitude ${location.lat.toFixed(4)}, longitude ${location.lng.toFixed(4)}`}. Repeating the address: ${location.address || `latitude ${location.lat.toFixed(4)}, longitude ${location.lng.toFixed(4)}`}.`
        : " Patient location is currently unavailable.";

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-US">
    Dispatcher, this is an automated emergency call from First Watch Medical Monitoring System. We are requesting immediate medical assistance. Incident report: a ${incident.severity} severity ${incident.type.toLowerCase()} has been detected by our A.I. monitoring system. Incident details: ${incident.description || `A ${incident.type.toLowerCase()} event was detected.`} Patient information: name, ${profile.name}. Age, ${profile.age}. Blood type, ${profile.bloodType}. ${profile.height ? `Height, ${profile.height}.` : ""} ${profile.weight ? `Weight, ${profile.weight}.` : ""}${allergiesText}${conditionsText}${medsText}${locationSay} Emergency contacts have been notified. Please dispatch emergency medical services to the patient's location immediately. This message will now repeat.
  </Say>
  <Pause length="2"/>
  <Say voice="alice" language="en-US">
    Repeating: Dispatcher, this is First Watch requesting E.M.S. dispatch. ${incident.severity} severity ${incident.type.toLowerCase()} detected. Patient: ${profile.name}, age ${profile.age}.${locationSay} Please dispatch immediately.
  </Say>
</Response>`;
}

export async function POST(request: Request) {
    try {
        const { incident, contacts, profile, isTest, callEMS, location } = await request.json();

        if ((!contacts || contacts.length === 0) && !callEMS) {
            return NextResponse.json(
                { error: "No emergency contacts configured" },
                { status: 400 }
            );
        }

        const results: {
            contactName: string;
            callMade: boolean;
            callError?: string;
        }[] = [];

        const sorted = [...(contacts || [])].sort(
            (a: ContactInput, b: ContactInput) =>
                (a.priority || 0) - (b.priority || 0)
        );

        // Notify all emergency contacts
        for (const contact of sorted) {
            const result: (typeof results)[0] = {
                contactName: contact.name,
                callMade: false,
            };

            if (contact.phone && twilioClient) {
                let phoneNumber = contact.phone.replace(/\D/g, "");
                if (!phoneNumber.startsWith("+")) {
                    phoneNumber = phoneNumber.startsWith("1")
                        ? `+${phoneNumber}`
                        : `+1${phoneNumber}`;
                }

                // Make emergency call for HIGH/CRITICAL (respect per-contact preference, skip for test)
                if (contact.notifyCall !== false && !isTest && (incident.severity === "CRITICAL" || incident.severity === "HIGH")) {
                    const twiml = buildCallTwiML(incident, profile, contact.name, contact.relationship || "contact", location);
                    try {
                        await twilioClient.calls.create({
                            twiml: twiml,
                            from: process.env.TWILIO_PHONE_NUMBER,
                            to: phoneNumber,
                        });
                        result.callMade = true;
                    } catch (err: any) {
                        result.callError = err.message || "Call failed";
                        console.error(`[FirstWatch] Call error to ${contact.name}:`, err.message);
                    }
                }

                // Test call (respect per-contact call preference)
                if (contact.notifyCall !== false && isTest) {
                    try {
                        await twilioClient.calls.create({
                            twiml: `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-US">
    This is a test call from First Watch A.I. Medical Guardian. Your emergency alert system is working correctly. Thank you.
  </Say>
</Response>`,
                            from: process.env.TWILIO_PHONE_NUMBER,
                            to: phoneNumber,
                        });
                        result.callMade = true;
                    } catch (err: any) {
                        result.callError = err.message || "Test call failed";
                        console.error(`[FirstWatch] Test call error to ${contact.name}:`, err.message);
                    }
                }
            } else if (contact.phone && !twilioClient) {
                result.callError = "Twilio not configured";
            }

            results.push(result);
        }

        // Call EMS if requested and not a test
        if (callEMS && !isTest && twilioClient) {
            const emsPhone = process.env.EMS_PHONE_NUMBER;
            const emsResult: (typeof results)[0] = {
                contactName: "EMS (911)",
                callMade: false,
            };

            if (emsPhone) {
                let phoneNumber = emsPhone.replace(/\D/g, "");
                if (!phoneNumber.startsWith("+")) {
                    phoneNumber = phoneNumber.startsWith("1")
                        ? `+${phoneNumber}`
                        : `+1${phoneNumber}`;
                }

                const emsTwiml = buildEMSCallTwiML(incident, profile, location);
                try {
                    await twilioClient.calls.create({
                        twiml: emsTwiml,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        to: phoneNumber,
                    });
                    emsResult.callMade = true;
                } catch (err: any) {
                    emsResult.callError = err.message || "EMS call failed";
                    console.error("[FirstWatch] EMS call error:", err.message);
                }
            } else {
                emsResult.callError = "EMS_PHONE_NUMBER not configured in environment";
                console.warn("[FirstWatch] EMS_PHONE_NUMBER not set in environment variables");
            }

            results.push(emsResult);
        }

        console.log(
            `[FirstWatch] Notifications sent for ${incident.type} (${incident.severity}):`,
            results
        );

        return NextResponse.json({
            success: true,
            results,
            twilioEnabled: !!twilioClient,
        });
    } catch (error: any) {
        console.error("[FirstWatch] Notify error:", error);
        return NextResponse.json(
            { error: error.message || "Notification failed" },
            { status: 500 }
        );
    }
}
