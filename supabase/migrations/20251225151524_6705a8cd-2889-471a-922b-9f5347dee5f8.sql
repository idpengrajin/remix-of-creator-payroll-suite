-- ================================================
-- STEP 2: Create agencies and related tables
-- ================================================

-- Create agencies table (the tenant container)
CREATE TABLE public.agencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subscription_plan subscription_plan NOT NULL DEFAULT 'FREE',
  subscription_status agency_status NOT NULL DEFAULT 'ACTIVE',
  max_creators INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agency invitations table
CREATE TABLE public.agency_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  email TEXT,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  role app_role NOT NULL DEFAULT 'CREATOR',
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create agency_members junction table
CREATE TABLE public.agency_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'CREATOR',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agency_id, user_id)
);

-- Add agency_id to existing tables
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE SET NULL;
ALTER TABLE public.penjualan_harian ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.sesi_live ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.content_logs ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.aturan_komisi ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.aturan_payroll ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;
ALTER TABLE public.investor_ledger ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE;

-- Enable RLS on new tables
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;

-- Create default legacy agency for existing data
INSERT INTO public.agencies (id, name, slug, subscription_plan, max_creators)
VALUES ('00000000-0000-0000-0000-000000000001', 'Legacy Agency', 'legacy-agency', 'ENTERPRISE', 1000);

-- Migrate existing data to legacy agency
UPDATE public.profiles SET agency_id = '00000000-0000-0000-0000-000000000001' WHERE agency_id IS NULL;
UPDATE public.penjualan_harian SET agency_id = '00000000-0000-0000-0000-000000000001' WHERE agency_id IS NULL;
UPDATE public.sesi_live SET agency_id = '00000000-0000-0000-0000-000000000001' WHERE agency_id IS NULL;
UPDATE public.payouts SET agency_id = '00000000-0000-0000-0000-000000000001' WHERE agency_id IS NULL;
UPDATE public.content_logs SET agency_id = '00000000-0000-0000-0000-000000000001' WHERE agency_id IS NULL;
UPDATE public.aturan_komisi SET agency_id = '00000000-0000-0000-0000-000000000001' WHERE agency_id IS NULL;
UPDATE public.aturan_payroll SET agency_id = '00000000-0000-0000-0000-000000000001' WHERE agency_id IS NULL;
UPDATE public.inventory_items SET agency_id = '00000000-0000-0000-0000-000000000001' WHERE agency_id IS NULL;
UPDATE public.investor_ledger SET agency_id = '00000000-0000-0000-0000-000000000001' WHERE agency_id IS NULL;

-- Create agency members for existing users in legacy agency
INSERT INTO public.agency_members (agency_id, user_id, role)
SELECT '00000000-0000-0000-0000-000000000001', id, role
FROM public.profiles
WHERE agency_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_agency_id ON public.profiles(agency_id);
CREATE INDEX IF NOT EXISTS idx_penjualan_harian_agency_id ON public.penjualan_harian(agency_id);
CREATE INDEX IF NOT EXISTS idx_sesi_live_agency_id ON public.sesi_live(agency_id);
CREATE INDEX IF NOT EXISTS idx_payouts_agency_id ON public.payouts(agency_id);
CREATE INDEX IF NOT EXISTS idx_content_logs_agency_id ON public.content_logs(agency_id);
CREATE INDEX IF NOT EXISTS idx_aturan_komisi_agency_id ON public.aturan_komisi(agency_id);
CREATE INDEX IF NOT EXISTS idx_aturan_payroll_agency_id ON public.aturan_payroll(agency_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_agency_id ON public.inventory_items(agency_id);
CREATE INDEX IF NOT EXISTS idx_investor_ledger_agency_id ON public.investor_ledger(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_members_user_id ON public.agency_members(user_id);
CREATE INDEX IF NOT EXISTS idx_agency_members_agency_id ON public.agency_members(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_invitations_token ON public.agency_invitations(token);
CREATE INDEX IF NOT EXISTS idx_agencies_slug ON public.agencies(slug);

-- Add updated_at trigger to agencies table
CREATE TRIGGER update_agencies_updated_at
BEFORE UPDATE ON public.agencies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();