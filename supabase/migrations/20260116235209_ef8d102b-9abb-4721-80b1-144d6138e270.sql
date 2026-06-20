-- Create admin audit log table for sensitive data access
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs, nobody can modify them via RLS
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_log
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for efficient querying
CREATE INDEX idx_admin_audit_log_admin_id ON public.admin_audit_log(admin_id);
CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log(created_at DESC);
CREATE INDEX idx_admin_audit_log_resource_type ON public.admin_audit_log(resource_type);

-- Create a function to log admin actions (called from edge functions/app)
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_log_id UUID;
BEGIN
  -- Get the current user's ID
  v_admin_id := auth.uid();
  
  -- Verify the user is an admin
  IF NOT has_role(v_admin_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can log admin actions';
  END IF;
  
  -- Insert the audit log entry
  INSERT INTO public.admin_audit_log (admin_id, action, resource_type, resource_id, details)
  VALUES (v_admin_id, p_action, p_resource_type, p_resource_id, p_details)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Create a secure function for admin profile access that logs the access
CREATE OR REPLACE FUNCTION public.admin_get_profiles(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  referral_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_log_id UUID;
  v_result_count INTEGER;
BEGIN
  -- Get the current user's ID
  v_admin_id := auth.uid();
  
  -- Verify the user is an admin
  IF NOT has_role(v_admin_id, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  -- Log this access attempt BEFORE returning data
  INSERT INTO public.admin_audit_log (admin_id, action, resource_type, details)
  VALUES (
    v_admin_id,
    'bulk_view',
    'profiles',
    jsonb_build_object(
      'limit', p_limit,
      'offset', p_offset,
      'search', p_search,
      'timestamp', now()
    )
  )
  RETURNING id INTO v_log_id;
  
  -- Return the profiles with limited fields
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.avatar_url,
    p.created_at,
    p.referral_code
  FROM public.profiles p
  WHERE 
    p_search IS NULL 
    OR p.email ILIKE '%' || p_search || '%'
    OR p.full_name ILIKE '%' || p_search || '%'
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permission to authenticated users (admin check is inside the function)
GRANT EXECUTE ON FUNCTION public.log_admin_action TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_profiles TO authenticated;

-- Add comment explaining the audit system
COMMENT ON TABLE public.admin_audit_log IS 'Audit log for admin actions on sensitive data. Used to track and detect potential data exfiltration.';
COMMENT ON FUNCTION public.admin_get_profiles IS 'Secure function for admin profile access that automatically logs all access attempts.';