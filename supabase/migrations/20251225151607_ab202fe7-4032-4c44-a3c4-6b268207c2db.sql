-- ================================================
-- STEP 3: Create helper functions for multi-tenant RLS
-- ================================================

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = 'SUPER_ADMIN'
  );
$$;

-- Helper function to get user's agency IDs
CREATE OR REPLACE FUNCTION public.get_user_agency_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT agency_id
  FROM public.agency_members
  WHERE user_id = _user_id;
$$;

-- Helper function to check if user is agency owner
CREATE OR REPLACE FUNCTION public.is_agency_owner(_user_id uuid, _agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agency_members
    WHERE user_id = _user_id
    AND agency_id = _agency_id
    AND role = 'AGENCY_OWNER'
  );
$$;

-- Helper function to check agency membership
CREATE OR REPLACE FUNCTION public.is_agency_member(_user_id uuid, _agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.agency_members
    WHERE user_id = _user_id
    AND agency_id = _agency_id
  );
$$;

-- Helper function to check agency creator limit
CREATE OR REPLACE FUNCTION public.check_agency_creator_limit(_agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT COUNT(*) FROM public.agency_members WHERE agency_id = _agency_id AND role = 'CREATOR'
  ) < (
    SELECT max_creators FROM public.agencies WHERE id = _agency_id
  );
$$;

-- ================================================
-- RLS POLICIES FOR AGENCIES TABLE
-- ================================================

-- Super admins can do everything
CREATE POLICY "Super admins can manage all agencies"
ON public.agencies FOR ALL
USING (public.is_super_admin(auth.uid()));

-- Users can view their own agencies
CREATE POLICY "Members can view their agencies"
ON public.agencies FOR SELECT
USING (id IN (SELECT public.get_user_agency_ids(auth.uid())));

-- Agency owners can update their agency
CREATE POLICY "Agency owners can update their agency"
ON public.agencies FOR UPDATE
USING (public.is_agency_owner(auth.uid(), id));

-- Anyone authenticated can create an agency (for new signups)
CREATE POLICY "Authenticated users can create agency"
ON public.agencies FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- ================================================
-- RLS POLICIES FOR AGENCY_MEMBERS TABLE
-- ================================================

-- Super admins can manage all members
CREATE POLICY "Super admins can manage all members"
ON public.agency_members FOR ALL
USING (public.is_super_admin(auth.uid()));

-- Agency members can view other members in their agency
CREATE POLICY "Members can view agency members"
ON public.agency_members FOR SELECT
USING (agency_id IN (SELECT public.get_user_agency_ids(auth.uid())));

-- Agency owners can manage members in their agency
CREATE POLICY "Agency owners can manage members"
ON public.agency_members FOR ALL
USING (public.is_agency_owner(auth.uid(), agency_id));

-- Allow self-insert for joining via invitation
CREATE POLICY "Allow self-insert for invitations"
ON public.agency_members FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ================================================
-- RLS POLICIES FOR AGENCY_INVITATIONS TABLE
-- ================================================

-- Super admins can manage all invitations
CREATE POLICY "Super admins can manage invitations"
ON public.agency_invitations FOR ALL
USING (public.is_super_admin(auth.uid()));

-- Agency owners can manage invitations for their agency
CREATE POLICY "Agency owners can manage invitations"
ON public.agency_invitations FOR ALL
USING (public.is_agency_owner(auth.uid(), agency_id));

-- Anyone can view invitation by token (for joining - needed for signup flow)
CREATE POLICY "Anyone can view invitations"
ON public.agency_invitations FOR SELECT
USING (true);