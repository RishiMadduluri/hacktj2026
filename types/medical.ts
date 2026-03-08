export interface MedicalProfile {
  name: string;
  age: number;
  dob: string;
  height: string;
  weight: string;
  bloodType: string;
  allergies: string[];
  conditions: string[];
  medications: string[];
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email: string;
  relationship: string;
  priority: number;
  notifyCall?: boolean;
}

export type EmergencyType = "STROKE" | "FALL" | "CARDIAC" | "SEIZURE" | "DISTRESS" | "NORMAL";
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Incident {
  id: string;
  type: EmergencyType;
  severity: Severity;
  description: string;
  timestamp: string; // ISO string
  audioUrl?: string;
  duration?: number;
  isConfirmed?: boolean;
}

export interface MedicalEvent {
  timestamp: string;
  description: string;
  isDangerous: boolean;
  emergencyType: EmergencyType;
  severity: Severity;
}
