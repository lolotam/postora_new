import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  AIProvider,
  AIModel,
  DefaultModel,
  CategoryDefaults,
  CategoryFallbacks,
  AIConfigData,
  ModelCategory,
} from './ai-config/types';

export type { AIProvider, AIModel, DefaultModel, CategoryDefaults, CategoryFallbacks, AIConfigData, ModelCategory };

function parseDefault(val: unknown): DefaultModel | null {
  if (!val || typeof val !== 'object') return null;
  const obj = val as Record<string, string>;
  if (obj.provider_code && obj.model_id) return { provider_code: obj.provider_code, model_id: obj.model_id };
  return null;
}

const emptyCategoryDefaults: CategoryDefaults = { chat: null, image: null, tts: null, video: null, search: null, stt: null };
const emptyCategoryFallbacks: CategoryFallbacks = { chat: null, image: null, tts: null, video: null, search: null, stt: null };

export function useAIConfiguration() {
  return useQuery({
    queryKey: ['ai-config'],
    queryFn: async (): Promise<AIConfigData> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { providers: [], models: [], defaultModel: null, categoryDefaults: { ...emptyCategoryDefaults }, categoryFallbacks: { ...emptyCategoryFallbacks } };
      }

      const [providersResult, modelsResult, settingsResult] = await Promise.all([
        supabase.from('ai_providers' as any).select('*').order('name'),
        supabase.from('ai_models' as any).select('*, ai_providers(provider_code, name)').order('name'),
        supabase.from('system_settings' as any).select('*').like('key', 'default_ai_model%'),
      ]);

      const providers = (providersResult.data || []) as unknown as AIProvider[];
      const models = (modelsResult.data || []) as unknown as AIModel[];
      const settings = (settingsResult.data || []) as any[];

      let defaultModel: DefaultModel | null = null;
      const categoryDefaults: CategoryDefaults = { ...emptyCategoryDefaults };
      const categoryFallbacks: CategoryFallbacks = { ...emptyCategoryFallbacks };

      for (const s of settings) {
        const parsed = parseDefault(s.value);
        if (s.key === 'default_ai_model') defaultModel = parsed;
        else if (s.key === 'default_ai_model_chat') categoryDefaults.chat = parsed;
        else if (s.key === 'default_ai_model_image') categoryDefaults.image = parsed;
        else if (s.key === 'default_ai_model_tts') categoryDefaults.tts = parsed;
        else if (s.key === 'default_ai_model_video') categoryDefaults.video = parsed;
        else if (s.key === 'default_ai_model_search') categoryDefaults.search = parsed;
        else if (s.key === 'default_ai_model_stt') categoryDefaults.stt = parsed;
        else if (s.key === 'default_ai_model_chat_fallback') categoryFallbacks.chat = parsed;
        else if (s.key === 'default_ai_model_image_fallback') categoryFallbacks.image = parsed;
        else if (s.key === 'default_ai_model_tts_fallback') categoryFallbacks.tts = parsed;
        else if (s.key === 'default_ai_model_video_fallback') categoryFallbacks.video = parsed;
        else if (s.key === 'default_ai_model_search_fallback') categoryFallbacks.search = parsed;
        else if (s.key === 'default_ai_model_stt_fallback') categoryFallbacks.stt = parsed;
      }

      return { providers, models, defaultModel, categoryDefaults, categoryFallbacks };
    },
    retry: false,
  });
}

export function useSetDefaultModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ provider_code, model_id, category }: { provider_code: string; model_id: string; category?: ModelCategory }) => {
      const key = category ? `default_ai_model_${category}` : 'default_ai_model';
      const { error } = await supabase
        .from('system_settings' as any)
        .upsert({ key, value: { provider_code, model_id }, updated_at: new Date().toISOString() } as any, { onConflict: 'key' } as any);
      if (error) throw new Error(error.message);
      return { success: true, provider_code, model_id, category };
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ai-config'] }); },
  });
}

export function useSetFallbackModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ provider_code, model_id, category }: { provider_code: string; model_id: string; category: ModelCategory }) => {
      const key = `default_ai_model_${category}_fallback`;
      const { error } = await supabase
        .from('system_settings' as any)
        .upsert({ key, value: { provider_code, model_id }, updated_at: new Date().toISOString() } as any, { onConflict: 'key' } as any);
      if (error) throw new Error(error.message);
      return { success: true, provider_code, model_id, category };
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ai-config'] }); },
  });
}

export function useToggleProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ provider_id, is_active }: { provider_id: string; is_active: boolean }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-config?action=toggle-provider`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ provider_id, is_active }),
        }
      );
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'Failed');
      }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ai-config'] }); },
  });
}

export function useToggleModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ model_id, is_active }: { model_id: string; is_active: boolean }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-config?action=toggle-model`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id, is_active }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ai-config'] }); },
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: async ({ provider_id }: { provider_id: string }) => {
      const { data, error } = await supabase.functions.invoke('ai-config', {
        body: { action: 'test-connection', provider_id },
      });
      if (error) throw new Error(error.message || 'Connection test failed');
      if (data?.error) throw new Error(data.error);
      return data;
    },
  });
}

export function useSetServiceKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ provider_code, api_key }: { provider_code: string; api_key: string }) => {
      const { data, error } = await supabase.functions.invoke('ai-config', {
        body: { action: 'set-service-key', provider_code, api_key },
      });
      if (error) throw new Error(error.message || 'Failed to save key');
      return data;
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['service-keys'] });
    },
  });
}

export function useTestService() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ provider_code }: { provider_code: string }) => {
      const { data, error } = await supabase.functions.invoke('ai-config', {
        body: { action: 'test-service', provider_code },
      });
      if (error) throw new Error(error.message || 'Test failed');
      return data;
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['service-keys'] });
    },
  });
}

export function useCheckServiceKey(providerCodes: string[] = ['firecrawl', 'apify']) {
  return useQuery({
    queryKey: ['service-keys', ...providerCodes],
    queryFn: async () => {
      const results: Record<string, boolean> = {};
      for (const code of providerCodes) {
        const { data, error } = await supabase.functions.invoke('ai-config', {
          body: { action: 'check-service-key', provider_code: code },
        });
        results[code] = !error && data?.has_key === true;
      }
      return results;
    },
  });
}
