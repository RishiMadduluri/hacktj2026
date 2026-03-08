/* FirstWatch — timestamp shape used across analysis pages */

export interface Timestamp {
  /** Time mark in "MM:SS" format */
  timestamp: string;
  /** Human-readable description of what was detected */
  description: string;
  /** Whether the moment was flagged as medically critical */
  isDangerous: boolean;
}