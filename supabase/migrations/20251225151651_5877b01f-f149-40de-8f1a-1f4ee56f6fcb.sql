-- ================================================
-- STEP 4: Update existing table RLS policies for multi-tenancy
-- ================================================

-- Drop existing policies on profiles
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own non-sensitive profile fields" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- New multi-tenant policies for profiles
CREATE POLICY "Super admins can manage all profiles"
ON public.profiles FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Agency owners can view agency profiles"
ON public.profiles FOR SELECT
USING (public.is_agency_owner(auth.uid(), agency_id));

CREATE POLICY "Agency owners can manage agency profiles"
ON public.profiles FOR ALL
USING (public.is_agency_owner(auth.uid(), agency_id));

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Drop existing policies on penjualan_harian
DROP POLICY IF EXISTS "Admins can manage all sales" ON public.penjualan_harian;
DROP POLICY IF EXISTS "Admins can view all sales" ON public.penjualan_harian;
DROP POLICY IF EXISTS "Creators can insert their own sales" ON public.penjualan_harian;
DROP POLICY IF EXISTS "Creators can update their own sales" ON public.penjualan_harian;
DROP POLICY IF EXISTS "Creators can view their own sales" ON public.penjualan_harian;
DROP POLICY IF EXISTS "Investors can view all sales" ON public.penjualan_harian;

-- New multi-tenant policies for penjualan_harian
CREATE POLICY "Super admins can manage all sales"
ON public.penjualan_harian FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Agency owners can manage agency sales"
ON public.penjualan_harian FOR ALL
USING (public.is_agency_owner(auth.uid(), agency_id));

CREATE POLICY "Creators can view their own sales"
ON public.penjualan_harian FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Creators can insert their own sales"
ON public.penjualan_harian FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Creators can update their own sales"
ON public.penjualan_harian FOR UPDATE
USING (auth.uid() = user_id);

-- Drop existing policies on sesi_live
DROP POLICY IF EXISTS "Admins can manage sessions" ON public.sesi_live;
DROP POLICY IF EXISTS "Admins can view all sessions" ON public.sesi_live;
DROP POLICY IF EXISTS "Creators can insert their own sessions" ON public.sesi_live;
DROP POLICY IF EXISTS "Creators can update their own sessions" ON public.sesi_live;
DROP POLICY IF EXISTS "Creators can view their own sessions" ON public.sesi_live;

-- New multi-tenant policies for sesi_live
CREATE POLICY "Super admins can manage all sessions"
ON public.sesi_live FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Agency owners can manage agency sessions"
ON public.sesi_live FOR ALL
USING (public.is_agency_owner(auth.uid(), agency_id));

CREATE POLICY "Creators can view their own sessions"
ON public.sesi_live FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Creators can insert their own sessions"
ON public.sesi_live FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Creators can update their own sessions"
ON public.sesi_live FOR UPDATE
USING (auth.uid() = user_id);

-- Drop existing policies on payouts
DROP POLICY IF EXISTS "Admins can manage payouts" ON public.payouts;
DROP POLICY IF EXISTS "Admins can view all payouts" ON public.payouts;
DROP POLICY IF EXISTS "Creators can view their own payouts" ON public.payouts;
DROP POLICY IF EXISTS "Investors can view all payouts" ON public.payouts;
DROP POLICY IF EXISTS "Require authentication for payouts" ON public.payouts;

-- New multi-tenant policies for payouts
CREATE POLICY "Super admins can manage all payouts"
ON public.payouts FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Agency owners can manage agency payouts"
ON public.payouts FOR ALL
USING (public.is_agency_owner(auth.uid(), agency_id));

CREATE POLICY "Creators can view their own payouts"
ON public.payouts FOR SELECT
USING (auth.uid() = user_id);

-- Drop existing policies on content_logs
DROP POLICY IF EXISTS "Admins can manage content logs" ON public.content_logs;
DROP POLICY IF EXISTS "Admins can view all content logs" ON public.content_logs;
DROP POLICY IF EXISTS "Creators can insert their own content logs" ON public.content_logs;
DROP POLICY IF EXISTS "Creators can view their own content logs" ON public.content_logs;

-- New multi-tenant policies for content_logs
CREATE POLICY "Super admins can manage all content logs"
ON public.content_logs FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Agency owners can manage agency content logs"
ON public.content_logs FOR ALL
USING (public.is_agency_owner(auth.uid(), agency_id));

CREATE POLICY "Creators can view their own content logs"
ON public.content_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Creators can insert their own content logs"
ON public.content_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Drop existing policies on aturan_komisi
DROP POLICY IF EXISTS "Admins can insert commission rules" ON public.aturan_komisi;
DROP POLICY IF EXISTS "Admins can update commission rules" ON public.aturan_komisi;
DROP POLICY IF EXISTS "Anyone authenticated can view commission rules" ON public.aturan_komisi;

-- New multi-tenant policies for aturan_komisi
CREATE POLICY "Super admins can manage all commission rules"
ON public.aturan_komisi FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Agency owners can manage agency commission rules"
ON public.aturan_komisi FOR ALL
USING (public.is_agency_owner(auth.uid(), agency_id));

CREATE POLICY "Agency members can view agency commission rules"
ON public.aturan_komisi FOR SELECT
USING (public.is_agency_member(auth.uid(), agency_id));

-- Drop existing policies on aturan_payroll
DROP POLICY IF EXISTS "Admins can insert payroll rules" ON public.aturan_payroll;
DROP POLICY IF EXISTS "Admins can update payroll rules" ON public.aturan_payroll;
DROP POLICY IF EXISTS "Anyone authenticated can view payroll rules" ON public.aturan_payroll;

-- New multi-tenant policies for aturan_payroll
CREATE POLICY "Super admins can manage all payroll rules"
ON public.aturan_payroll FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Agency owners can manage agency payroll rules"
ON public.aturan_payroll FOR ALL
USING (public.is_agency_owner(auth.uid(), agency_id));

CREATE POLICY "Agency members can view agency payroll rules"
ON public.aturan_payroll FOR SELECT
USING (public.is_agency_member(auth.uid(), agency_id));

-- Drop existing policies on inventory_items
DROP POLICY IF EXISTS "Admins can manage inventory" ON public.inventory_items;

-- New multi-tenant policies for inventory_items
CREATE POLICY "Super admins can manage all inventory"
ON public.inventory_items FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Agency owners can manage agency inventory"
ON public.inventory_items FOR ALL
USING (public.is_agency_owner(auth.uid(), agency_id));

CREATE POLICY "Agency members can view agency inventory"
ON public.inventory_items FOR SELECT
USING (public.is_agency_member(auth.uid(), agency_id));

-- Drop existing policies on investor_ledger
DROP POLICY IF EXISTS "Admins and investors can view ledger" ON public.investor_ledger;
DROP POLICY IF EXISTS "Only admins can delete ledger entries" ON public.investor_ledger;
DROP POLICY IF EXISTS "Only admins can insert ledger entries" ON public.investor_ledger;
DROP POLICY IF EXISTS "Only admins can update ledger entries" ON public.investor_ledger;

-- New multi-tenant policies for investor_ledger
CREATE POLICY "Super admins can manage all ledger"
ON public.investor_ledger FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Agency owners can manage agency ledger"
ON public.investor_ledger FOR ALL
USING (public.is_agency_owner(auth.uid(), agency_id));

-- Drop existing policies on user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- New policies for user_roles
CREATE POLICY "Super admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);