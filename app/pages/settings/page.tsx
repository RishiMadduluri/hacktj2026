"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Phone,
  Settings,
  Plus,
  Trash2,
  X,
  Save,
  GripVertical,
  Bell,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Volume2,
  Shield,
  Heart,
  Pill,
} from "lucide-react";
import type { MedicalProfile, EmergencyContact } from "@/types/medical";
import { createClient } from "@/lib/supabase/client";
import { getProfile, upsertProfile, getContacts, addContact as addContactDb, deleteContact as deleteContactDb } from "@/lib/supabase/data";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];
const TABS = [
  { id: "profile", label: "Medical Profile", icon: User },
  { id: "contacts", label: "Emergency Contacts", icon: Phone },
  { id: "preferences", label: "Preferences", icon: Settings },
];

function TagInput({
  label,
  tags,
  onAdd,
  onRemove,
  placeholder,
  icon: Icon,
}: {
  label: string;
  tags: string[];
  onAdd: (v: string) => void;
  onRemove: (i: number) => void;
  placeholder: string;
  icon?: React.ElementType;
}) {
  const [value, setValue] = useState("");
  const handleAdd = () => {
    const t = value.trim();
    if (t && !tags.includes(t)) { onAdd(t); setValue(""); }
  };
  return (
    <div className="space-y-2">
      <label className="text-sm text-zinc-300 font-medium flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-zinc-500" />}
        {label}
      </label>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
          placeholder={placeholder}
          className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-red-600/50 transition-colors"
        />
        <button type="button" onClick={handleAdd} className="p-2 rounded-xl bg-red-900/20 border border-red-800/40 text-red-400 hover:bg-red-900/30 transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, i) => (
            <span key={i} className="flex items-center gap-1 px-2.5 py-1 bg-red-950/20 border border-red-900/30 rounded-full text-xs text-red-300">
              {tag}
              <button type="button" onClick={() => onRemove(i)} className="hover:text-white transition-colors"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState<MedicalProfile>({
    name: "", age: 0, dob: "", height: "", weight: "", bloodType: "Unknown",
    allergies: [], conditions: [], medications: [],
  });

  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [newContact, setNewContact] = useState<Omit<EmergencyContact, "id" | "priority">>({
    name: "", phone: "", email: "", relationship: "",
  });
  const [showAddContact, setShowAddContact] = useState(false);
  const [testAlertLoading, setTestAlertLoading] = useState(false);
  const [testAlertResult, setTestAlertResult] = useState<{ success: boolean; message: string } | null>(null);

  const [verbalCheckIn, setVerbalCheckIn] = useState(true);
  const [callEMS, setCallEMS] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const p = await getProfile(supabase, user.id);
      if (p) setProfile(p);

      const c = await getContacts(supabase, user.id);
      setContacts(c);

      const vc = localStorage.getItem("firstwatch_verbal_checkin");
      if (vc !== null) setVerbalCheckIn(vc === "true");
      const ems = localStorage.getItem("firstwatch_call_ems");
      if (ems !== null) setCallEMS(ems === "true");
    };
    loadData();
  }, []);

  const setField = (key: keyof MedicalProfile, value: string | number | string[]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const addTag = (key: "allergies" | "conditions" | "medications", val: string) =>
    setField(key, [...profile[key], val]);

  const removeTag = (key: "allergies" | "conditions" | "medications", i: number) =>
    setField(key, profile[key].filter((_, idx) => idx !== i));

  const handleSaveProfile = async () => {
    if (!userId) return;
    const supabase = createClient();
    await upsertProfile(supabase, userId, profile);
    localStorage.setItem("firstwatch_profile", JSON.stringify(profile));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddContact = async () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      alert("Name and phone are required.");
      return;
    }
    if (!userId) return;
    const supabase = createClient();
    const contactData = { ...newContact, priority: contacts.length + 1, notifyCall: true };
    const newId = await addContactDb(supabase, userId, contactData);
    const contact: EmergencyContact = { ...contactData, id: newId };
    const updated = [...contacts, contact];
    setContacts(updated);
    localStorage.setItem("firstwatch_contacts", JSON.stringify(updated));
    setNewContact({ name: "", phone: "", email: "", relationship: "" });
    setShowAddContact(false);
  };

  const handleToggleContactPref = (id: string, pref: "notifyCall") => {
    const updated = contacts.map((c) =>
      c.id === id ? { ...c, [pref]: c[pref] === false ? true : !(c[pref] ?? true) } : c
    );
    setContacts(updated);
    localStorage.setItem("firstwatch_contacts", JSON.stringify(updated));
  };

  const handleDeleteContact = async (id: string) => {
    const supabase = createClient();
    await deleteContactDb(supabase, id);
    const updated = contacts.filter((c) => c.id !== id).map((c, i) => ({ ...c, priority: i + 1 }));
    setContacts(updated);
    localStorage.setItem("firstwatch_contacts", JSON.stringify(updated));
  };

  const handleSavePreferences = () => {
    localStorage.setItem("firstwatch_verbal_checkin", String(verbalCheckIn));
    localStorage.setItem("firstwatch_call_ems", String(callEMS));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputClass = "w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-3 py-2.5 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-red-600/50 transition-colors";

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
          <p className="text-zinc-500 text-sm">Manage your medical profile and preferences</p>
        </div>
        {saved && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 bg-green-900/20 border border-green-700/30 px-4 py-2 rounded-xl text-green-400 text-sm"
          >
            <CheckCircle className="w-4 h-4" /> Saved!
          </motion.div>
        )}
      </div>

      {/* Tabs — underline style */}
      <div className="flex gap-0 border-b border-[#1A1A1A]">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all ${activeTab === id
                ? "text-red-400"
                : "text-zinc-500 hover:text-zinc-300"
              }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
            {activeTab === id && (
              <motion.div
                layoutId="settings-tab-underline"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 to-red-800"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Medical Profile Tab */}
      {activeTab === "profile" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-[#111] border border-[#1F1F1F] rounded-2xl p-6 space-y-6 accent-stripe overflow-hidden">
            <div>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> Basic Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-zinc-300 font-medium block mb-1.5">Full Name</label>
                  <input value={profile.name} onChange={(e) => setField("name", e.target.value)} placeholder="Robert Johnson" className={inputClass} />
                </div>
                <div>
                  <label className="text-sm text-zinc-300 font-medium block mb-1.5">Age</label>
                  <input type="number" value={profile.age || ""} onChange={(e) => setField("age", parseInt(e.target.value) || 0)} placeholder="72" className={inputClass} />
                </div>
                <div>
                  <label className="text-sm text-zinc-300 font-medium block mb-1.5">Date of Birth</label>
                  <input type="date" value={profile.dob} onChange={(e) => setField("dob", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-sm text-zinc-300 font-medium block mb-1.5">Blood Type</label>
                  <select value={profile.bloodType} onChange={(e) => setField("bloodType", e.target.value)} className={inputClass}>
                    {BLOOD_TYPES.map((bt) => <option key={bt} value={bt}>{bt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-zinc-300 font-medium block mb-1.5">Height</label>
                  <input value={profile.height} onChange={(e) => setField("height", e.target.value)} placeholder={"5'10\" or 178cm"} className={inputClass} />
                </div>
                <div>
                  <label className="text-sm text-zinc-300 font-medium block mb-1.5">Weight</label>
                  <input value={profile.weight} onChange={(e) => setField("weight", e.target.value)} placeholder="175 lbs or 80 kg" className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#111] border border-[#1F1F1F] rounded-2xl p-6 space-y-6 accent-stripe overflow-hidden">
            <div>
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Heart className="w-3.5 h-3.5" /> Medical Information
              </h2>
              <div className="space-y-5">
                <TagInput label="Allergies" icon={AlertTriangle} tags={profile.allergies} onAdd={(v) => addTag("allergies", v)} onRemove={(i) => removeTag("allergies", i)} placeholder="e.g. Penicillin" />
                <TagInput label="Medical Conditions" icon={Shield} tags={profile.conditions} onAdd={(v) => addTag("conditions", v)} onRemove={(i) => removeTag("conditions", i)} placeholder="e.g. Hypertension" />
                <TagInput label="Current Medications" icon={Pill} tags={profile.medications} onAdd={(v) => addTag("medications", v)} onRemove={(i) => removeTag("medications", i)} placeholder="e.g. Metformin 500mg" />
              </div>
            </div>
          </div>

          <button onClick={handleSaveProfile} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-2xl transition-colors shadow-lg shadow-red-900/10">
            <Save className="w-4 h-4" /> Save Medical Profile
          </button>
        </motion.div>
      )}

      {/* Emergency Contacts Tab */}
      {activeTab === "contacts" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-[#111] border border-[#1F1F1F] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-white">Emergency Contacts</h2>
                <p className="text-xs text-zinc-600 mt-0.5">Contacts are notified in priority order during an emergency</p>
              </div>
              <button
                onClick={() => setShowAddContact((p) => !p)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Contact
              </button>
            </div>

            {showAddContact && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="mb-4 p-4 bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl space-y-3"
              >
                <h3 className="text-sm font-medium text-zinc-300">New Contact</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Name *</label>
                    <input value={newContact.name} onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))} placeholder="Jane Johnson" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Phone *</label>
                    <input value={newContact.phone} onChange={(e) => setNewContact((p) => ({ ...p, phone: e.target.value }))} placeholder="+1 (555) 000-0000" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Email</label>
                    <input value={newContact.email} onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))} placeholder="jane@example.com" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Relationship</label>
                    <input value={newContact.relationship} onChange={(e) => setNewContact((p) => ({ ...p, relationship: e.target.value }))} placeholder="Daughter, Neighbor, etc." className={inputClass} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddContact} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors">
                    Add Contact
                  </button>
                  <button onClick={() => setShowAddContact(false)} className="px-4 py-2 bg-[#1A1A1A] hover:bg-[#222] text-zinc-300 rounded-xl text-sm transition-colors">
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {contacts.length === 0 ? (
              <div className="text-center py-10">
                <Phone className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm font-medium">No emergency contacts added yet</p>
                <p className="text-zinc-700 text-xs mt-1">Add contacts who should be notified during an emergency</p>
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <div key={contact.id} className="flex items-center gap-3 p-3 bg-[#0D0D0D] rounded-xl hover:bg-[#141414] transition-colors">
                    <GripVertical className="w-4 h-4 text-zinc-800 flex-shrink-0" />
                    <div className="w-7 h-7 rounded-full bg-red-950/50 flex items-center justify-center text-xs font-bold text-red-400 border border-red-900/30 flex-shrink-0">
                      {contact.priority}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm">{contact.name}</div>
                      <div className="text-xs text-zinc-500">{contact.relationship} · {contact.phone}</div>
                      {contact.email && <div className="text-xs text-zinc-600">{contact.email}</div>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggleContactPref(contact.id, "notifyCall")}
                        title={contact.notifyCall !== false ? "Call enabled" : "Call disabled"}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${contact.notifyCall !== false
                            ? "bg-green-950/20 border-green-900/30 text-green-400"
                            : "bg-zinc-900/30 border-zinc-800/30 text-zinc-600"
                          }`}
                      >
                        Call
                      </button>
                    </div>
                    <button onClick={() => handleDeleteContact(contact.id)} className="p-1.5 rounded-lg hover:bg-red-950/30 text-zinc-700 hover:text-red-400 transition-colors flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Test Alert */}
          <div className="bg-[#111] border border-[#1F1F1F] rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-red-600/10 flex-shrink-0">
                <Bell className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Test Emergency Notification</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Send a test alert to all contacts to verify notifications work correctly.
                </p>
                {testAlertResult && (
                  <div className={`mt-3 flex items-center gap-2 text-xs p-2.5 rounded-xl border ${testAlertResult.success
                    ? "bg-green-950/20 border-green-900/30 text-green-400"
                    : "bg-red-950/20 border-red-900/30 text-red-400"
                    }`}>
                    {testAlertResult.success ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    {testAlertResult.message}
                  </div>
                )}
                <button
                  onClick={async () => {
                    if (contacts.length === 0) {
                      setTestAlertResult({ success: false, message: "Add emergency contacts first" });
                      return;
                    }
                    setTestAlertLoading(true);
                    setTestAlertResult(null);
                    try {
                      const res = await fetch("/api/notify-contacts", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          incident: {
                            type: "TEST",
                            severity: "LOW",
                            description: "This is a test alert from FirstWatch. No emergency detected.",
                            timestamp: new Date().toISOString(),
                          },
                          contacts,
                          profile,
                          isTest: true,
                        }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        const callCount = data.results.filter((r: any) => r.callMade).length;
                        setTestAlertResult({
                          success: true,
                          message: data.twilioEnabled
                            ? `Test sent! ${callCount} call(s) delivered`
                            : `Test sent! (Twilio disabled — add credentials to enable calls)`,
                        });
                      } else {
                        setTestAlertResult({ success: false, message: data.error || "Failed to send" });
                      }
                    } catch {
                      setTestAlertResult({ success: false, message: "Network error" });
                    } finally {
                      setTestAlertLoading(false);
                    }
                  }}
                  disabled={testAlertLoading}
                  className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {testAlertLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                  {testAlertLoading ? "Sending..." : "Send Test Alert"}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Preferences Tab */}
      {activeTab === "preferences" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="bg-[#111] border border-[#1F1F1F] rounded-2xl p-6 space-y-4 accent-stripe overflow-hidden">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Volume2 className="w-3.5 h-3.5" /> Alert Settings
            </h2>

            <div className="flex items-start justify-between gap-4 p-4 bg-[#0D0D0D] rounded-xl">
              <div>
                <div className="font-medium text-white text-sm">Verbal Check-in on Alert</div>
                <div className="text-xs text-zinc-600 mt-0.5">
                  When an emergency is detected, FirstWatch will speak aloud to check if the person is responsive.
                </div>
              </div>
              <button
                onClick={() => setVerbalCheckIn((p) => !p)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${verbalCheckIn ? "bg-red-600" : "bg-zinc-700"}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5`}
                  style={{ transform: verbalCheckIn ? "translateX(22px)" : "translateX(2px)" }}
                />
              </button>
            </div>

            <div className="flex items-start gap-3 p-4 bg-[#0D0D0D] rounded-xl">
              <div className="flex-1">
                <div className="font-medium text-white text-sm">Detection Sensitivity</div>
                <div className="text-xs text-zinc-600 mt-0.5">
                  Always set to HIGH for maximum safety. Any detected dangerous event triggers immediate action.
                </div>
              </div>
              <span className="px-2.5 py-1 bg-red-950/30 border border-red-800/40 rounded-full text-red-400 text-xs font-bold flex-shrink-0">HIGH</span>
            </div>

            <div className="flex items-start gap-3 p-4 bg-[#0D0D0D] rounded-xl">
              <div className="flex-1">
                <div className="font-medium text-white text-sm">Emergency Audio Recording</div>
                <div className="text-xs text-zinc-600 mt-0.5">
                  When an emergency is detected, audio is automatically recorded for up to 60 seconds and saved with the incident.
                </div>
              </div>
              <span className="px-2.5 py-1 bg-green-950/30 border border-green-800/40 rounded-full text-green-400 text-xs font-bold flex-shrink-0">ON</span>
            </div>

            <div className="flex items-start justify-between gap-4 p-4 bg-[#0D0D0D] rounded-xl">
              <div>
                <div className="font-medium text-white text-sm">EMS Auto-Call</div>
                <div className="text-xs text-zinc-600 mt-0.5">
                  Automatically calls EMS with patient details and incident report when an emergency is detected. Set the EMS phone number in your environment configuration.
                </div>
              </div>
              <button
                onClick={() => setCallEMS((p) => !p)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors ${callEMS ? "bg-red-600" : "bg-zinc-700"}`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform mt-0.5`}
                  style={{ transform: callEMS ? "translateX(22px)" : "translateX(2px)" }}
                />
              </button>
            </div>
          </div>

          <button onClick={handleSavePreferences} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-2xl transition-colors shadow-lg shadow-red-900/10">
            <Save className="w-4 h-4" /> Save Preferences
          </button>
        </motion.div>
      )}
    </div>
  );
}
