import { useCallback, useRef } from "react";

const SUCCESS_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const ERROR_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3";

export function useNotificationSound() {
  const successAudioRef = useRef<HTMLAudioElement | null>(null);
  const errorAudioRef = useRef<HTMLAudioElement | null>(null);

  const playSuccessSound = useCallback(() => {
    try {
      if (!successAudioRef.current) {
        successAudioRef.current = new Audio(SUCCESS_SOUND_URL);
        successAudioRef.current.volume = 0.5;
      }
      successAudioRef.current.currentTime = 0;
      successAudioRef.current.play().catch(() => {
        // Ignore autoplay errors - browser may block
      });
    } catch (e) {
      console.warn("Could not play success sound:", e);
    }
  }, []);

  const playErrorSound = useCallback(() => {
    try {
      if (!errorAudioRef.current) {
        errorAudioRef.current = new Audio(ERROR_SOUND_URL);
        errorAudioRef.current.volume = 0.5;
      }
      errorAudioRef.current.currentTime = 0;
      errorAudioRef.current.play().catch(() => {
        // Ignore autoplay errors - browser may block
      });
    } catch (e) {
      console.warn("Could not play error sound:", e);
    }
  }, []);

  return {
    playSuccessSound,
    playErrorSound,
  };
}
