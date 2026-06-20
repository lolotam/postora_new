/**
 * Hook for managing video processing presets per platform
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface VideoProcessingPreset {
  id: string;
  user_id: string;
  name: string;
  platform: "tiktok" | "instagram" | "youtube" | "general";
  preset_type: "crop" | "compress" | "both";
  crop_aspect_ratio?: string | null;
  compress_quality?: number | null;
  compress_max_size_mb?: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePresetInput {
  name: string;
  platform: "tiktok" | "instagram" | "youtube" | "general";
  preset_type: "crop" | "compress" | "both";
  crop_aspect_ratio?: string;
  compress_quality?: number;
  compress_max_size_mb?: number;
  is_default?: boolean;
}

// Platform-specific default presets
export const PLATFORM_DEFAULTS: Record<string, Partial<CreatePresetInput>> = {
  tiktok: {
    crop_aspect_ratio: "9:16",
    compress_quality: 80,
    compress_max_size_mb: 287, // TikTok limit
  },
  instagram: {
    crop_aspect_ratio: "9:16", // Reels
    compress_quality: 85,
    compress_max_size_mb: 100,
  },
  youtube: {
    crop_aspect_ratio: "9:16", // Shorts
    compress_quality: 90,
    compress_max_size_mb: 256,
  },
  general: {
    crop_aspect_ratio: "16:9",
    compress_quality: 80,
  },
};

export function useVideoProcessingPresets() {
  const [presets, setPresets] = useState<VideoProcessingPreset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch all presets for the current user
  const fetchPresets = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("video_processing_presets")
        .select("*")
        .eq("user_id", user.id)
        .order("platform", { ascending: true })
        .order("is_default", { ascending: false });

      if (error) throw error;
      
      // Type assertion since we know the shape matches
      setPresets((data || []) as unknown as VideoProcessingPreset[]);
    } catch (err) {
      console.error("Failed to fetch presets:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  // Create a new preset
  const createPreset = async (input: CreatePresetInput): Promise<VideoProcessingPreset | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // If setting as default, unset other defaults for this platform
      if (input.is_default) {
        await supabase
          .from("video_processing_presets")
          .update({ is_default: false })
          .eq("user_id", user.id)
          .eq("platform", input.platform);
      }

      const { data, error } = await supabase
        .from("video_processing_presets")
        .insert({
          user_id: user.id,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;

      const newPreset = data as unknown as VideoProcessingPreset;
      setPresets(prev => [...prev, newPreset]);
      
      toast({
        title: "Preset saved",
        description: `"${input.name}" preset for ${input.platform} created successfully.`,
      });

      return newPreset;
    } catch (err) {
      console.error("Failed to create preset:", err);
      toast({
        title: "Failed to save preset",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      return null;
    }
  };

  // Update an existing preset
  const updatePreset = async (id: string, updates: Partial<CreatePresetInput>): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // If setting as default, unset other defaults for this platform
      if (updates.is_default) {
        const preset = presets.find(p => p.id === id);
        if (preset) {
          await supabase
            .from("video_processing_presets")
            .update({ is_default: false })
            .eq("user_id", user.id)
            .eq("platform", preset.platform)
            .neq("id", id);
        }
      }

      const { error } = await supabase
        .from("video_processing_presets")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setPresets(prev => prev.map(p => 
        p.id === id ? { ...p, ...updates } as VideoProcessingPreset : p
      ));

      toast({
        title: "Preset updated",
        description: "Your preset has been updated successfully.",
      });

      return true;
    } catch (err) {
      console.error("Failed to update preset:", err);
      toast({
        title: "Failed to update preset",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      return false;
    }
  };

  // Delete a preset
  const deletePreset = async (id: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("video_processing_presets")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      setPresets(prev => prev.filter(p => p.id !== id));

      toast({
        title: "Preset deleted",
        description: "Your preset has been deleted.",
      });

      return true;
    } catch (err) {
      console.error("Failed to delete preset:", err);
      toast({
        title: "Failed to delete preset",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      return false;
    }
  };

  // Get presets for a specific platform
  const getPresetsForPlatform = useCallback((platform: string): VideoProcessingPreset[] => {
    return presets.filter(p => p.platform === platform || p.platform === "general");
  }, [presets]);

  // Get default preset for a platform
  const getDefaultPreset = useCallback((platform: string): VideoProcessingPreset | undefined => {
    return presets.find(p => p.platform === platform && p.is_default) ||
           presets.find(p => p.platform === "general" && p.is_default);
  }, [presets]);

  return {
    presets,
    isLoading,
    createPreset,
    updatePreset,
    deletePreset,
    getPresetsForPlatform,
    getDefaultPreset,
    refreshPresets: fetchPresets,
  };
}
