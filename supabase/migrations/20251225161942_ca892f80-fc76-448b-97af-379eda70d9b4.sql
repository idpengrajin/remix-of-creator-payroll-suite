-- ============================================
-- FASE 1B: DATABASE INTEGRITY - NOT NULL CONSTRAINTS & TRIGGERS
-- ============================================

-- First, update existing NULL agency_id values to a placeholder (will need data cleanup)
-- Skip this if data already exists with valid agency_ids

-- Make agency_id NOT NULL on operational tables (only if not already)
-- Note: We'll use ALTER TABLE with IF NOT EXISTS pattern

-- For penjualan_harian - already has agency_id, ensure NOT NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'penjualan_harian' 
    AND column_name = 'agency_id' 
    AND is_nullable = 'YES'
  ) THEN
    -- First check if there are null values
    IF EXISTS (SELECT 1 FROM public.penjualan_harian WHERE agency_id IS NULL) THEN
      RAISE NOTICE 'Cannot set NOT NULL - there are existing NULL values in penjualan_harian.agency_id';
    ELSE
      ALTER TABLE public.penjualan_harian ALTER COLUMN agency_id SET NOT NULL;
    END IF;
  END IF;
END $$;

-- For sesi_live
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sesi_live' 
    AND column_name = 'agency_id' 
    AND is_nullable = 'YES'
  ) THEN
    IF EXISTS (SELECT 1 FROM public.sesi_live WHERE agency_id IS NULL) THEN
      RAISE NOTICE 'Cannot set NOT NULL - there are existing NULL values in sesi_live.agency_id';
    ELSE
      ALTER TABLE public.sesi_live ALTER COLUMN agency_id SET NOT NULL;
    END IF;
  END IF;
END $$;

-- For payouts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payouts' 
    AND column_name = 'agency_id' 
    AND is_nullable = 'YES'
  ) THEN
    IF EXISTS (SELECT 1 FROM public.payouts WHERE agency_id IS NULL) THEN
      RAISE NOTICE 'Cannot set NOT NULL - there are existing NULL values in payouts.agency_id';
    ELSE
      ALTER TABLE public.payouts ALTER COLUMN agency_id SET NOT NULL;
    END IF;
  END IF;
END $$;

-- For content_logs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'content_logs' 
    AND column_name = 'agency_id' 
    AND is_nullable = 'YES'
  ) THEN
    IF EXISTS (SELECT 1 FROM public.content_logs WHERE agency_id IS NULL) THEN
      RAISE NOTICE 'Cannot set NOT NULL - there are existing NULL values in content_logs.agency_id';
    ELSE
      ALTER TABLE public.content_logs ALTER COLUMN agency_id SET NOT NULL;
    END IF;
  END IF;
END $$;

-- For inventory_items
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_items' 
    AND column_name = 'agency_id' 
    AND is_nullable = 'YES'
  ) THEN
    IF EXISTS (SELECT 1 FROM public.inventory_items WHERE agency_id IS NULL) THEN
      RAISE NOTICE 'Cannot set NOT NULL - there are existing NULL values in inventory_items.agency_id';
    ELSE
      ALTER TABLE public.inventory_items ALTER COLUMN agency_id SET NOT NULL;
    END IF;
  END IF;
END $$;

-- For investor_ledger
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'investor_ledger' 
    AND column_name = 'agency_id' 
    AND is_nullable = 'YES'
  ) THEN
    IF EXISTS (SELECT 1 FROM public.investor_ledger WHERE agency_id IS NULL) THEN
      RAISE NOTICE 'Cannot set NOT NULL - there are existing NULL values in investor_ledger.agency_id';
    ELSE
      ALTER TABLE public.investor_ledger ALTER COLUMN agency_id SET NOT NULL;
    END IF;
  END IF;
END $$;

-- For aturan_komisi
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'aturan_komisi' 
    AND column_name = 'agency_id' 
    AND is_nullable = 'YES'
  ) THEN
    IF EXISTS (SELECT 1 FROM public.aturan_komisi WHERE agency_id IS NULL) THEN
      RAISE NOTICE 'Cannot set NOT NULL - there are existing NULL values in aturan_komisi.agency_id';
    ELSE
      ALTER TABLE public.aturan_komisi ALTER COLUMN agency_id SET NOT NULL;
    END IF;
  END IF;
END $$;

-- For aturan_payroll
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'aturan_payroll' 
    AND column_name = 'agency_id' 
    AND is_nullable = 'YES'
  ) THEN
    IF EXISTS (SELECT 1 FROM public.aturan_payroll WHERE agency_id IS NULL) THEN
      RAISE NOTICE 'Cannot set NOT NULL - there are existing NULL values in aturan_payroll.agency_id';
    ELSE
      ALTER TABLE public.aturan_payroll ALTER COLUMN agency_id SET NOT NULL;
    END IF;
  END IF;
END $$;

-- ============================================
-- CREATE/UPDATE TRIGGER FOR NEW USER SIGNUP
-- ============================================

-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create comprehensive new user handler
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
BEGIN
  -- Get user metadata
  _user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));
  _invitation_token := NEW.raw_user_meta_data->>'invitation_token';
  
  -- Check if this is an agency owner signup
  IF (NEW.raw_user_meta_data->>'is_agency_owner')::boolean = true THEN
    -- Create new agency
    _agency_name := COALESCE(NEW.raw_user_meta_data->>'agency_name', 'My Agency');
    _agency_slug := lower(regexp_replace(_agency_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8);
    
    INSERT INTO public.agencies (name, slug, owner_id, subscription_plan, subscription_status)
    VALUES (_agency_name, _agency_slug, NEW.id, 'FREE', 'ACTIVE')
    RETURNING id INTO _agency_id;
    
    _user_role := 'AGENCY_OWNER';
    
    -- Create default aturan_komisi for new agency
    INSERT INTO public.aturan_komisi (agency_id, nama_aturan, slabs)
    VALUES (_agency_id, 'Aturan Default', '[{"max": 5000000, "min": 0, "rate": 0.00}, {"max": 20000000, "min": 5000000, "rate": 0.20}, {"max": 100000000, "min": 20000000, "rate": 0.30}, {"max": 9000000000000000, "min": 100000000, "rate": 0.40}]'::jsonb);
    
    -- Create default aturan_payroll for new agency
    INSERT INTO public.aturan_payroll (agency_id)
    VALUES (_agency_id);
    
  -- Check if this is an invitation signup
  ELSIF _invitation_token IS NOT NULL THEN
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
      
      -- Mark invitation as used
      UPDATE public.agency_invitations
      SET used_at = now()
      WHERE id = _invitation_data.id;
    ELSE
      -- Invalid invitation - create without agency
      _agency_id := NULL;
    END IF;
  END IF;
  
  -- Create profile
  INSERT INTO public.profiles (id, email, name, role, status, agency_id)
  VALUES (
    NEW.id,
    NEW.email,
    _user_name,
    _user_role,
    CASE WHEN _agency_id IS NOT NULL THEN 'ACTIVE' ELSE 'PENDING_APPROVAL' END,
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

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FUNCTION TO CHECK AGENCY CREATOR LIMIT
-- ============================================

CREATE OR REPLACE FUNCTION public.check_agency_creator_limit(_agency_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_count integer;
  _max_creators integer;
  _plan text;
BEGIN
  -- Get agency plan and max_creators
  SELECT subscription_plan, max_creators 
  INTO _plan, _max_creators
  FROM public.agencies
  WHERE id = _agency_id;
  
  -- Count current creators in agency
  SELECT COUNT(*)
  INTO _current_count
  FROM public.agency_members
  WHERE agency_id = _agency_id
    AND role = 'CREATOR';
  
  -- Check if under limit
  RETURN _current_count < _max_creators;
END;
$$;