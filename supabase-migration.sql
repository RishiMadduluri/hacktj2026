-- Run this in your Supabase SQL Editor: https://cgcomrxkcxnuzjpuwmpg.supabase.co

-- Helper function to generate 6-char invite codes
CREATE OR REPLACE FUNCTION generate_invite_code() RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  age int DEFAULT 0,
  dob text DEFAULT '',
  height text DEFAULT '',
  weight text DEFAULT '',
  blood_type text DEFAULT 'Unknown',
  allergies text[] DEFAULT '{}',
  conditions text[] DEFAULT '{}',
  medications text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can upsert own profile" ON profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Emergency contacts table
CREATE TABLE emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  email text DEFAULT '',
  relationship text DEFAULT '',
  priority int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own contacts" ON emergency_contacts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Organizations table
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text UNIQUE NOT NULL DEFAULT generate_invite_code(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Org members table
CREATE TABLE org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  camera_enabled boolean DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(org_id, user_id)
);

ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- Incidents table
CREATE TABLE incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  severity text NOT NULL,
  description text DEFAULT '',
  timestamp timestamptz DEFAULT now(),
  audio_url text,
  duration int,
  is_confirmed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own incidents" ON incidents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Organization RLS policies
CREATE POLICY "Anyone can read orgs" ON organizations
  FOR SELECT USING (true);

CREATE POLICY "Creator can manage org" ON organizations
  FOR ALL USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

-- Org members policies
CREATE POLICY "Members can read org members" ON org_members
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM org_members AS om WHERE om.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own membership" ON org_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own membership" ON org_members
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own membership" ON org_members
  FOR DELETE USING (auth.uid() = user_id);

-- Org members can read each other's profiles
CREATE POLICY "Org members can read peer profiles" ON profiles
  FOR SELECT USING (
    id IN (
      SELECT om2.user_id FROM org_members om1
      JOIN org_members om2 ON om1.org_id = om2.org_id
      WHERE om1.user_id = auth.uid()
    )
  );

-- Org members can read each other's contacts
CREATE POLICY "Org members can read peer contacts" ON emergency_contacts
  FOR SELECT USING (
    user_id IN (
      SELECT om2.user_id FROM org_members om1
      JOIN org_members om2 ON om1.org_id = om2.org_id
      WHERE om1.user_id = auth.uid()
    )
  );

-- Org members can read each other's incidents
CREATE POLICY "Org members can read peer incidents" ON incidents
  FOR SELECT USING (
    user_id IN (
      SELECT om2.user_id FROM org_members om1
      JOIN org_members om2 ON om1.org_id = om2.org_id
      WHERE om1.user_id = auth.uid()
    )
  );
