-- FIX: Remove recursive policies and replace with non-recursive ones

-- Helper function that bypasses RLS to get user's org IDs
CREATE OR REPLACE FUNCTION get_user_org_ids(uid uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT org_id FROM org_members WHERE user_id = uid;
$$;

-- Helper function to get all peer user IDs (users in same orgs)
CREATE OR REPLACE FUNCTION get_org_peer_ids(uid uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT om2.user_id
  FROM org_members om1
  JOIN org_members om2 ON om1.org_id = om2.org_id
  WHERE om1.user_id = uid;
$$;

-- Drop the recursive policies
DROP POLICY IF EXISTS "Members can read org members" ON org_members;
DROP POLICY IF EXISTS "Org members can read peer profiles" ON profiles;
DROP POLICY IF EXISTS "Org members can read peer contacts" ON emergency_contacts;
DROP POLICY IF EXISTS "Org members can read peer incidents" ON incidents;

-- Recreate with non-recursive versions
CREATE POLICY "Members can read org members" ON org_members
  FOR SELECT USING (
    org_id IN (SELECT get_user_org_ids(auth.uid()))
  );

CREATE POLICY "Org members can read peer profiles" ON profiles
  FOR SELECT USING (
    id IN (SELECT get_org_peer_ids(auth.uid()))
  );

CREATE POLICY "Org members can read peer contacts" ON emergency_contacts
  FOR SELECT USING (
    user_id IN (SELECT get_org_peer_ids(auth.uid()))
  );

CREATE POLICY "Org members can read peer incidents" ON incidents
  FOR SELECT USING (
    user_id IN (SELECT get_org_peer_ids(auth.uid()))
  );
