import { NextResponse } from "next/server";

let twilioClient: any = null;
try {
    if (
        process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_ACCOUNT_AUTH_TOKEN &&
        process.env.TWILIO_PHONE_NUMBER
    ) {
        const twilio = require("twilio");
        twilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_ACCOUNT_AUTH_TOKEN
        );
    }
} catch {
    console.warn("Twilio not available — SMS/Call notifications disabled");
}

interface ContactInput {
    name: string;
    phone: string;
    email: string;
    relationship: string;
    priority: number;
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

function buildSMSBody(
    incident: IncidentInput,
    profile: ProfileInput
): string {
    let msg = `🚨 FIRSTWATCH EMERGENCY ALERT\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `${incident.severity} ${incident.type} DETECTED\n\n`;
    msg += `${incident.description}\n\n`;
    msg += `PATIENT DETAILS:\n`;
    msg += `Name: ${profile.name}\n`;
    msg += `Age: ${profile.age} years old\n`;
    msg += `Blood Type: ${profile.bloodType}\n`;
    if (profile.height) msg += `Height: ${profile.height}\n`;
    if (profile.weight) msg += `Weight: ${profile.weight}\n`;
    if (profile.allergies.length > 0)
        msg += `⚠️ ALLERGIES: ${profile.allergies.join(", ")}\n`;
    if (profile.conditions.length > 0)
        msg += `Conditions: ${profile.conditions.join(", ")}\n`;
    if (profile.medications.length > 0)
        msg += `Medications: ${profile.medications.join(", ")}\n`;
    if (incident.transcript)
        msg += `\nAudio transcript: "${incident.transcript}"\n`;
    msg += `\nDetected: ${new Date(incident.timestamp).toLocaleString()}`;
    msg += `\n━━━━━━━━━━━━━━━━━━━━━━`;
    msg += `\nPlease check on the patient immediately.`;
    return msg;
}

function buildCallTwiML(
    incident: IncidentInput,
    profile: ProfileInput
): string {
    const allergiesText = profile.allergies.length > 0
        ? `Important warning: The patient has known allergies to ${profile.allergies.join(" and ")}. Please ensure medical responders are aware.`
        : "";
    const conditionsText = profile.conditions.length > 0
        ? `The patient has the following medical conditions: ${profile.conditions.join(", ")}.`
        : "";
    const medsText = profile.medications.length > 0
        ? `They are currently taking: ${profile.medications.join(", ")}.`
        : "";

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="alice" language="en-US">
    This is an urgent emergency alert from First Watch, an A.I. medical monitoring system.
  </Say>
  <Pause length="0.5"/>
  <Say voice="alice" language="en-US">
    A ${incident.severity} severity ${incident.type} event has been detected for patient ${profile.name}.
    ${incident.description}.
  </Say>
  <Pause length="0.5"/>
  <Say voice="alice" language="en-US">
    Patient details: ${profile.name}, ${profile.age} years old, blood type ${profile.bloodType}.
    ${allergiesText}
    ${conditionsText}
    ${medsText}
  </Say>
  <Pause length="0.5"/>
  <Say voice="alice" language="en-US">
    Please check on the patient immediately. This alert was detected at ${new Date(incident.timestamp).toLocaleTimeString()}.
  </Say>
  <Pause length="1"/>
  <Say voice="alice" language="en-US">
    Repeating: This is a First Watch emergency alert for patient ${profile.name}. A ${incident.type} event with ${incident.severity} severity has been detected. Please respond immediately.
  </Say>
</Response>`;
}

function buildEMSCallTwiML(
    incident: IncidentInput,
    profile: ProfileInput
): string {
    const allergiesText = profile.allergies.length > 0
        ? `Critical allergy information: The patient is allergic to ${profile.allergies.join(" and ")}. Please ensure all responding medical personnel are aware of these allergies.`
        : "No known allergies on file.";
    const conditionsText = profile.conditions.length > 0
        ? `Pre-existing conditions include ${profile.conditions.join(", ")}.`
        : "";
    const medsText = profile.medications.length > 0
        ? `Current medications: ${profile.medications.join(", ")}.`
        : "";

    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="alice" language="en-US">
    Hello, this is an automated emergency call from First Watch, an A.I. medical monitoring system. We have detected a medical emergency that requires immediate assistance.
  </Say>
  <Pause length="0.8"/>
  <Say voice="alice" language="en-US">
    A ${incident.severity} severity ${incident.type.toLowerCase()} event has been detected. ${incident.description}.
  </Say>
  <Pause length="0.5"/>
  <Say voice="alice" language="en-US">
    The patient is ${profile.name}, ${profile.age} years old, with blood type ${profile.bloodType}.
    ${profile.height ? `Height: ${profile.height}.` : ""}
    ${profile.weight ? `Weight: ${profile.weight}.` : ""}
  </Say>
  <Pause length="0.5"/>
  <Say voice="alice" language="en-US">
    ${allergiesText}
    ${conditionsText}
    ${medsText}
  </Say>
  <Pause length="0.5"/>
  <Say voice="alice" language="en-US">
    This event was detected at ${new Date(incident.timestamp).toLocaleTimeString()} on ${new Date(incident.timestamp).toLocaleDateString()}.
    The patient's emergency contacts have also been notified.
    Please dispatch emergency medical services to the patient's location as soon as possible.
  </Say>
  <Pause length="1"/>
  <Say voice="alice" language="en-US">
    To repeat: Patient ${profile.name}, age ${profile.age}, is experiencing a ${incident.type.toLowerCase()} emergency classified as ${incident.severity} severity. Immediate medical assistance is required. Thank you.
  </Say>
</Response>`;
}

export async function POST(request: Request) {
    try {
        const { incident, contacts, profile, isTest, callEMS } = await request.json();

        if ((!contacts || contacts.length === 0) && !callEMS) {
            return NextResponse.json(
                { error: "No emergency contacts configured" },
                { status: 400 }
            );
        }

        const results: {
            contactName: string;
            smsSent: boolean;
            callMade: boolean;
            smsError?: string;
            callError?: string;
        }[] = [];

        const sorted = [...(contacts || [])].sort(
            (a: ContactInput, b: ContactInput) =>
                (a.priority || 0) - (b.priority || 0)
        );

        const smsBody = buildSMSBody(incident, profile);
        const twiml = buildCallTwiML(incident, profile);

        // Notify all emergency contacts
        for (const contact of sorted) {
            const result: (typeof results)[0] = {
                contactName: contact.name,
                smsSent: false,
                callMade: false,
            };

            if (contact.phone && twilioClient) {
                let phoneNumber = contact.phone.replace(/\D/g, "");
                if (!phoneNumber.startsWith("+")) {
                    phoneNumber = phoneNumber.startsWith("1")
                        ? `+${phoneNumber}`
                        : `+1${phoneNumber}`;
                }

                // Send SMS
                try {
                    await twilioClient.messages.create({
                        body: isTest ? `[TEST] ${smsBody}` : smsBody,
                        from: process.env.TWILIO_PHONE_NUMBER,
                        to: phoneNumber,
                    });
                    result.smsSent = true;
                } catch (err: any) {
                    result.smsError = err.message || "SMS send failed";
                    console.error(`[FirstWatch] SMS error to ${contact.name}:`, err.message);
                }

                // Make emergency call for HIGH/CRITICAL (skip for test)
                if (!isTest && (incident.severity === "CRITICAL" || incident.severity === "HIGH")) {
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

                // Test call
                if (isTest) {
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
                result.smsError = "Twilio not configured";
                result.callError = "Twilio not configured";
            } else {
                result.smsError = "No phone number";
            }

            results.push(result);
        }

        // Call EMS if requested and not a test
        if (callEMS && !isTest && twilioClient) {
            const emsPhone = process.env.EMS_PHONE_NUMBER;
            const emsResult: (typeof results)[0] = {
                contactName: "EMS (911)",
                smsSent: false,
                callMade: false,
            };

            if (emsPhone) {
                let phoneNumber = emsPhone.replace(/\D/g, "");
                if (!phoneNumber.startsWith("+")) {
                    phoneNumber = phoneNumber.startsWith("1")
                        ? `+${phoneNumber}`
                        : `+1${phoneNumber}`;
                }

                const emsTwiml = buildEMSCallTwiML(incident, profile);
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
