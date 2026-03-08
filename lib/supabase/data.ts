import type { SupabaseClient } from "@supabase/supabase-js";
import type { MedicalProfile, EmergencyContact, Incident } from "@/types/medical";

// --- Profiles ---

export async function getProfile(supabase: SupabaseClient, userId: string): Promise<MedicalProfile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (!data) return null;
  return {
    name: data.name,
    age: data.age,
    dob: data.dob,
    height: data.height,
    weight: data.weight,
    bloodType: data.blood_type,
    allergies: data.allergies || [],
    conditions: data.conditions || [],
    medications: data.medications || [],
  };
}

export async function upsertProfile(supabase: SupabaseClient, userId: string, profile: MedicalProfile) {
  const { error } = await supabase.from("profiles").upsert({
    id: userId,
    name: profile.name,
    age: profile.age,
    dob: profile.dob,
    height: profile.height,
    weight: profile.weight,
    blood_type: profile.bloodType,
    allergies: profile.allergies,
    conditions: profile.conditions,
    medications: profile.medications,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

// --- Emergency Contacts ---

export async function getContacts(supabase: SupabaseClient, userId: string): Promise<EmergencyContact[]> {
  const { data } = await supabase
    .from("emergency_contacts")
    .select("*")
    .eq("user_id", userId)
    .order("priority", { ascending: true });

  return (data || []).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email || "",
    relationship: c.relationship || "",
    priority: c.priority,
  }));
}

export async function upsertContact(supabase: SupabaseClient, userId: string, contact: Omit<EmergencyContact, "id"> & { id?: string }) {
  const { error } = await supabase.from("emergency_contacts").upsert({
    ...(contact.id ? { id: contact.id } : {}),
    user_id: userId,
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
    relationship: contact.relationship,
    priority: contact.priority,
  });
  if (error) throw error;
}

export async function addContact(supabase: SupabaseClient, userId: string, contact: Omit<EmergencyContact, "id">) {
  const { data, error } = await supabase.from("emergency_contacts").insert({
    user_id: userId,
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
    relationship: contact.relationship,
    priority: contact.priority,
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteContact(supabase: SupabaseClient, contactId: string) {
  const { error } = await supabase
    .from("emergency_contacts")
    .delete()
    .eq("id", contactId);
  if (error) throw error;
}

// --- Incidents ---

export async function getIncidents(supabase: SupabaseClient, userId: string): Promise<Incident[]> {
  const { data } = await supabase
    .from("incidents")
    .select("*")
    .eq("user_id", userId)
    .order("timestamp", { ascending: true });

  return (data || []).map((i) => ({
    id: i.id,
    type: i.type as Incident["type"],
    severity: i.severity as Incident["severity"],
    description: i.description || "",
    timestamp: i.timestamp,
    audioUrl: i.audio_url,
    duration: i.duration,
    isConfirmed: i.is_confirmed,
  }));
}

export async function createIncident(supabase: SupabaseClient, userId: string, incident: Omit<Incident, "id">) {
  const { data, error } = await supabase.from("incidents").insert({
    user_id: userId,
    type: incident.type,
    severity: incident.severity,
    description: incident.description,
    timestamp: incident.timestamp,
    audio_url: incident.audioUrl,
    duration: incident.duration,
    is_confirmed: incident.isConfirmed,
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function updateIncident(supabase: SupabaseClient, incidentId: string, updates: Partial<{ audioUrl: string; duration: number; isConfirmed: boolean }>) {
  const mapped: Record<string, unknown> = {};
  if (updates.audioUrl !== undefined) mapped.audio_url = updates.audioUrl;
  if (updates.duration !== undefined) mapped.duration = updates.duration;
  if (updates.isConfirmed !== undefined) mapped.is_confirmed = updates.isConfirmed;

  const { error } = await supabase
    .from("incidents")
    .update(mapped)
    .eq("id", incidentId);
  if (error) throw error;
}

export async function deleteIncident(supabase: SupabaseClient, incidentId: string) {
  const { error } = await supabase
    .from("incidents")
    .delete()
    .eq("id", incidentId);
  if (error) throw error;
}

export async function deleteAllIncidents(supabase: SupabaseClient, userId: string) {
  const { error } = await supabase
    .from("incidents")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
}

// --- Organizations ---

export async function getUserOrgs(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("org_members")
    .select("org_id, role, camera_enabled, organizations(id, name, invite_code, created_by)")
    .eq("user_id", userId);

  return (data || []).map((m: any) => ({
    orgId: m.organizations.id as string,
    name: m.organizations.name as string,
    inviteCode: m.organizations.invite_code as string,
    createdBy: m.organizations.created_by as string,
    role: m.role as string,
    cameraEnabled: m.camera_enabled as boolean,
  }));
}

export async function getUserOrgMembership(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
) {
  const { data } = await supabase
    .from("org_members")
    .select("org_id, role, camera_enabled, organizations(id, name, invite_code, created_by)")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .single();

  if (!data) {
    return null;
  }

  const organization = Array.isArray(data.organizations)
    ? data.organizations[0]
    : data.organizations;

  if (!organization) {
    return null;
  }

  return {
    orgId: organization.id as string,
    name: organization.name as string,
    inviteCode: organization.invite_code as string,
    createdBy: organization.created_by as string,
    role: data.role as string,
    cameraEnabled: data.camera_enabled as boolean,
  };
}

export async function getOrgMembers(supabase: SupabaseClient, orgId: string) {
  const { data: members, error } = await supabase
    .from("org_members")
    .select("user_id, role, camera_enabled")
    .eq("org_id", orgId);

  if (error) {
    throw error;
  }

  const memberIds = (members || []).map((member) => member.user_id as string);
  let profilesById = new Map<
    string,
    {
      name: string;
      age: number;
      bloodType: string;
      allergies: string[];
      conditions: string[];
      medications: string[];
    }
  >();

  if (memberIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name, age, blood_type, allergies, conditions, medications")
      .in("id", memberIds);

    if (profilesError) {
      throw profilesError;
    }

    profilesById = new Map(
      (profiles || []).map((profile) => [
        profile.id as string,
        {
          name: profile.name as string,
          age: profile.age as number,
          bloodType: profile.blood_type as string,
          allergies: (profile.allergies || []) as string[],
          conditions: (profile.conditions || []) as string[],
          medications: (profile.medications || []) as string[],
        },
      ]),
    );
  }

  return (members || []).map((member) => ({
    userId: member.user_id as string,
    role: member.role as string,
    cameraEnabled: member.camera_enabled as boolean,
    profile: profilesById.get(member.user_id as string) || null,
  }));
}

export async function getOrgMemberCount(supabase: SupabaseClient, orgId: string): Promise<number> {
  const { count } = await supabase
    .from("org_members")
    .select("*", { count: "exact", head: true })
    .eq("org_id", orgId);
  return count || 0;
}

export async function getUserOrgsWithCameraEnabled(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("org_members")
    .select("org_id, organizations(id, name)")
    .eq("user_id", userId)
    .eq("camera_enabled", true);

  return (data || []).map((m: any) => ({
    orgId: m.organizations.id as string,
    name: m.organizations.name as string,
  }));
}
