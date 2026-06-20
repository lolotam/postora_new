-- Change api_key column from UUID to TEXT to support prefixed keys
ALTER TABLE public.profiles 
ALTER COLUMN api_key TYPE text USING api_key::text;

-- Update existing profiles that have old-format API keys (without postora- prefix)
UPDATE public.profiles 
SET api_key = 'postora-' || api_key 
WHERE api_key IS NOT NULL AND api_key NOT LIKE 'postora-%';