import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: string;
    completion: string;
    image?: string;
    request?: string;
  };
  context_length: number;
  architecture: {
    modality: string;
    input_modalities?: string[];
    output_modalities?: string[];
    tokenizer?: string;
    instruct_type?: string | null;
  };
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  per_request_limits?: Record<string, string> | null;
  supported_parameters?: string[];
  created?: number;
}

export function useOpenRouterModels() {
  return useQuery({
    queryKey: ['openrouter-models'],
    queryFn: async (): Promise<OpenRouterModel[]> => {
      const { data, error } = await supabase.functions.invoke('openrouter-models');
      if (error) throw new Error(error.message);
      return data?.data || [];
    },
    staleTime: 1000 * 60 * 30,
    retry: 2,
  });
}

export function extractSeries(id: string): string {
  return id.split('/')[0] || 'unknown';
}

export function formatPrice(price: string | undefined): string {
  if (!price) return 'Free';
  const num = parseFloat(price);
  if (num === 0) return 'Free';
  const perMillion = num * 1_000_000;
  return perMillion < 1 ? `$${perMillion.toFixed(4)}/M` : `$${perMillion.toFixed(2)}/M`;
}
