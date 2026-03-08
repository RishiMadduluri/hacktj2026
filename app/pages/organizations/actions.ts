"use server";

import { createClient } from "@/lib/supabase/server";

export async function createOrganization(name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: org, error } = await supabase
    .from("organizations")
    .insert({ name, created_by: user.id })
    .select("id, invite_code")
    .single();

  if (error) throw new Error(error.message);

  // Add creator as admin member
  const { error: memberError } = await supabase
    .from("org_members")
    .insert({ org_id: org.id, user_id: user.id, role: "admin" });

  if (memberError) throw new Error(memberError.message);

  return { orgId: org.id, inviteCode: org.invite_code };
}

export async function joinOrganization(code: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id")
    .eq("invite_code", code.toUpperCase().trim())
    .single();

  if (orgError || !org) throw new Error("Invalid invite code");

  const { error } = await supabase
    .from("org_members")
    .insert({ org_id: org.id, user_id: user.id, role: "member" });

  if (error) {
    if (error.code === "23505") throw new Error("You're already a member of this organization");
    throw new Error(error.message);
  }

  return { orgId: org.id };
}

export async function leaveOrganization(orgId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("org_members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}

export async function toggleCameraSharing(orgId: string, enabled: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("org_members")
    .update({ camera_enabled: enabled })
    .eq("org_id", orgId)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);
}
