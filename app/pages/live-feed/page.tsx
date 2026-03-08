"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  PlayCircle,
  StopCircle,
  Loader2,
  AlertTriangle,
  Activity,
  Volume2,
  Mic,
  MicOff,
  CheckCircle,
  Bell,
  Phone,
  X,
  ShieldAlert,
  Radio,
  Clock,
  Waves,
} from "lucide-react";
import { detectMedicalEvents, type MedicalVideoEvent } from "./actions";
import type { Incident, MedicalProfile } from "@/types/medical";

import type * as blazeface from "@tensorflow-models/blazeface";
import type * as posedetection from "@tensorflow-models/pose-detection";
import type * as tf from "@tensorflow/tfjs";

let tfjs: typeof tf;
let blazefaceModel: typeof blazeface;
let poseDetection: typeof posedetection;

interface Keypoint {
  x: number;
  y: number;
  score?: number;
  name?: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  LOW: "text-yellow-400 border-yellow-700/50 bg-yellow-900/20",
  MEDIUM: "text-orange-400 border-orange-700/50 bg-orange-900/20",
  HIGH: "text-red-400 border-red-700/50 bg-red-900/20",
  CRITICAL: "text-red-300 border-red-600/50 bg-red-950/40",
};

const TYPE_ICONS: Record<string, string> = {
  STROKE: "🧠",
  FALL: "⬇️",
  CARDIAC: "❤️",
  SEIZURE: "⚡",
  DISTRESS: "🆘",
  NORMAL: "✅",
};

interface NotificationLog {
  id: string;
  contactName: string;
  method: "call" | "ems";
  success: boolean;
  error?: string;
  timestamp: Date;
}

export default function LiveFeedPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initProgress, setInitProgress] = useState("Loading...");
  const [mlReady, setMlReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<MedicalVideoEvent[]>([]);
  const [transcript, setTranscript] = useState("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showEmergencyOverlay, setShowEmergencyOverlay] = useState(false);
  const [emergencyEvent, setEmergencyEvent] = useState<MedicalVideoEvent | null>(null);
  const [emergencyDetected, setEmergencyDetected] = useState(false);
  const [profile, setProfile] = useState<MedicalProfile | null>(null);
  const [checkInSent, setCheckInSent] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [isNotifying, setIsNotifying] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioRecordingTime, setAudioRecordingTime] = useState(0);
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const [frameCount, setFrameCount] = useState(0);
  const [location, setLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [userConfirmedOkay, setUserConfirmedOkay] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const detectionFrameRef = useRef<number | null>(null);
  const lastDetectionTime = useRef<number>(0);
  const startTimeRef = useRef<Date | null>(null);
  const faceModelRef = useRef<blazeface.BlazeFaceModel | null>(null);
  const poseModelRef = useRef<posedetection.PoseDetector | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isRecordingRef = useRef(false);
  const lastPoseKeypoints = useRef<Keypoint[]>([]);
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);
  const emergencyDetectedRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioTimerRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const geoWatchIdRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownCallbackRef = useRef<(() => void) | null>(null);
  const userConfirmedOkayRef = useRef(false);

  useEffect(() => {
    setIsClient(true);
    const p = localStorage.getItem("firstwatch_profile");
    if (p) setProfile(JSON.parse(p));

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    alertAudioRef.current = new Audio("/alert.mp3");
    alertAudioRef.current.volume = 0.8;

    // Start geolocation watcher
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      let lastGeocode = 0;
      geoWatchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const loc: { lat: number; lng: number; address?: string } = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          // Reverse geocode at most once every 30 seconds
          const now = Date.now();
          if (now - lastGeocode > 30000) {
            lastGeocode = now;
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${loc.lat}&lon=${loc.lng}&format=json`)
              .then((r) => r.json())
              .then((data) => {
                if (data.display_name) {
                  loc.address = data.display_name;
                  setLocation({ ...loc });
                  localStorage.setItem("firstwatch_location", JSON.stringify(loc));
                }
              })
              .catch(() => {});
          }
          setLocation((prev) => ({ ...loc, address: prev?.address }));
          localStorage.setItem("firstwatch_location", JSON.stringify({ ...loc, address: location?.address }));
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    }

    return () => {
      if (geoWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("firstwatch_monitoring", isRecording ? "true" : "false");
    window.dispatchEvent(new Event("storage"));
  }, [isRecording]);

  // Elapsed time ticker
  useEffect(() => {
    if (isRecording) {
      elapsedTimerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
          setElapsedTime(`${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`);
        }
      }, 1000);
    }
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [isRecording]);

  // ML Init
  const initMLModels = useCallback(async () => {
    try {
      setIsInitializing(true);
      setInitProgress("Loading TensorFlow.js...");
      const tfPromise = import("@tensorflow/tfjs").then(async (tf) => {
        tfjs = tf;
        await tf.ready();
        await tf.setBackend("webgl");
      });

      setInitProgress("Loading detection models...");
      const [bfMod, pdMod] = await Promise.all([
        import("@tensorflow-models/blazeface"),
        import("@tensorflow-models/pose-detection"),
      ]);
      blazefaceModel = bfMod;
      poseDetection = pdMod;
      await tfPromise;

      setInitProgress("Initializing models...");
      const [faceModel, poseModel] = await Promise.all([
        blazefaceModel.load({ maxFaces: 1, scoreThreshold: 0.5 }),
        poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true,
            minPoseScore: 0.3,
          }
        ),
      ]);

      faceModelRef.current = faceModel;
      poseModelRef.current = poseModel;
      setMlReady(true);
      setIsInitializing(false);
    } catch (err) {
      setError("Failed to load ML models: " + (err as Error).message);
      setIsInitializing(false);
    }
  }, []);

  // Webcam
  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640, max: 640 }, height: { ideal: 360, max: 360 }, frameRate: { ideal: 30 }, facingMode: "user" },
        audio: true,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        mediaStreamRef.current = stream;
        await new Promise<void>((resolve) => {
          videoRef.current!.onloadedmetadata = () => {
            if (canvasRef.current) {
              canvasRef.current.width = 640;
              canvasRef.current.height = 360;
            }
            resolve();
          };
        });
      }
    } catch {
      setError("Failed to access webcam. Please grant camera permissions.");
    }
  }, []);

  const stopWebcam = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Speech recognition
  const initSpeech = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!("webkitSpeechRecognition" in window)) return;
    const SR = window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
      }
      if (final) {
        setTranscript((p) => p + " " + final);
        // Detect verbal "I'm okay" / "I am okay" confirmation
        const lower = final.toLowerCase();
        if (emergencyDetectedRef.current && !userConfirmedOkayRef.current &&
            (lower.includes("i'm okay") || lower.includes("i am okay") || lower.includes("im okay") || lower.includes("i'm fine") || lower.includes("i am fine"))) {
          userConfirmedOkayRef.current = true;
          setUserConfirmedOkay(true);
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          countdownCallbackRef.current = null;
          setCountdownSeconds(null);
        }
      }
    };
    recognitionRef.current = rec;
  }, []);

  // TTS verbal check-in
  const speakCheckIn = useCallback(async (name?: string) => {
    const text = `${name ? name + ", are" : "Are"} you okay? Say something if you can hear me.`;
    setCheckInSent(true);
    setTimeout(() => setCheckInSent(false), 5000);

    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const contentType = res.headers.get("Content-Type") || "";
      if (contentType.includes("audio")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.volume = 1;
        audio.play();
        audio.onended = () => URL.revokeObjectURL(url);
        return;
      }
    } catch {
      // Fall through to browser TTS
    }

    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const playAlertSound = useCallback(() => {
    if (alertAudioRef.current) {
      alertAudioRef.current.currentTime = 0;
      alertAudioRef.current.play().catch(() => {});
    }
  }, []);

  const sendDesktopNotification = useCallback((event: MedicalVideoEvent) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    new Notification(`⚠️ FirstWatch — ${event.emergencyType} Alert`, {
      body: event.description,
      icon: "/HawkWatchLogo.png",
      tag: "firstwatch-alert",
      requireInteraction: true,
    });
  }, []);

  // Start recording audio when emergency is detected
  const startAudioRecording = useCallback(() => {
    if (!mediaStreamRef.current) return;
    const audioTracks = mediaStreamRef.current.getAudioTracks();
    if (audioTracks.length === 0) return;

    const audioStream = new MediaStream(audioTracks);
    const mediaRecorder = new MediaRecorder(audioStream, { mimeType: "audio/webm" });
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    mediaRecorder.start(1000); // Collect data every second
    mediaRecorderRef.current = mediaRecorder;
    setIsRecordingAudio(true);
    setAudioRecordingTime(0);

    // Timer to track recording duration
    let seconds = 0;
    audioTimerRef.current = setInterval(() => {
      seconds++;
      setAudioRecordingTime(seconds);
    }, 1000);

    // Auto-stop after 60 seconds
    setTimeout(() => {
      stopAudioRecording();
    }, 60000);
  }, []);

  const stopAudioRecording = useCallback((): string | null => {
    if (audioTimerRef.current) {
      clearInterval(audioTimerRef.current);
      audioTimerRef.current = null;
    }

    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
      setIsRecordingAudio(false);
      return null;
    }

    return new Promise<string | null>((resolve) => {
      const recorder = mediaRecorderRef.current!;
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setIsRecordingAudio(false);
        resolve(url);
      };
      recorder.stop();
    }) as unknown as string | null;
  }, []);

  // Save audio to incident after recording
  const finalizeAudioRecording = useCallback(async (incidentId: string) => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;

    if (audioTimerRef.current) {
      clearInterval(audioTimerRef.current);
      audioTimerRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    return new Promise<void>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(blob);

        // Update the incident with audio URL
        const existing: Incident[] = JSON.parse(localStorage.getItem("firstwatch_incidents") || "[]");
        const idx = existing.findIndex((i) => i.id === incidentId);
        if (idx !== -1) {
          existing[idx].audioUrl = audioUrl;
          existing[idx].duration = audioRecordingTime;
          localStorage.setItem("firstwatch_incidents", JSON.stringify(existing));
          window.dispatchEvent(new Event("storage"));
        }

        setIsRecordingAudio(false);
        resolve();
      };
      recorder.stop();
    });
  }, [audioRecordingTime]);

  // Notify contacts + EMS
  const notifyContacts = useCallback(async (event: MedicalVideoEvent, incident: Incident) => {
    const contacts = JSON.parse(localStorage.getItem("firstwatch_contacts") || "[]");
    const storedProfile = JSON.parse(localStorage.getItem("firstwatch_profile") || "null");
    if (!storedProfile) return;

    const emsEnabled = localStorage.getItem("firstwatch_call_ems") !== "false";
    const storedLocation = JSON.parse(localStorage.getItem("firstwatch_location") || "null");

    setIsNotifying(true);

    try {
      const res = await fetch("/api/notify-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident: {
            type: incident.type,
            severity: incident.severity,
            description: incident.description,
            timestamp: incident.timestamp,
            transcript: transcript.trim(),
          },
          contacts,
          profile: storedProfile,
          callEMS: emsEnabled,
          location: storedLocation,
        }),
      });
      const data = await res.json();

      if (data.results) {
        const newLogs: NotificationLog[] = [];
        for (const r of data.results) {
          if (r.contactName === "EMS (911)") {
            newLogs.push({
              id: Date.now().toString() + "-ems",
              contactName: "Emergency Services",
              method: "ems",
              success: r.callMade,
              error: r.callError,
              timestamp: new Date(),
            });
          } else {
            newLogs.push({
              id: Date.now().toString() + "-call-" + r.contactName,
              contactName: r.contactName,
              method: "call",
              success: r.callMade,
              error: r.callError,
              timestamp: new Date(),
            });
          }
        }
        setNotificationLogs((prev) => [...newLogs, ...prev].slice(0, 50));
      }
    } catch (err) {
      console.error("Notify contacts error:", err);
    } finally {
      setIsNotifying(false);
    }
  }, [transcript]);

  // Detection loop (visual only - bounding boxes)
  const runDetection = useCallback(async () => {
    if (!isRecordingRef.current) return;
    const now = performance.now();
    if (now - lastDetectionTime.current < 100) {
      detectionFrameRef.current = requestAnimationFrame(runDetection);
      return;
    }
    lastDetectionTime.current = now;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      detectionFrameRef.current = requestAnimationFrame(runDetection);
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) { detectionFrameRef.current = requestAnimationFrame(runDetection); return; }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const vAspect = video.videoWidth / video.videoHeight;
    const cAspect = canvas.width / canvas.height;
    let dw = canvas.width, dh = canvas.height, ox = 0, oy = 0;
    if (vAspect > cAspect) { dh = canvas.width / vAspect; oy = (canvas.height - dh) / 2; }
    else { dw = canvas.height * vAspect; ox = (canvas.width - dw) / 2; }
    ctx.drawImage(video, ox, oy, dw, dh);

    const sx = canvas.width / (video.videoWidth || 640);
    const sy = canvas.height / (video.videoHeight || 360);

    if (faceModelRef.current) {
      try {
        const preds = await faceModelRef.current.estimateFaces(video, false);
        preds.forEach((pred: blazeface.NormalizedFace) => {
          const start = pred.topLeft as [number, number];
          const end = pred.bottomRight as [number, number];
          const color = emergencyDetectedRef.current ? "rgba(220,38,38,0.9)" : "rgba(34,197,94,0.6)";
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.strokeRect(start[0] * sx, start[1] * sy, (end[0] - start[0]) * sx, (end[1] - start[1]) * sy);
        });
      } catch { /* ignore */ }
    }

    if (poseModelRef.current) {
      try {
        const poses = await poseModelRef.current.estimatePoses(video);
        if (poses[0]) {
          lastPoseKeypoints.current = poses[0].keypoints.map((kp) => ({ x: kp.x, y: kp.y, score: kp.score ?? 0, name: kp.name }));
          const color = emergencyDetectedRef.current ? "rgba(220,38,38,0.9)" : "rgba(34,197,94,0.8)";
          poses[0].keypoints.forEach((kp) => {
            if ((kp.score ?? 0) > 0.3) {
              ctx.beginPath();
              ctx.arc(kp.x * sx, kp.y * sy, 4, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
            }
          });
        }
      } catch { /* ignore */ }
    }

    detectionFrameRef.current = requestAnimationFrame(runDetection);
  }, []);

  // Frame capture
  const captureFrame = async (): Promise<string | null> => {
    if (!videoRef.current) return null;
    const tmp = document.createElement("canvas");
    tmp.width = 320; tmp.height = 180;
    const ctx = tmp.getContext("2d");
    if (!ctx) return null;
    try { ctx.drawImage(videoRef.current, 0, 0, 320, 180); return tmp.toDataURL("image/jpeg", 0.6); }
    catch { return null; }
  };

  const getElapsedTime = () => {
    if (!startTimeRef.current) return "00:00";
    const elapsed = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
    return `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  };

  // Analyze frame - STOPS after emergency detected
  const analyzeFrame = useCallback(async () => {
    if (!isRecordingRef.current || emergencyDetectedRef.current) return;

    const frame = await captureFrame();
    if (!frame) return;
    setFrameCount((c) => c + 1);

    try {
      const result = await detectMedicalEvents(frame, transcript.trim(), profile?.name);
      if (!isRecordingRef.current || emergencyDetectedRef.current) return;

      result.events.forEach((event) => {
        // Skip NORMAL events - don't show or process them
        if (event.emergencyType === "NORMAL" || !event.isDangerous) return;

        const ts = getElapsedTime();
        const eventWithTs: MedicalVideoEvent = { ...event, timestamp: ts };
        setEvents((prev) => [...prev, eventWithTs]);

        // EMERGENCY DETECTED - show alert ONCE and stop monitoring
        emergencyDetectedRef.current = true;
        setEmergencyDetected(true);
        setEmergencyEvent(eventWithTs);
        setShowEmergencyOverlay(true);

        // Stop the analysis interval (stop sending frames to Gemini)
        if (analysisIntervalRef.current) {
          clearInterval(analysisIntervalRef.current);
          analysisIntervalRef.current = null;
        }

        // 1. Play alert sound
        playAlertSound();

        // 2. TTS verbal check-in
        speakCheckIn(profile?.name);

        // 3. Desktop notification
        sendDesktopNotification(event);

        // 4. Start recording audio
        startAudioRecording();

        // 5. Save to localStorage
        const incident: Incident = {
          id: Date.now().toString(),
          type: event.emergencyType as Incident["type"],
          severity: event.severity as Incident["severity"],
          description: event.description,
          timestamp: new Date().toISOString(),
        };
        const existing: Incident[] = JSON.parse(localStorage.getItem("firstwatch_incidents") || "[]");
        existing.push(incident);
        localStorage.setItem("firstwatch_incidents", JSON.stringify(existing));
        window.dispatchEvent(new Event("storage"));

        // 6. Start 10-second countdown — user can cancel by saying "I'm okay" or pressing the button
        userConfirmedOkayRef.current = false;
        setUserConfirmedOkay(false);
        setCountdownSeconds(10);
        let remaining = 10;
        countdownCallbackRef.current = () => {
          notifyContacts(event, incident);
        };
        countdownTimerRef.current = setInterval(() => {
          remaining--;
          setCountdownSeconds(remaining);
          if (remaining <= 0) {
            clearInterval(countdownTimerRef.current!);
            countdownTimerRef.current = null;
            setCountdownSeconds(null);
            // Only call if user hasn't confirmed okay
            if (!userConfirmedOkayRef.current && countdownCallbackRef.current) {
              countdownCallbackRef.current();
              countdownCallbackRef.current = null;
            }
          }
        }, 1000);

        // 7. After 60s, finalize audio and update incident
        setTimeout(() => {
          finalizeAudioRecording(incident.id);
        }, 60000);
      });
    } catch (err) {
      console.error("Analysis error:", err);
    }
  }, [transcript, profile, speakCheckIn, playAlertSound, sendDesktopNotification, notifyContacts, startAudioRecording, finalizeAudioRecording]);

  // Recording control
  const startRecording = () => {
    if (!mlReady || !mediaStreamRef.current) return;
    setError(null);
    setEvents([]);
    setTranscript("");
    setFrameCount(0);
    emergencyDetectedRef.current = false;
    setEmergencyDetected(false);
    setEmergencyEvent(null);
    setShowEmergencyOverlay(false);
    setUserConfirmedOkay(false);
    userConfirmedOkayRef.current = false;
    setCountdownSeconds(null);
    cancelCountdown();
    startTimeRef.current = new Date();
    isRecordingRef.current = true;
    setIsRecording(true);

    if (recognitionRef.current) {
      try { recognitionRef.current.start(); setIsTranscribing(true); } catch { /* ignore */ }
    }

    lastDetectionTime.current = 0;
    detectionFrameRef.current = requestAnimationFrame(runDetection);
    analyzeFrame();
    analysisIntervalRef.current = setInterval(analyzeFrame, 6000);
  };

  const stopRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    startTimeRef.current = null;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      setIsTranscribing(false);
    }
    if (detectionFrameRef.current) {
      cancelAnimationFrame(detectionFrameRef.current);
      detectionFrameRef.current = null;
    }
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }
  };

  const cancelCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    countdownCallbackRef.current = null;
    setCountdownSeconds(null);
  }, []);

  const confirmImOkay = useCallback(() => {
    userConfirmedOkayRef.current = true;
    setUserConfirmedOkay(true);
    cancelCountdown();
  }, [cancelCountdown]);

  const dismissEmergency = () => {
    confirmImOkay();
    setShowEmergencyOverlay(false);
    setEmergencyDetected(false);
    setEmergencyEvent(null);
    emergencyDetectedRef.current = false;
    setUserConfirmedOkay(false);
    userConfirmedOkayRef.current = false;

    // Stop audio recording if active
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      if (audioTimerRef.current) {
        clearInterval(audioTimerRef.current);
        audioTimerRef.current = null;
      }
    }
  };

  const resumeMonitoring = () => {
    dismissEmergency();
    // Restart analysis
    if (isRecordingRef.current) {
      analyzeFrame();
      analysisIntervalRef.current = setInterval(analyzeFrame, 6000);
    }
  };

  // Lifecycle
  useEffect(() => {
    initSpeech();
    const init = async () => {
      await startWebcam();
      await initMLModels();
    };
    init();
    return () => {
      stopRecording();
      stopWebcam();
    };
  }, [initMLModels, startWebcam, stopWebcam, initSpeech]);

  const dangerousEvents = events.filter((e) => e.isDangerous);

  return (
    <div className="min-h-screen bg-[#0A0A0A] p-6">
      {/* Emergency overlay - shown ONCE */}
      {showEmergencyOverlay && emergencyEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.85)" }}>
          <div className="absolute inset-0 emergency-flash bg-red-600 pointer-events-none" />
          <div className="relative z-10 max-w-lg w-full mx-4">
            <div className="bg-gradient-to-b from-red-950/90 to-[#111] border-2 border-red-600 rounded-2xl p-8 backdrop-blur-xl shadow-2xl shadow-red-900/30">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-red-600 animate-pulse">
                    <ShieldAlert className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">EMERGENCY DETECTED</h2>
                    <p className="text-red-400 text-sm font-medium">{emergencyEvent.emergencyType} Alert</p>
                  </div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full border font-black ${SEVERITY_COLORS[emergencyEvent.severity]}`}>
                  {emergencyEvent.severity}
                </span>
              </div>

              <div className="bg-black/40 rounded-xl p-4 mb-6 border border-red-900/30">
                <p className="text-red-200 text-sm leading-relaxed">{emergencyEvent.description}</p>
                <p className="text-red-500/60 text-xs mt-2 font-mono">Detected at {emergencyEvent.timestamp}</p>
              </div>

              {/* Audio Recording Status */}
              {isRecordingAudio && (
                <div className="flex items-center gap-3 bg-red-950/30 border border-red-800/50 rounded-xl px-4 py-3 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                  <Waves className="w-4 h-4 text-red-400" />
                  <span className="text-red-300 text-sm">Recording audio... {audioRecordingTime}s</span>
                </div>
              )}

              {/* "I Am Okay" Button + Countdown */}
              {countdownSeconds !== null && !userConfirmedOkay && (
                <div className="mb-4">
                  <button
                    onClick={confirmImOkay}
                    className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-lg font-black tracking-wide transition-colors shadow-lg shadow-green-900/40 border-2 border-green-400/30"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <CheckCircle className="w-6 h-6" />
                      <span>I Am Okay</span>
                    </div>
                  </button>
                  <div className="mt-2 text-center">
                    <span className="text-yellow-400 text-sm font-bold">
                      Calling emergency contacts in {countdownSeconds}s...
                    </span>
                    <p className="text-zinc-500 text-xs mt-1">Press the button or say &quot;I&apos;m okay&quot; to cancel</p>
                  </div>
                </div>
              )}

              {userConfirmedOkay && (
                <div className="mb-4 flex items-center gap-2 bg-green-950/30 border border-green-700/50 rounded-xl px-4 py-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 text-sm font-semibold">User confirmed okay — emergency calls cancelled</span>
                </div>
              )}

              {/* Notification Status */}
              <div className="space-y-2 mb-6">
                {isNotifying ? (
                  <div className="flex items-center gap-2 text-yellow-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Notifying emergency contacts & EMS...</span>
                  </div>
                ) : notificationLogs.length > 0 ? (
                  <div className="space-y-1.5">
                    {notificationLogs.slice(0, 5).map((log) => (
                      <div key={log.id} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${log.success ? "text-green-400 bg-green-950/20" : "text-red-400 bg-red-950/20"}`}>
                        {log.method === "ems" ? <Radio className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                        <span>{log.success ? "✓" : "✗"} {log.method === "ems" ? "EMS Call" : "Call"} → {log.contactName}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={dismissEmergency}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Dismiss Alert
                </button>
                <button
                  onClick={resumeMonitoring}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Resume Monitoring
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Live Medical Monitor</h1>
            <p className="text-zinc-500 text-sm">
              {profile ? `Monitoring: ${profile.name}` : "AI-powered emergency detection"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isRecording && (
              <div className="flex items-center gap-3 bg-black/40 border border-[#1F1F1F] rounded-full px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  <span className="text-red-400 text-xs font-bold tracking-wider">LIVE</span>
                </div>
                <div className="w-px h-4 bg-zinc-700" />
                <span className="text-zinc-400 text-xs font-mono">{elapsedTime}</span>
                <div className="w-px h-4 bg-zinc-700" />
                <span className="text-zinc-500 text-xs">{frameCount} frames</span>
              </div>
            )}
            {emergencyDetected && !showEmergencyOverlay && (
              <button
                onClick={() => setShowEmergencyOverlay(true)}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg text-white text-xs font-bold animate-pulse transition-colors"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                View Alert
              </button>
            )}
            {checkInSent && (
              <div className="flex items-center gap-2 bg-blue-900/30 border border-blue-700/50 px-3 py-1.5 rounded-lg">
                <Volume2 className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 text-xs">Check-in sent</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video feed */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-[#111] border border-[#1F1F1F] shadow-xl shadow-black/20" style={{ aspectRatio: "16/9" }}>
              {isInitializing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#111] z-20">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-full border-2 border-red-600/20 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                    </div>
                    <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-red-600/40 animate-ping" />
                  </div>
                  <p className="text-zinc-300 text-sm font-medium">{initProgress}</p>
                  <p className="text-zinc-600 text-xs mt-1">Preparing AI detection pipeline</p>
                </div>
              )}
              {isClient && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  width={640}
                  height={360}
                  className="absolute inset-0 w-full h-full object-cover opacity-0"
                />
              )}
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {/* Status overlays */}
              {isRecording && (
                <>
                  <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/5">
                    <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                    <span className="text-white text-xs font-medium tracking-wide">
                      {emergencyDetected ? "EMERGENCY" : "ANALYZING"}
                    </span>
                  </div>
                  {isRecordingAudio && (
                    <div className="absolute top-3 right-3 flex items-center gap-2 bg-red-600/80 backdrop-blur-sm px-3 py-1.5 rounded-full">
                      <Mic className="w-3 h-3 text-white" />
                      <span className="text-white text-xs font-medium">REC {audioRecordingTime}s</span>
                    </div>
                  )}
                </>
              )}
              {/* Emergency border glow */}
              {emergencyDetected && (
                <div className="absolute inset-0 rounded-2xl border-2 border-red-600 pointer-events-none animate-pulse" />
              )}
            </div>

            {/* Controls */}
            {error && (
              <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-xl text-red-300 text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3">
              {isInitializing ? (
                <button disabled className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800/50 rounded-xl text-zinc-500 cursor-not-allowed text-sm border border-zinc-700/30">
                  <Loader2 className="w-4 h-4 animate-spin" /> Initializing models...
                </button>
              ) : !isRecording ? (
                <button
                  onClick={startRecording}
                  disabled={!mlReady}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-xl text-white font-semibold text-sm transition-all hover:shadow-lg hover:shadow-red-900/30"
                >
                  <PlayCircle className="w-4 h-4" /> Start Monitoring
                </button>
              ) : (
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-6 py-3 bg-zinc-700 hover:bg-zinc-600 rounded-xl text-white font-semibold text-sm transition-all"
                >
                  <StopCircle className="w-4 h-4" /> Stop Monitoring
                </button>
              )}

              {isRecording && (
                <button
                  onClick={() => speakCheckIn(profile?.name)}
                  className="flex items-center gap-2 px-4 py-3 bg-blue-900/20 border border-blue-800/40 hover:bg-blue-900/30 rounded-xl text-blue-400 text-sm transition-colors"
                >
                  <Volume2 className="w-4 h-4" /> Manual Check-in
                </button>
              )}

              {emergencyDetected && !showEmergencyOverlay && (
                <button
                  onClick={resumeMonitoring}
                  className="flex items-center gap-2 px-4 py-3 bg-red-900/20 border border-red-800/40 hover:bg-red-900/30 rounded-xl text-red-400 text-sm transition-colors"
                >
                  <Activity className="w-4 h-4" /> Resume Monitoring
                </button>
              )}
            </div>

            {/* Transcript */}
            <div className="bg-[#111] border border-[#1F1F1F] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                {isTranscribing ? <Mic className="w-4 h-4 text-red-500" /> : <MicOff className="w-4 h-4 text-zinc-600" />}
                <span className="text-sm font-medium text-zinc-300">Audio Transcript</span>
                {isTranscribing && <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-auto" />}
              </div>
              <p className="text-sm text-zinc-500 min-h-[40px]">
                {transcript || (isRecording ? "Listening for speech..." : "Start monitoring to capture audio")}
              </p>
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Status */}
            <div className={`p-4 rounded-xl border transition-all ${emergencyDetected
              ? "bg-red-950/30 border-red-700/50 shadow-lg shadow-red-900/10"
              : isRecording
                ? "bg-red-950/10 border-red-900/40"
                : "bg-[#111] border-[#1F1F1F]"
              }`}>
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-3 h-3 rounded-full ${emergencyDetected ? "bg-red-500 animate-pulse" : isRecording ? "bg-green-500 animate-pulse" : "bg-zinc-600"}`} />
                <span className={`text-sm font-semibold ${emergencyDetected ? "text-red-400" : isRecording ? "text-green-400" : "text-zinc-400"}`}>
                  {emergencyDetected ? "Emergency Detected" : isRecording ? "Monitoring Active" : "Monitoring Stopped"}
                </span>
              </div>
              <p className="text-xs text-zinc-600">
                {emergencyDetected
                  ? "Analysis paused. Contacts & EMS notified."
                  : isRecording
                    ? "AI analyzes every 6 seconds"
                    : "Click Start Monitoring to begin"}
              </p>
              {isRecording && dangerousEvents.length > 0 && (
                <div className="mt-3 p-2 bg-red-950/30 rounded-lg border border-red-900/40">
                  <div className="flex items-center gap-1.5 text-red-400 text-xs font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {dangerousEvents.length} alert{dangerousEvents.length !== 1 ? "s" : ""} this session
                  </div>
                </div>
              )}
            </div>

            {/* Notification Log */}
            <div className="bg-[#111] border border-[#1F1F1F] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4 text-red-500" />
                <span className="text-sm font-semibold text-white">Notifications</span>
                {isNotifying && (
                  <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin ml-auto" />
                )}
                {!isNotifying && notificationLogs.length > 0 && (
                  <span className="ml-auto text-xs text-zinc-600">{notificationLogs.length}</span>
                )}
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {notificationLogs.length === 0 ? (
                  <p className="text-xs text-zinc-600 text-center py-4">
                    {isRecording ? "Contacts notified on emergencies" : "No notifications yet"}
                  </p>
                ) : (
                  notificationLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs ${log.success
                        ? "bg-green-950/20 border border-green-900/30 text-green-400"
                        : "bg-red-950/20 border border-red-900/30 text-red-400"
                        }`}
                    >
                      {log.method === "ems" ? (
                        <Radio className="w-3 h-3 flex-shrink-0" />
                      ) : (
                        <Phone className="w-3 h-3 flex-shrink-0" />
                      )}
                      <span className="truncate">
                        {log.success ? "✓" : "✗"} {log.method === "ems" ? "EMS" : "Call"} → {log.contactName}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Events - only dangerous ones */}
            <div className="bg-[#111] border border-[#1F1F1F] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-red-500" />
                <span className="text-sm font-semibold text-white">Alerts</span>
                <span className="ml-auto text-xs text-zinc-600">{dangerousEvents.length} total</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {dangerousEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
                    <p className="text-zinc-600 text-xs">
                      {isRecording ? "All clear — monitoring..." : "No alerts recorded"}
                    </p>
                  </div>
                ) : (
                  [...dangerousEvents].reverse().map((event, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border text-xs ${SEVERITY_COLORS[event.severity]}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span>{TYPE_ICONS[event.emergencyType] || "📋"}</span>
                        <span className="font-semibold">{event.emergencyType}</span>
                        <span className="ml-auto font-bold">{event.severity}</span>
                      </div>
                      <p className="text-xs opacity-80 leading-relaxed">{event.description}</p>
                      <p className="text-xs opacity-50 mt-1 font-mono">{event.timestamp}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Patient card */}
            {profile && (
              <div className="bg-[#111] border border-[#1F1F1F] rounded-xl p-4">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Patient</h3>
                <p className="text-sm font-medium text-white">{profile.name}</p>
                {profile.age > 0 && <p className="text-xs text-zinc-500 mt-1">Age: {profile.age}</p>}
                {profile.bloodType && profile.bloodType !== "Unknown" && (
                  <p className="text-xs text-zinc-500 mt-1">Blood: {profile.bloodType}</p>
                )}
                {profile.allergies.length > 0 && (
                  <p className="text-xs text-yellow-600 mt-1">⚠️ {profile.allergies.join(", ")}</p>
                )}
                {profile.medications.length > 0 && (
                  <p className="text-xs text-zinc-500 mt-1">Meds: {profile.medications.join(", ")}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
