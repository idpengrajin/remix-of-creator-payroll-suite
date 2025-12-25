-- ============================================
-- COMPREHENSIVE SECURITY FIX MIGRATION
-- ============================================

-- ============================================
-- 1. UPDATE TRIGGER PENDAFTARAN AGENSI (Already exists, but let's ensure it's correct)
-- ============================================

-- Drop and recreate with improved logic
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _agency_id uuid;
  _agency_name text;
  _agency_slug text;
  _invitation_token text;
  _invitation_data record;
  _user_name text;
  _user_role app_role := 'CREATOR';
  _user_status user_status;
BEGIN
  -- Get user metadata
  _user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  _invitation_token := NEW.raw_user_meta_data->>'invitation_token';
  
  -- ============================================
  -- JALUR 1: Agency Owner Signup
  -- ============================================
  IF COALESCE((NEW.raw_user_meta_data->>'is_agency_owner')::boolean, false) = true THEN
    _agency_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'agency_name'), ''), 'My Agency');
    _agency_slug := lower(regexp_replace(_agency_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8);
    
    -- Create new agency
    INSERT INTO public.agencies (name, slug, owner_id, subscription_plan, subscription_status, max_creators)
    VALUES (_agency_name, _agency_slug, NEW.id, 'FREE'::subscription_plan, 'ACTIVE'::agency_status, 5)
    RETURNING id INTO _agency_id;
    
    _user_role := 'AGENCY_OWNER'::app_role;
    _user_status := 'ACTIVE'::user_status;
    
    -- Create default aturan_komisi for new agency
    INSERT INTO public.aturan_komisi (agency_id, nama_aturan, slabs)
    VALUES (_agency_id, 'Aturan Default', '[{"max": 5000000, "min": 0, "rate": 0.00}, {"max": 20000000, "min": 5000000, "rate": 0.20}, {"max": 100000000, "min": 20000000, "rate": 0.30}, {"max": 9000000000000000, "min": 100000000, "rate": 0.40}]'::jsonb);
    
    -- Create default aturan_payroll for new agency
    INSERT INTO public.aturan_payroll (agency_id)
    VALUES (_agency_id);
    
  -- ============================================
  -- JALUR 2: Invitation Signup (Staff/Creator)
  -- ============================================
  ELSIF _invitation_token IS NOT NULL AND _invitation_token != '' THEN
    -- Find and validate invitation
    SELECT ai.agency_id, ai.role, ai.id
    INTO _invitation_data
    FROM public.agency_invitations ai
    WHERE ai.token = _invitation_token
      AND ai.used_at IS NULL
      AND ai.expires_at > now()
    LIMIT 1;
    
    IF _invitation_data.agency_id IS NOT NULL THEN
      _agency_id := _invitation_data.agency_id;
      _user_role := _invitation_data.role;
      _user_status := 'ACTIVE'::user_status;
      
      -- Mark invitation as used
      UPDATE public.agency_invitations
      SET used_at = now()
      WHERE id = _invitation_data.id;
    ELSE
      -- Invalid/expired invitation - block access
      _agency_id := NULL;
      _user_status := 'PENDING_APPROVAL'::user_status;
    END IF;
  ELSE
    -- No agency context - pending approval
    _agency_id := NULL;
    _user_status := 'PENDING_APPROVAL'::user_status;
  END IF;
  
  -- Create profile
  INSERT INTO public.profiles (id, email, name, role, status, agency_id)
  VALUES (
    NEW.id,
    NEW.email,
    _user_name,
    _user_role,
    _user_status,
    _agency_id
  );
  
  -- Create user role entry
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _user_role);
  
  -- Add to agency_members if agency exists
  IF _agency_id IS NOT NULL THEN
    INSERT INTO public.agency_members (agency_id, user_id, role)
    VALUES (_agency_id, NEW.id, _user_role);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. FIX RLS POLICIES - Require agency_members membership
-- ============================================

-- PENJUALAN_HARIAN - Drop old and create strict policies
DROP POLICY IF EXISTS "Members can view agency sales" ON public.penjualan_harian;
DROP POLICY IF EXISTS "Users can insert own sales in their agency" ON public.penjualan_harian;
DROP POLICY IF EXISTS "Users can update own sales" ON public.penjualan_harian;
DROP POLICY IF EXISTS "Agency owners can manage all agency sales" ON public.penjualan_harian;
DROP POLICY IF EXISTS "Super admins can manage all sales" ON public.penjualan_harian;

CREATE POLICY "Agency members can view agency sales"
ON public.penjualan_harian FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = penjualan_harian.agency_id
  )
);

CREATE POLICY "Creators can insert own sales if member"
ON public.penjualan_harian FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = penjualan_harian.agency_id
  )
);

CREATE POLICY "Creators can update own sales if member"
ON public.penjualan_harian FOR UPDATE
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = penjualan_harian.agency_id
  )
);

CREATE POLICY "Agency owners can manage agency sales"
ON public.penjualan_harian FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = penjualan_harian.agency_id
    AND role = 'AGENCY_OWNER'
  )
);

CREATE POLICY "Super admins full access sales"
ON public.penjualan_harian FOR ALL
USING (is_super_admin(auth.uid()));

-- SESI_LIVE - Strict policies
DROP POLICY IF EXISTS "Members can view agency sessions" ON public.sesi_live;
DROP POLICY IF EXISTS "Users can insert own sessions in their agency" ON public.sesi_live;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.sesi_live;
DROP POLICY IF EXISTS "Agency owners can manage all agency sessions" ON public.sesi_live;
DROP POLICY IF EXISTS "Super admins can manage all sessions" ON public.sesi_live;

CREATE POLICY "Agency members can view agency sessions"
ON public.sesi_live FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = sesi_live.agency_id
  )
);

CREATE POLICY "Creators can insert own sessions if member"
ON public.sesi_live FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = sesi_live.agency_id
  )
);

CREATE POLICY "Creators can update own sessions if member"
ON public.sesi_live FOR UPDATE
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = sesi_live.agency_id
  )
);

CREATE POLICY "Agency owners can manage agency sessions"
ON public.sesi_live FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = sesi_live.agency_id
    AND role = 'AGENCY_OWNER'
  )
);

CREATE POLICY "Super admins full access sessions"
ON public.sesi_live FOR ALL
USING (is_super_admin(auth.uid()));

-- PAYOUTS - Strict policies
DROP POLICY IF EXISTS "Members can view agency payouts" ON public.payouts;
DROP POLICY IF EXISTS "Agency owners can manage agency payouts" ON public.payouts;
DROP POLICY IF EXISTS "Super admins can manage all payouts" ON public.payouts;

CREATE POLICY "Agency members can view own payouts"
ON public.payouts FOR SELECT
USING (
  (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = payouts.agency_id
    AND role IN ('AGENCY_OWNER', 'ADMIN', 'INVESTOR')
  ))
  AND EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = payouts.agency_id
  )
);

CREATE POLICY "Agency owners can manage payouts"
ON public.payouts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = payouts.agency_id
    AND role = 'AGENCY_OWNER'
  )
);

CREATE POLICY "Super admins full access payouts"
ON public.payouts FOR ALL
USING (is_super_admin(auth.uid()));

-- CONTENT_LOGS - Strict policies
DROP POLICY IF EXISTS "Members can view agency content logs" ON public.content_logs;
DROP POLICY IF EXISTS "Users can insert own content logs" ON public.content_logs;
DROP POLICY IF EXISTS "Users can update own content logs" ON public.content_logs;
DROP POLICY IF EXISTS "Agency owners can manage agency content logs" ON public.content_logs;
DROP POLICY IF EXISTS "Super admins can manage all content logs" ON public.content_logs;

CREATE POLICY "Agency members can view agency content"
ON public.content_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = content_logs.agency_id
  )
);

CREATE POLICY "Creators can insert own content if member"
ON public.content_logs FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = content_logs.agency_id
  )
);

CREATE POLICY "Creators can update own content if member"
ON public.content_logs FOR UPDATE
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = content_logs.agency_id
  )
);

CREATE POLICY "Agency owners can manage agency content"
ON public.content_logs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = content_logs.agency_id
    AND role = 'AGENCY_OWNER'
  )
);

CREATE POLICY "Super admins full access content"
ON public.content_logs FOR ALL
USING (is_super_admin(auth.uid()));

-- INVENTORY_ITEMS - Strict policies
DROP POLICY IF EXISTS "Members can view agency inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Agency owners can manage agency inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Super admins can manage all inventory" ON public.inventory_items;

CREATE POLICY "Agency members can view agency inventory"
ON public.inventory_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = inventory_items.agency_id
  )
);

CREATE POLICY "Agency owners can manage inventory"
ON public.inventory_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = inventory_items.agency_id
    AND role = 'AGENCY_OWNER'
  )
);

CREATE POLICY "Super admins full access inventory"
ON public.inventory_items FOR ALL
USING (is_super_admin(auth.uid()));

-- INVESTOR_LEDGER - Strict policies
DROP POLICY IF EXISTS "Members can view agency ledger" ON public.investor_ledger;
DROP POLICY IF EXISTS "Agency owners can manage agency ledger" ON public.investor_ledger;
DROP POLICY IF EXISTS "Super admins can manage all ledger" ON public.investor_ledger;

CREATE POLICY "Agency members can view agency ledger"
ON public.investor_ledger FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = investor_ledger.agency_id
  )
);

CREATE POLICY "Agency owners can manage ledger"
ON public.investor_ledger FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = investor_ledger.agency_id
    AND role = 'AGENCY_OWNER'
  )
);

CREATE POLICY "Super admins full access ledger"
ON public.investor_ledger FOR ALL
USING (is_super_admin(auth.uid()));

-- ============================================
-- 3. ENFORCE NOT NULL on agency_id columns
-- ============================================

-- First, create a legacy agency if needed for orphan data
DO $$
DECLARE
  _legacy_agency_id uuid;
BEGIN
  -- Check if legacy agency exists
  SELECT id INTO _legacy_agency_id FROM public.agencies WHERE slug = 'legacy-agency' LIMIT 1;
  
  IF _legacy_agency_id IS NULL THEN
    INSERT INTO public.agencies (name, slug, subscription_plan, subscription_status, max_creators)
    VALUES ('Legacy Agency', 'legacy-agency', 'FREE'::subscription_plan, 'ACTIVE'::agency_status, 1000)
    RETURNING id INTO _legacy_agency_id;
  END IF;
  
  -- Update orphan records to legacy agency
  UPDATE public.penjualan_harian SET agency_id = _legacy_agency_id WHERE agency_id IS NULL;
  UPDATE public.sesi_live SET agency_id = _legacy_agency_id WHERE agency_id IS NULL;
  UPDATE public.payouts SET agency_id = _legacy_agency_id WHERE agency_id IS NULL;
  UPDATE public.content_logs SET agency_id = _legacy_agency_id WHERE agency_id IS NULL;
  UPDATE public.inventory_items SET agency_id = _legacy_agency_id WHERE agency_id IS NULL;
  UPDATE public.investor_ledger SET agency_id = _legacy_agency_id WHERE agency_id IS NULL;
  UPDATE public.aturan_komisi SET agency_id = _legacy_agency_id WHERE agency_id IS NULL;
  UPDATE public.aturan_payroll SET agency_id = _legacy_agency_id WHERE agency_id IS NULL;
END $$;

-- Now set NOT NULL constraints
ALTER TABLE public.penjualan_harian ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.sesi_live ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.payouts ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.content_logs ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.inventory_items ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.investor_ledger ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.aturan_komisi ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE public.aturan_payroll ALTER COLUMN agency_id SET NOT NULL;