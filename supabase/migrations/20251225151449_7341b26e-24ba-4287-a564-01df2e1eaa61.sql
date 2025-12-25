-- ================================================
-- STEP 1: Add new enum values (must be committed first)
-- ================================================

-- Create new enum for subscription plans
CREATE TYPE public.subscription_plan AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- Create new enum for agency status
CREATE TYPE public.agency_status AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED');

-- Update app_role enum to include new roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'AGENCY_OWNER';