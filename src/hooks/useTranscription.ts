import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TranscriptionState {
  transcript: string;
  language: string;
  duration: number;
  isTranscribing: boolean;
  error: string | null;
}

export function useTranscription() {
  const [state, setState] = useState<TranscriptionState>({
    transcript: "",
    language: "",
    duration: 0,
    isTranscribing: false,
    error: null,
  });

  const transcribe = useCallback(async (mediaUrl: string) => {
    setState(prev => ({ ...prev, isTranscribing: true, error: null }));
    try {
      const { data, error } = await supabase.functions.invoke("transcribe-media", {
        body: { mediaUrl },
      });
      if (error) throw new Error(error.message || "Transcription failed");
      if (data?.error) throw new Error(data.error);
      setState({
        transcript: data.transcript || "",
        language: data.language || "unknown",
        duration: data.duration || 0,
        isTranscribing: false,
        error: null,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        isTranscribing: false,
        error: (err as Error).message,
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setState({ transcript: "", language: "", duration: 0, isTranscribing: false, error: null });
  }, []);

  return { ...state, transcribe, reset };
}
