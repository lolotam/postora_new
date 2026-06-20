## Plan

1. **Securely update LinkedIn app credentials**
   - Store the new LinkedIn Client ID and Primary Client Secret as Supabase Edge Function secrets, not in source code.
   - Verify the admin credential UI continues to use `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`.

2. **Update LinkedIn OAuth scopes for Community Management API**
   - Change `supabase/functions/linkedin-oauth/index.ts` so the authorization URL requests the newly approved LinkedIn scopes needed for organization/page posting and community management.
   - Keep sign-in/profile scopes required by the existing `/v2/userinfo` flow.
   - Ensure organization ACL lookup remains compatible with the new `rw_organization_admin`, `r_organization_social*`, and `w_organization_social*` permissions.

3. **Improve LinkedIn connection reliability**
   - Preserve the current redirect URI: `https://api.postora.cloud/functions/v1/linkedin-oauth`.
   - Add safer error messages for missing scopes or token exchange failures so LinkedIn setup problems are easier to diagnose.

4. **Fix MCP connector registration for Claude Desktop/custom clients**
   - Review `mcp-oauth`, public well-known metadata, and MCP docs snippets.
   - Adjust OAuth metadata/DCR behavior if needed so clients that show “Couldn't register with postora.cloud's sign-in service” can either auto-register or use a clear manual OAuth Client ID fallback.
   - Keep provider-specific snippets for Claude Desktop, Claude Code, Cursor, ChatGPT, OpenCode, and Antigravity.

5. **Verify**
   - Check that the LinkedIn OAuth URL includes the intended scopes.
   - Check that MCP well-known discovery metadata points to the correct `mcp-oauth` registration/token/authorization endpoints.
   - Confirm no private secret is committed to the repository.