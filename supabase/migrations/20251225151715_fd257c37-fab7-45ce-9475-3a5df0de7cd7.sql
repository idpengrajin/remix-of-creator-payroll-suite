-- ================================================
-- STEP 5: Update handle_new_user function for multi-tenant
-- ================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
  v_invitation_token text;
  v_role app_role;
BEGIN
  -- Check if user is registering via invitation
  v_invitation_token := NEW.raw_user_meta_data->>'invitation_token';
  
  IF v_invitation_token IS NOT NULL THEN
    -- Get invitation details
    SELECT agency_id, role INTO v_agency_id, v_role
    FROM public.agency_invitations
    WHERE token = v_invitation_token
    AND used_at IS NULL
    AND expires_at > now();
    
    IF v_agency_id IS NOT NULL THEN
      -- Mark invitation as used
      UPDATE public.agency_invitations
      SET used_at = now()
      WHERE token = v_invitation_token;
      
      -- Create profile with agency
      INSERT INTO public.profiles (id, name, email, role, status, agency_id)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
        NEW.email,
        v_role,
        'ACTIVE'::user_status,
        v_agency_id
      );
      
      -- Insert user role
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, v_role);
      
      -- Add to agency members
      INSERT INTO public.agency_members (agency_id, user_id, role)
      VALUES (v_agency_id, NEW.id, v_role);
      
      RETURN NEW;
    END IF;
  END IF;
  
  -- Check if this is a new agency owner registration
  IF (NEW.raw_user_meta_data->>'is_agency_owner')::boolean = true THEN
    -- Create new agency
    INSERT INTO public.agencies (name, slug, owner_id)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'agency_name', 'My Agency'),
      LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'agency_name', 'agency-' || gen_random_uuid()::text), ' ', '-')),
      NEW.id
    )
    RETURNING id INTO v_agency_id;
    
    -- Create profile as agency owner
    INSERT INTO public.profiles (id, name, email, role, status, agency_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', 'Owner'),
      NEW.email,
      'AGENCY_OWNER'::app_role,
      'ACTIVE'::user_status,
      v_agency_id
    );
    
    -- Insert user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'AGENCY_OWNER'::app_role);
    
    -- Add as agency member
    INSERT INTO public.agency_members (agency_id, user_id, role)
    VALUES (v_agency_id, NEW.id, 'AGENCY_OWNER'::app_role);
    
    -- Create default payroll rules for the agency
    INSERT INTO public.aturan_payroll (agency_id)
    VALUES (v_agency_id);
    
    -- Create default commission rules for the agency
    INSERT INTO public.aturan_komisi (agency_id, nama_aturan)
    VALUES (v_agency_id, 'Aturan Default');
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;