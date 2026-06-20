-- ============================================================================
-- MCP OAuth 2.1 + Dynamic Client Registration storage
-- ============================================================================

-- 1) Registered MCP clients (Claude Desktop, ChatGPT, Antigravity, ...)
CREATE TABLE public.mcp_oauth_clients (
  client_id text PRIMARY KEY,
  client_secret_hash text,
  client_name text NOT NULL,
  client_uri text,
  logo_uri text,
  software_id text,
  software_version text,
  redirect_uris text[] NOT NULL DEFAULT '{}',
  grant_types text[] NOT NULL DEFAULT ARRAY['authorization_code','refresh_token'],
  response_types text[] NOT NULL DEFAULT ARRAY['code'],
  token_endpoint_auth_method text NOT NULL DEFAULT 'none',
  scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mcp_oauth_clients TO authenticated;
GRANT ALL ON public.mcp_oauth_clients TO service_role;

ALTER TABLE public.mcp_oauth_clients ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read the public client metadata (name/logo) for the
-- consent screen. Secret hash is never exposed via the API anyway.
CREATE POLICY "Authenticated can read mcp clients"
  ON public.mcp_oauth_clients FOR SELECT TO authenticated USING (true);

-- 2) Pending and completed authorization codes
CREATE TABLE public.mcp_oauth_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL REFERENCES public.mcp_oauth_clients(client_id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect_uri text NOT NULL,
  scope text,
  state text,
  code_challenge text NOT NULL,
  code_challenge_method text NOT NULL DEFAULT 'S256',
  code text UNIQUE,
  code_used_at timestamptz,
  consented_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mcp_oauth_auth_user ON public.mcp_oauth_authorizations(user_id);
CREATE INDEX idx_mcp_oauth_auth_code ON public.mcp_oauth_authorizations(code);
CREATE INDEX idx_mcp_oauth_auth_expires ON public.mcp_oauth_authorizations(expires_at);

GRANT SELECT, UPDATE ON public.mcp_oauth_authorizations TO authenticated;
GRANT ALL ON public.mcp_oauth_authorizations TO service_role;

ALTER TABLE public.mcp_oauth_authorizations ENABLE ROW LEVEL SECURITY;

-- A user can see / claim their own pending authorization row (used by the
-- consent page). The edge function does the actual mutation with service role.
CREATE POLICY "Users can view their pending authorizations"
  ON public.mcp_oauth_authorizations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- 3) Issued access + refresh tokens
CREATE TABLE public.mcp_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  refresh_token_hash text UNIQUE,
  client_id text NOT NULL REFERENCES public.mcp_oauth_clients(client_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scopes text[] NOT NULL DEFAULT '{}',
  expires_at timestamptz NOT NULL,
  refresh_expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  last_user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mcp_oauth_tokens_user ON public.mcp_oauth_tokens(user_id);
CREATE INDEX idx_mcp_oauth_tokens_hash ON public.mcp_oauth_tokens(token_hash);
CREATE INDEX idx_mcp_oauth_tokens_refresh ON public.mcp_oauth_tokens(refresh_token_hash);

-- Important: do NOT expose token_hash / refresh_token_hash to clients. We rely
-- on a view for the dashboard and only allow UPDATE of revoked_at for the user.
GRANT SELECT (id, client_id, user_id, scopes, expires_at, refresh_expires_at, revoked_at, last_used_at, last_user_agent, created_at)
  ON public.mcp_oauth_tokens TO authenticated;
GRANT UPDATE (revoked_at) ON public.mcp_oauth_tokens TO authenticated;
GRANT ALL ON public.mcp_oauth_tokens TO service_role;

ALTER TABLE public.mcp_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mcp tokens"
  ON public.mcp_oauth_tokens FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can revoke their own mcp tokens"
  ON public.mcp_oauth_tokens FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trigger to keep updated_at fresh on clients
CREATE TRIGGER update_mcp_oauth_clients_updated_at
  BEFORE UPDATE ON public.mcp_oauth_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime so the Connected MCP Clients dashboard updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.mcp_oauth_tokens;