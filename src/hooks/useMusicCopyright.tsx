import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MusicInfo {
  title: string;
  artist: string;
  album: string;
  label: string;
  releaseDate?: string;
  score?: number;
  externalIds?: {
    isrc?: string;
    upc?: string;
  };
  externalMetadata?: {
    spotify?: { track?: { id: string } };
    youtube?: { vid?: string };
    deezer?: { track?: { id: string } };
  };
}

interface CopyrightCheckResult {
  hasCopyrightedMusic: boolean;
  musicInfo?: MusicInfo;
  message?: string;
  error?: string;
}

export function useMusicCopyright() {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<CopyrightCheckResult | null>(null);

  const checkMusicCopyright = async (fileUrl: string): Promise<CopyrightCheckResult> => {
    setIsChecking(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('check-music-copyright', {
        body: { fileUrl }
      });

      if (error) {
        console.error('Music copyright check error:', error);
        toast.error('Failed to check music copyright');
        const errorResult: CopyrightCheckResult = { 
          hasCopyrightedMusic: false, 
          error: error.message 
        };
        setResult(errorResult);
        return errorResult;
      }

      setResult(data);
      
      if (data.hasCopyrightedMusic && data.musicInfo) {
        toast.warning(
          `Copyrighted music detected: "${data.musicInfo.title}" by ${data.musicInfo.artist}`,
          { duration: 8000 }
        );
      }

      return data;
    } catch (err) {
      console.error('Music copyright check failed:', err);
      const errorResult: CopyrightCheckResult = { 
        hasCopyrightedMusic: false, 
        error: 'Check failed' 
      };
      setResult(errorResult);
      return errorResult;
    } finally {
      setIsChecking(false);
    }
  };

  const clearResult = () => {
    setResult(null);
  };

  return {
    checkMusicCopyright,
    isChecking,
    result,
    clearResult
  };
}
