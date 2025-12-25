CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'ADMIN',
    'CREATOR',
    'INVESTOR'
);


--
-- Name: ledger_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ledger_type AS ENUM (
    'CAPITAL_IN',
    'CAPITAL_OUT',
    'PROFIT_SHARE'
);


--
-- Name: payout_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payout_status AS ENUM (
    'DRAFT',
    'APPROVED',
    'PAID'
);


--
-- Name: sales_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sales_source AS ENUM (
    'TIKTOK',
    'SHOPEE'
);


--
-- Name: shift_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.shift_type AS ENUM (
    'PAGI',
    'SIANG',
    'MALAM'
);


--
-- Name: user_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_status AS ENUM (
    'ACTIVE',
    'PAUSED',
    'ARCHIVED',
    'PENDING_APPROVAL'
);


--
-- Name: get_creator_sales_stats_by_range(date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_creator_sales_stats_by_range(start_date date, end_date date) RETURNS TABLE(user_id uuid, name text, gmv numeric, commission numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ph.user_id,
    p.name,
    COALESCE(SUM(ph.gmv), 0) as gmv,
    COALESCE(SUM(ph.commission_gross), 0) as commission
  FROM penjualan_harian ph
  INNER JOIN profiles p ON p.id = ph.user_id
  WHERE ph.date >= start_date AND ph.date <= end_date
  GROUP BY ph.user_id, p.name
  ORDER BY gmv DESC;
END;
$$;


--
-- Name: get_dashboard_stats_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_dashboard_stats_admin() RETURNS TABLE(total_gmv numeric, total_commission numeric, total_creators bigint, total_payout numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(ph.gmv), 0) as total_gmv,
    COALESCE(SUM(ph.commission_gross), 0) as total_commission,
    (SELECT COUNT(*) FROM profiles WHERE role = 'CREATOR' AND status = 'ACTIVE') as total_creators,
    COALESCE((SELECT SUM(p.total_payout) FROM payouts p WHERE p.status = 'PAID'), 0) as total_payout
  FROM penjualan_harian ph;
END;
$$;


--
-- Name: get_dashboard_stats_creator(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_dashboard_stats_creator(creator_user_id uuid) RETURNS TABLE(total_gmv numeric, total_commission numeric, total_minutes bigint, total_payout numeric, estimated_bonus numeric)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total_gmv numeric;
  v_total_commission numeric;
  v_commission_rule_id uuid;
  v_slabs jsonb;
  v_slab jsonb;
  v_estimated_bonus numeric := 0;
  v_avg_commission_rate numeric;
  v_slab_min numeric;
  v_slab_max numeric;
  v_slab_rate numeric;
  v_gmv_in_slab numeric;
  v_commission_in_slab numeric;
BEGIN
  -- Get totals
  SELECT 
    COALESCE(SUM(ph.gmv), 0),
    COALESCE(SUM(ph.commission_gross), 0)
  INTO v_total_gmv, v_total_commission
  FROM penjualan_harian ph
  WHERE ph.user_id = creator_user_id;

  -- Get commission rule and calculate bonus using PROGRESSIVE TIERING
  SELECT id_aturan_komisi INTO v_commission_rule_id
  FROM profiles
  WHERE id = creator_user_id;

  IF v_commission_rule_id IS NOT NULL AND v_total_gmv > 0 THEN
    SELECT slabs INTO v_slabs
    FROM aturan_komisi
    WHERE id = v_commission_rule_id;

    IF v_slabs IS NOT NULL THEN
      -- Calculate average commission rate
      v_avg_commission_rate := v_total_commission / v_total_gmv;
      
      -- Progressive calculation: loop through each slab and calculate bonus for GMV portion in that slab
      FOR v_slab IN SELECT * FROM jsonb_array_elements(v_slabs) ORDER BY (value->>'min')::numeric ASC
      LOOP
        v_slab_min := (v_slab->>'min')::numeric;
        v_slab_max := (v_slab->>'max')::numeric;
        v_slab_rate := (v_slab->>'rate')::numeric;
        
        -- Calculate GMV that falls within this slab
        v_gmv_in_slab := GREATEST(0, LEAST(v_total_gmv, v_slab_max) - v_slab_min);
        
        IF v_gmv_in_slab > 0 THEN
          -- Calculate proportional commission for this slab
          v_commission_in_slab := v_gmv_in_slab * v_avg_commission_rate;
          -- Add bonus for this slab
          v_estimated_bonus := v_estimated_bonus + (v_commission_in_slab * v_slab_rate);
        END IF;
      END LOOP;
      
      v_estimated_bonus := ROUND(v_estimated_bonus);
    END IF;
  END IF;

  -- Return all stats
  RETURN QUERY
  SELECT 
    v_total_gmv as total_gmv,
    v_total_commission as total_commission,
    COALESCE((SELECT SUM(sl.duration_minutes) FROM sesi_live sl WHERE sl.user_id = creator_user_id), 0) as total_minutes,
    COALESCE((SELECT SUM(p.total_payout) FROM payouts p WHERE p.user_id = creator_user_id AND p.status = 'PAID'), 0) as total_payout,
    v_estimated_bonus as estimated_bonus;
END;
$$;


--
-- Name: get_leaderboard_data(date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_leaderboard_data(start_date date, end_date date) RETURNS TABLE(user_id uuid, name text, total_gmv numeric, total_minutes integer, total_posts bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    p.id as user_id,
    p.name,
    COALESCE(gmv_data.total_gmv, 0) as total_gmv,
    COALESCE(live_data.total_minutes, 0)::INTEGER as total_minutes,
    COALESCE(content_data.total_posts, 0) as total_posts
  FROM profiles p
  LEFT JOIN (
    SELECT user_id, SUM(gmv) as total_gmv
    FROM penjualan_harian
    WHERE date >= start_date AND date <= end_date
    GROUP BY user_id
  ) gmv_data ON gmv_data.user_id = p.id
  LEFT JOIN (
    SELECT user_id, SUM(duration_minutes) as total_minutes
    FROM sesi_live
    WHERE date >= to_char(start_date, 'YYYY-MM-DD')
      AND date <= to_char(end_date, 'YYYY-MM-DD')
    GROUP BY user_id
  ) live_data ON live_data.user_id = p.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as total_posts
    FROM content_logs
    WHERE date >= to_char(start_date, 'YYYY-MM-DD')
      AND date <= to_char(end_date, 'YYYY-MM-DD')
    GROUP BY user_id
  ) content_data ON content_data.user_id = p.id
  WHERE p.role = 'CREATOR' 
    AND p.status = 'ACTIVE'
  ORDER BY p.name;
$$;


--
-- Name: get_profiles_for_investor(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_profiles_for_investor() RETURNS TABLE(id uuid, name text, email text, role public.app_role, status public.user_status, tiktok_account text, niche text, join_date date, created_at timestamp with time zone, updated_at timestamp with time zone, id_aturan_komisi uuid)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    p.id,
    p.name,
    p.email,
    p.role,
    p.status,
    p.tiktok_account,
    p.niche,
    p.join_date,
    p.created_at,
    p.updated_at,
    p.id_aturan_komisi
  FROM public.profiles p
  WHERE has_role(auth.uid(), 'INVESTOR');
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Always use CREATOR role for public signups
  -- Admin users should be created via admin panel, not public signup
  INSERT INTO public.profiles (id, name, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    NEW.email,
    'CREATOR'::app_role,
    -- Check metadata first, if not present, use default logic
    COALESCE(
      (NEW.raw_user_meta_data->>'status')::user_status,
      'PENDING_APPROVAL'::user_status
    )
  );
  
  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'CREATOR'::app_role);
  
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  );
$$;


--
-- Name: sync_profile_role_from_user_roles(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_profile_role_from_user_roles() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- On INSERT, set role from user_roles (if exists), otherwise use default
  IF TG_OP = 'INSERT' THEN
    SELECT role INTO NEW.role
    FROM public.user_roles
    WHERE user_id = NEW.id
    LIMIT 1;
    
    -- If no role in user_roles yet, keep the default from the column
    IF NEW.role IS NULL THEN
      NEW.role := 'CREATOR'::app_role;
    END IF;
  END IF;
  
  -- On UPDATE, prevent direct role changes - always fetch from user_roles
  IF TG_OP = 'UPDATE' THEN
    SELECT role INTO NEW.role
    FROM public.user_roles
    WHERE user_id = NEW.id
    LIMIT 1;
    
    -- If no role found, keep existing
    IF NEW.role IS NULL THEN
      NEW.role := OLD.role;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: aturan_komisi; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aturan_komisi (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slabs jsonb DEFAULT '[{"max": 5000000, "min": 0, "rate": 0.00}, {"max": 20000000, "min": 5000000, "rate": 0.20}, {"max": 100000000, "min": 20000000, "rate": 0.30}, {"max": 9000000000000000, "min": 100000000, "rate": 0.40}]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    nama_aturan text DEFAULT 'Aturan Default'::text NOT NULL
);


--
-- Name: aturan_payroll; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aturan_payroll (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    daily_live_target_minutes integer DEFAULT 120 NOT NULL,
    floor_pct numeric(5,2) DEFAULT 0.60 NOT NULL,
    cap_pct numeric(5,2) DEFAULT 1.00 NOT NULL,
    minimum_minutes integer DEFAULT 7800 NOT NULL,
    minimum_policy text DEFAULT 'prorata_with_flag'::text NOT NULL,
    workdays integer[] DEFAULT ARRAY[1, 2, 3, 4, 5] NOT NULL,
    holidays date[] DEFAULT ARRAY[]::date[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: content_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date text NOT NULL,
    post_number integer NOT NULL,
    link text NOT NULL,
    is_counted boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nama_barang text NOT NULL,
    kategori text NOT NULL,
    status text DEFAULT 'Tersedia'::text NOT NULL,
    peminjam_id uuid,
    catatan text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: investor_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.investor_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date timestamp with time zone DEFAULT now() NOT NULL,
    type public.ledger_type NOT NULL,
    amount numeric(15,2) NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    title text,
    proof_link text,
    keterangan text
);


--
-- Name: payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    user_id uuid NOT NULL,
    base_salary numeric(15,2) DEFAULT 0 NOT NULL,
    base_salary_adjusted numeric(15,2) DEFAULT 0 NOT NULL,
    bonus_commission numeric(15,2) DEFAULT 0 NOT NULL,
    deductions numeric(15,2) DEFAULT 0 NOT NULL,
    total_payout numeric(15,2) DEFAULT 0 NOT NULL,
    below_minimum boolean DEFAULT false,
    status public.payout_status DEFAULT 'DRAFT'::public.payout_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: penjualan_harian; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.penjualan_harian (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    source public.sales_source DEFAULT 'TIKTOK'::public.sales_source NOT NULL,
    gmv numeric DEFAULT 0 NOT NULL,
    commission_gross numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    role public.app_role DEFAULT 'CREATOR'::public.app_role NOT NULL,
    status public.user_status DEFAULT 'ACTIVE'::public.user_status NOT NULL,
    base_salary numeric(15,2) DEFAULT 0,
    join_date date DEFAULT CURRENT_DATE NOT NULL,
    tiktok_account text,
    niche text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    hourly_rate numeric(15,2) DEFAULT 0,
    id_aturan_komisi uuid,
    nama_bank text,
    nomor_rekening text,
    nama_pemilik_rekening text,
    target_gmv integer DEFAULT 0
);


--
-- Name: sesi_live; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sesi_live (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date text NOT NULL,
    shift public.shift_type DEFAULT 'PAGI'::public.shift_type NOT NULL,
    check_in timestamp with time zone NOT NULL,
    check_out timestamp with time zone,
    duration_minutes integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL
);


--
-- Name: aturan_komisi aturan_komisi_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aturan_komisi
    ADD CONSTRAINT aturan_komisi_pkey PRIMARY KEY (id);


--
-- Name: aturan_payroll aturan_payroll_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aturan_payroll
    ADD CONSTRAINT aturan_payroll_pkey PRIMARY KEY (id);


--
-- Name: content_logs content_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_logs
    ADD CONSTRAINT content_logs_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: investor_ledger investor_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.investor_ledger
    ADD CONSTRAINT investor_ledger_pkey PRIMARY KEY (id);


--
-- Name: payouts payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payouts
    ADD CONSTRAINT payouts_pkey PRIMARY KEY (id);


--
-- Name: penjualan_harian penjualan_harian_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.penjualan_harian
    ADD CONSTRAINT penjualan_harian_pkey PRIMARY KEY (id);


--
-- Name: penjualan_harian penjualan_harian_user_id_date_source_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.penjualan_harian
    ADD CONSTRAINT penjualan_harian_user_id_date_source_key UNIQUE (user_id, date, source);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: sesi_live sesi_live_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesi_live
    ADD CONSTRAINT sesi_live_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_content_logs_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_content_logs_user_date ON public.content_logs USING btree (user_id, date);


--
-- Name: idx_payouts_user_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payouts_user_period ON public.payouts USING btree (user_id, period_start, period_end);


--
-- Name: idx_profiles_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);


--
-- Name: idx_sesi_live_user_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sesi_live_user_date ON public.sesi_live USING btree (user_id, check_in);


--
-- Name: profiles enforce_profile_role_readonly; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_profile_role_readonly BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role_from_user_roles();


--
-- Name: aturan_komisi update_aturan_komisi_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_aturan_komisi_updated_at BEFORE UPDATE ON public.aturan_komisi FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: aturan_payroll update_aturan_payroll_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_aturan_payroll_updated_at BEFORE UPDATE ON public.aturan_payroll FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: content_logs update_content_logs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_content_logs_updated_at BEFORE UPDATE ON public.content_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inventory_items update_inventory_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payouts update_payouts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payouts_updated_at BEFORE UPDATE ON public.payouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: penjualan_harian update_penjualan_harian_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_penjualan_harian_updated_at BEFORE UPDATE ON public.penjualan_harian FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sesi_live update_sesi_live_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sesi_live_updated_at BEFORE UPDATE ON public.sesi_live FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: content_logs content_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_logs
    ADD CONSTRAINT content_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles fk_profiles_aturan_komisi; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT fk_profiles_aturan_komisi FOREIGN KEY (id_aturan_komisi) REFERENCES public.aturan_komisi(id) ON DELETE SET NULL;


--
-- Name: inventory_items inventory_items_peminjam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_peminjam_id_fkey FOREIGN KEY (peminjam_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: payouts payouts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payouts
    ADD CONSTRAINT payouts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: penjualan_harian penjualan_harian_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.penjualan_harian
    ADD CONSTRAINT penjualan_harian_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sesi_live sesi_live_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesi_live
    ADD CONSTRAINT sesi_live_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: investor_ledger Admins and investors can view ledger; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and investors can view ledger" ON public.investor_ledger FOR SELECT USING ((public.has_role(auth.uid(), 'ADMIN'::public.app_role) OR public.has_role(auth.uid(), 'INVESTOR'::public.app_role)));


--
-- Name: aturan_komisi Admins can insert commission rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert commission rules" ON public.aturan_komisi FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: aturan_payroll Admins can insert payroll rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert payroll rules" ON public.aturan_payroll FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: profiles Admins can insert profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert profiles" ON public.profiles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: penjualan_harian Admins can manage all sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all sales" ON public.penjualan_harian TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: content_logs Admins can manage content logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage content logs" ON public.content_logs USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: inventory_items Admins can manage inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage inventory" ON public.inventory_items USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: payouts Admins can manage payouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage payouts" ON public.payouts USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: user_roles Admins can manage roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage roles" ON public.user_roles USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: sesi_live Admins can manage sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage sessions" ON public.sesi_live USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: profiles Admins can update all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: aturan_komisi Admins can update commission rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update commission rules" ON public.aturan_komisi FOR UPDATE USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: aturan_payroll Admins can update payroll rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update payroll rules" ON public.aturan_payroll FOR UPDATE USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: content_logs Admins can view all content logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all content logs" ON public.content_logs FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: payouts Admins can view all payouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all payouts" ON public.payouts FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: penjualan_harian Admins can view all sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all sales" ON public.penjualan_harian FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: sesi_live Admins can view all sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all sessions" ON public.sesi_live FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: aturan_komisi Anyone authenticated can view commission rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone authenticated can view commission rules" ON public.aturan_komisi FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: aturan_payroll Anyone authenticated can view payroll rules; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone authenticated can view payroll rules" ON public.aturan_payroll FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: content_logs Creators can insert their own content logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators can insert their own content logs" ON public.content_logs FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: penjualan_harian Creators can insert their own sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators can insert their own sales" ON public.penjualan_harian FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND public.has_role(auth.uid(), 'CREATOR'::public.app_role)));


--
-- Name: sesi_live Creators can insert their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators can insert their own sessions" ON public.sesi_live FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: penjualan_harian Creators can update their own sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators can update their own sales" ON public.penjualan_harian FOR UPDATE TO authenticated USING (((auth.uid() = user_id) AND public.has_role(auth.uid(), 'CREATOR'::public.app_role)));


--
-- Name: sesi_live Creators can update their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators can update their own sessions" ON public.sesi_live FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: content_logs Creators can view their own content logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators can view their own content logs" ON public.content_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: payouts Creators can view their own payouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators can view their own payouts" ON public.payouts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: penjualan_harian Creators can view their own sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators can view their own sales" ON public.penjualan_harian FOR SELECT TO authenticated USING (((auth.uid() = user_id) AND public.has_role(auth.uid(), 'CREATOR'::public.app_role)));


--
-- Name: sesi_live Creators can view their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators can view their own sessions" ON public.sesi_live FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: payouts Investors can view all payouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Investors can view all payouts" ON public.payouts FOR SELECT USING (public.has_role(auth.uid(), 'INVESTOR'::public.app_role));


--
-- Name: penjualan_harian Investors can view all sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Investors can view all sales" ON public.penjualan_harian FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'INVESTOR'::public.app_role));


--
-- Name: investor_ledger Only admins can delete ledger entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete ledger entries" ON public.investor_ledger FOR DELETE USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: investor_ledger Only admins can insert ledger entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert ledger entries" ON public.investor_ledger FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: investor_ledger Only admins can update ledger entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update ledger entries" ON public.investor_ledger FOR UPDATE USING (public.has_role(auth.uid(), 'ADMIN'::public.app_role));


--
-- Name: payouts Require authentication for payouts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Require authentication for payouts" ON public.payouts USING ((auth.uid() IS NOT NULL));


--
-- Name: profiles Users can update their own non-sensitive profile fields; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own non-sensitive profile fields" ON public.profiles FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: aturan_komisi; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.aturan_komisi ENABLE ROW LEVEL SECURITY;

--
-- Name: aturan_payroll; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.aturan_payroll ENABLE ROW LEVEL SECURITY;

--
-- Name: content_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: inventory_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

--
-- Name: investor_ledger; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.investor_ledger ENABLE ROW LEVEL SECURITY;

--
-- Name: payouts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

--
-- Name: penjualan_harian; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.penjualan_harian ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: sesi_live; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sesi_live ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;