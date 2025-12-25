-- Fix the handle_new_user trigger to use proper enum casting
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
  
  -- Check if this is an agency owner signup
  IF (NEW.raw_user_meta_data->>'is_agency_owner')::boolean = true THEN
    -- Create new agency
    _agency_name := COALESCE(NEW.raw_user_meta_data->>'agency_name', 'My Agency');
    _agency_slug := lower(regexp_replace(_agency_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8);
    
    INSERT INTO public.agencies (name, slug, owner_id, subscription_plan, subscription_status)
    VALUES (_agency_name, _agency_slug, NEW.id, 'FREE'::subscription_plan, 'ACTIVE'::agency_status)
    RETURNING id INTO _agency_id;
    
    _user_role := 'AGENCY_OWNER'::app_role;
    
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
  
  -- Determine user status with proper enum casting
  IF _agency_id IS NOT NULL THEN
    _user_status := 'ACTIVE'::user_status;
  ELSE
    _user_status := 'PENDING_APPROVAL'::user_status;
  END IF;
  
  -- Create profile with proper enum types
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