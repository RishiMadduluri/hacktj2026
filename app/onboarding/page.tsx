"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { X, Plus, ChevronRight, Shield } from "lucide-react";
import type { MedicalProfile } from "@/types/medical";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

function TagInput({
  label,
  tags,
  onAdd,
  onRemove,
  placeholder,
}: {
  label: string;
  tags: string[];
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
  placeholder: string;
}) {
  const [value, setValue] = useState("");

  const handleAdd = () => {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onAdd(trimmed);
      setValue("");
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm text-zinc-300 font-medium">{label}</label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
          placeholder={placeholder}
          className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-red-600"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="p-2 rounded-lg bg-red-900/30 border border-red-800 text-red-400 hover:bg-red-900/50 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, i) => (
            <span key={i} className="flex items-center gap-1 px-2 py-1 bg-red-950/30 border border-red-900 rounded-full text-xs text-red-300">
              {tag}
              <button type="button" onClick={() => onRemove(i)} className="hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState<MedicalProfile>({
    name: "",
    age: 0,
    dob: "",
    height: "",
    weight: "",
    bloodType: "Unknown",
    allergies: [],
    conditions: [],
    medications: [],
  });

  const set = (key: keyof MedicalProfile, value: string | number | string[]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const addTag = (key: "allergies" | "conditions" | "medications", val: string) =>
    set(key, [...profile[key], val]);

  const removeTag = (key: "allergies" | "conditions" | "medications", i: number) =>
    set(key, profile[key].filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!profile.name.trim()) {
      alert("Please enter your name.");
      return;
    }
    setSaving(true);
    localStorage.setItem("firstwatch_profile", JSON.stringify(profile));
    // Brief pause for UX
    await new Promise((r) => setTimeout(r, 500));
    router.push("/protected");
  };

  const inputClass =
    "w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-red-600";

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span className="text-red-600 font-bold tracking-widest text-sm">FIRSTWATCH</span>
          </div>
          <Shield className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white">Set Up Your Medical Profile</h1>
          <p className="text-zinc-400 mt-2">
            This information helps FirstWatch respond accurately in an emergency.
            <br />
            <span className="text-zinc-600 text-sm">Stored locally on your device only.</span>
          </p>
        </div>

        <div className="bg-[#111] border border-[#1F1F1F] rounded-2xl p-8 space-y-6">
          {/* Basic Info */}
          <div>
            <h2 className="text-sm font-semibold text-red-500 uppercase tracking-widest mb-4">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-zinc-300 font-medium block mb-1">Full Name *</label>
                <input
                  value={profile.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Robert Johnson"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm text-zinc-300 font-medium block mb-1">Age</label>
                <input
                  type="number"
                  value={profile.age || ""}
                  onChange={(e) => set("age", parseInt(e.target.value) || 0)}
                  placeholder="72"
                  min={0}
                  max={120}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm text-zinc-300 font-medium block mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={profile.dob}
                  onChange={(e) => set("dob", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm text-zinc-300 font-medium block mb-1">Blood Type</label>
                <select
                  value={profile.bloodType}
                  onChange={(e) => set("bloodType", e.target.value)}
                  className={inputClass}
                >
                  {BLOOD_TYPES.map((bt) => (
                    <option key={bt} value={bt}>{bt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-zinc-300 font-medium block mb-1">Height</label>
                <input
                  value={profile.height}
                  onChange={(e) => set("height", e.target.value)}
                  placeholder={"5'10\" or 178cm"}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-sm text-zinc-300 font-medium block mb-1">Weight</label>
                <input
                  value={profile.weight}
                  onChange={(e) => set("weight", e.target.value)}
                  placeholder="175 lbs or 80 kg"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Medical Info */}
          <div>
            <h2 className="text-sm font-semibold text-red-500 uppercase tracking-widest mb-4">
              Medical Information
            </h2>
            <div className="space-y-4">
              <TagInput
                label="Allergies"
                tags={profile.allergies}
                onAdd={(v) => addTag("allergies", v)}
                onRemove={(i) => removeTag("allergies", i)}
                placeholder="e.g. Penicillin, Peanuts"
              />
              <TagInput
                label="Medical Conditions"
                tags={profile.conditions}
                onAdd={(v) => addTag("conditions", v)}
                onRemove={(i) => removeTag("conditions", i)}
                placeholder="e.g. Hypertension, Diabetes"
              />
              <TagInput
                label="Current Medications"
                tags={profile.medications}
                onAdd={(v) => addTag("medications", v)}
                onRemove={(i) => removeTag("medications", i)}
                placeholder="e.g. Metformin 500mg, Lisinopril"
              />
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-4 rounded-xl text-lg transition-all"
          >
            {saving ? "Saving..." : "Complete Setup & Go to Dashboard"}
            {!saving && <ChevronRight className="w-5 h-5" />}
          </button>

          <p className="text-center text-xs text-zinc-600">
            You can update this profile anytime in Settings.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
