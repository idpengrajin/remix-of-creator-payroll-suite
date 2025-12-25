-- ============================================
-- FASE 1: FIX RLS POLICIES & DATABASE INTEGRITY
-- ============================================

-- 1. First, create helper function to check if user is member of agency
CREATE OR REPLACE FUNCTION public.user_has_agency_access(_user_id uuid, _agency_id uuid)
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
  )
$$;

-- 2. Create function to get user's role in a specific agency
CREATE OR REPLACE FUNCTION public.get_user_agency_role(_user_id uuid, _agency_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.agency_members
  WHERE user_id = _user_id
    AND agency_id = _agency_id
  LIMIT 1
$$;

-- ============================================
-- DROP OLD RLS POLICIES AND CREATE NEW ONES
-- ============================================

-- PROFILES TABLE
-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Agency owners can view agency profiles" ON public.profiles;
DROP POLICY IF EXISTS "Agency owners can manage agency profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;

-- Create new policies for profiles
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Agency members can view agency profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members am1
    WHERE am1.user_id = auth.uid()
    AND am1.agency_id IN (
      SELECT am2.agency_id FROM public.agency_members am2
      WHERE am2.user_id = profiles.id
    )
  )
);

CREATE POLICY "Agency owners can manage agency member profiles"
ON public.profiles FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members am
    WHERE am.user_id = auth.uid()
    AND am.role = 'AGENCY_OWNER'
    AND am.agency_id IN (
      SELECT agency_id FROM public.agency_members
      WHERE user_id = profiles.id
    )
  )
);

CREATE POLICY "Super admins can manage all profiles"
ON public.profiles FOR ALL
USING (is_super_admin(auth.uid()));

-- PENJUALAN_HARIAN TABLE
DROP POLICY IF EXISTS "Creators can view their own sales" ON public.penjualan_harian;
DROP POLICY IF EXISTS "Creators can insert their own sales" ON public.penjualan_harian;
DROP POLICY IF EXISTS "Creators can update their own sales" ON public.penjualan_harian;
DROP POLICY IF EXISTS "Agency owners can manage agency sales" ON public.penjualan_harian;
DROP POLICY IF EXISTS "Super admins can manage all sales" ON public.penjualan_harian;

-- New policies using agency_members
CREATE POLICY "Members can view agency sales"
ON public.penjualan_harian FOR SELECT
USING (user_has_agency_access(auth.uid(), agency_id));

CREATE POLICY "Users can insert own sales in their agency"
ON public.penjualan_harian FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND user_has_agency_access(auth.uid(), agency_id)
);

CREATE POLICY "Users can update own sales"
ON public.penjualan_harian FOR UPDATE
USING (
  auth.uid() = user_id
  AND user_has_agency_access(auth.uid(), agency_id)
);

CREATE POLICY "Agency owners can manage all agency sales"
ON public.penjualan_harian FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = penjualan_harian.agency_id
    AND role = 'AGENCY_OWNER'
  )
);

CREATE POLICY "Super admins can manage all sales"
ON public.penjualan_harian FOR ALL
USING (is_super_admin(auth.uid()));

-- SESI_LIVE TABLE
DROP POLICY IF EXISTS "Creators can view their own sessions" ON public.sesi_live;
DROP POLICY IF EXISTS "Creators can insert their own sessions" ON public.sesi_live;
DROP POLICY IF EXISTS "Creators can update their own sessions" ON public.sesi_live;
DROP POLICY IF EXISTS "Agency owners can manage agency sessions" ON public.sesi_live;
DROP POLICY IF EXISTS "Super admins can manage all sessions" ON public.sesi_live;

CREATE POLICY "Members can view agency sessions"
ON public.sesi_live FOR SELECT
USING (user_has_agency_access(auth.uid(), agency_id));

CREATE POLICY "Users can insert own sessions in their agency"
ON public.sesi_live FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND user_has_agency_access(auth.uid(), agency_id)
);

CREATE POLICY "Users can update own sessions"
ON public.sesi_live FOR UPDATE
USING (
  auth.uid() = user_id
  AND user_has_agency_access(auth.uid(), agency_id)
);

CREATE POLICY "Agency owners can manage all agency sessions"
ON public.sesi_live FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = sesi_live.agency_id
    AND role = 'AGENCY_OWNER'
  )
);

CREATE POLICY "Super admins can manage all sessions"
ON public.sesi_live FOR ALL
USING (is_super_admin(auth.uid()));

-- PAYOUTS TABLE
DROP POLICY IF EXISTS "Creators can view their own payouts" ON public.payouts;
DROP POLICY IF EXISTS "Agency owners can manage agency payouts" ON public.payouts;
DROP POLICY IF EXISTS "Super admins can manage all payouts" ON public.payouts;

CREATE POLICY "Members can view agency payouts"
ON public.payouts FOR SELECT
USING (user_has_agency_access(auth.uid(), agency_id));

CREATE POLICY "Agency owners can manage agency payouts"
ON public.payouts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = payouts.agency_id
    AND role = 'AGENCY_OWNER'
  )
);

CREATE POLICY "Super admins can manage all payouts"
ON public.payouts FOR ALL
USING (is_super_admin(auth.uid()));

-- CONTENT_LOGS TABLE
DROP POLICY IF EXISTS "Creators can view their own content logs" ON public.content_logs;
DROP POLICY IF EXISTS "Creators can insert their own content logs" ON public.content_logs;
DROP POLICY IF EXISTS "Agency owners can manage agency content logs" ON public.content_logs;
DROP POLICY IF EXISTS "Super admins can manage all content logs" ON public.content_logs;

CREATE POLICY "Members can view agency content logs"
ON public.content_logs FOR SELECT
USING (user_has_agency_access(auth.uid(), agency_id));

CREATE POLICY "Users can insert own content logs"
ON public.content_logs FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND user_has_agency_access(auth.uid(), agency_id)
);

CREATE POLICY "Users can update own content logs"
ON public.content_logs FOR UPDATE
USING (
  auth.uid() = user_id
  AND user_has_agency_access(auth.uid(), agency_id)
);

CREATE POLICY "Agency owners can manage agency content logs"
ON public.content_logs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = content_logs.agency_id
    AND role = 'AGENCY_OWNER'
  )
);

CREATE POLICY "Super admins can manage all content logs"
ON public.content_logs FOR ALL
USING (is_super_admin(auth.uid()));

-- INVENTORY_ITEMS TABLE
DROP POLICY IF EXISTS "Agency members can view agency inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Agency owners can manage agency inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Super admins can manage all inventory" ON public.inventory_items;

CREATE POLICY "Members can view agency inventory"
ON public.inventory_items FOR SELECT
USING (user_has_agency_access(auth.uid(), agency_id));

CREATE POLICY "Agency owners can manage agency inventory"
ON public.inventory_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = inventory_items.agency_id
    AND role = 'AGENCY_OWNER'
  )
);

CREATE POLICY "Super admins can manage all inventory"
ON public.inventory_items FOR ALL
USING (is_super_admin(auth.uid()));

-- INVESTOR_LEDGER TABLE
DROP POLICY IF EXISTS "Agency owners can manage agency ledger" ON public.investor_ledger;
DROP POLICY IF EXISTS "Super admins can manage all ledger" ON public.investor_ledger;

CREATE POLICY "Members can view agency ledger"
ON public.investor_ledger FOR SELECT
USING (user_has_agency_access(auth.uid(), agency_id));

CREATE POLICY "Agency owners can manage agency ledger"
ON public.investor_ledger FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = investor_ledger.agency_id
    AND role = 'AGENCY_OWNER'
  )
);

CREATE POLICY "Super admins can manage all ledger"
ON public.investor_ledger FOR ALL
USING (is_super_admin(auth.uid()));

-- ATURAN_KOMISI TABLE
DROP POLICY IF EXISTS "Agency members can view agency commission rules" ON public.aturan_komisi;
DROP POLICY IF EXISTS "Agency owners can manage agency commission rules" ON public.aturan_komisi;
DROP POLICY IF EXISTS "Super admins can manage all commission rules" ON public.aturan_komisi;

CREATE POLICY "Members can view agency commission rules"
ON public.aturan_komisi FOR SELECT
USING (user_has_agency_access(auth.uid(), agency_id));

CREATE POLICY "Agency owners can manage agency commission rules"
ON public.aturan_komisi FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = aturan_komisi.agency_id
    AND role = 'AGENCY_OWNER'
  )
);

CREATE POLICY "Super admins can manage all commission rules"
ON public.aturan_komisi FOR ALL
USING (is_super_admin(auth.uid()));

-- ATURAN_PAYROLL TABLE
DROP POLICY IF EXISTS "Agency members can view agency payroll rules" ON public.aturan_payroll;
DROP POLICY IF EXISTS "Agency owners can manage agency payroll rules" ON public.aturan_payroll;
DROP POLICY IF EXISTS "Super admins can manage all payroll rules" ON public.aturan_payroll;

CREATE POLICY "Members can view agency payroll rules"
ON public.aturan_payroll FOR SELECT
USING (user_has_agency_access(auth.uid(), agency_id));

CREATE POLICY "Agency owners can manage agency payroll rules"
ON public.aturan_payroll FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.agency_members
    WHERE user_id = auth.uid()
    AND agency_id = aturan_payroll.agency_id
    AND role = 'AGENCY_OWNER'
  )
);

CREATE POLICY "Super admins can manage all payroll rules"
ON public.aturan_payroll FOR ALL
USING (is_super_admin(auth.uid()));