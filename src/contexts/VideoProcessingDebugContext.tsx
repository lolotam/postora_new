/**
 * Context for video processing debug mode
 * When enabled, shows Cloudinary transformation details and logs to api_logs
 */

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface DebugInfo {
  transformation: string;
  request_id?: string;
  cloudinary_public_id?: string;
  video_metadata?: {
    width: number;
    height: number;
    duration?: number;
  };
  timestamp: Date;
  operation: "crop" | "compress";
  status: "success" | "error";
  error?: string;
}

interface VideoProcessingDebugContextType {
  debugMode: boolean;
  toggleDebugMode: () => void;
  setDebugMode: (enabled: boolean) => void;
  debugLogs: DebugInfo[];
  addDebugLog: (info: Omit<DebugInfo, "timestamp">) => void;
  clearDebugLogs: () => void;
}

const VideoProcessingDebugContext = createContext<VideoProcessingDebugContextType | null>(null);

export function VideoProcessingDebugProvider({ children }: { children: ReactNode }) {
  const [debugMode, setDebugModeState] = useState(() => {
    // Persist debug mode preference
    if (typeof window !== "undefined") {
      return localStorage.getItem("video_processing_debug") === "true";
    }
    return false;
  });
  
  const [debugLogs, setDebugLogs] = useState<DebugInfo[]>([]);

  const toggleDebugMode = useCallback(() => {
    setDebugModeState(prev => {
      const newValue = !prev;
      localStorage.setItem("video_processing_debug", String(newValue));
      return newValue;
    });
  }, []);

  const setDebugMode = useCallback((enabled: boolean) => {
    setDebugModeState(enabled);
    localStorage.setItem("video_processing_debug", String(enabled));
  }, []);

  const addDebugLog = useCallback((info: Omit<DebugInfo, "timestamp">) => {
    setDebugLogs(prev => [
      { ...info, timestamp: new Date() },
      ...prev.slice(0, 49), // Keep last 50 logs
    ]);
  }, []);

  const clearDebugLogs = useCallback(() => {
    setDebugLogs([]);
  }, []);

  return (
    <VideoProcessingDebugContext.Provider
      value={{
        debugMode,
        toggleDebugMode,
        setDebugMode,
        debugLogs,
        addDebugLog,
        clearDebugLogs,
      }}
    >
      {children}
    </VideoProcessingDebugContext.Provider>
  );
}

export function useVideoProcessingDebug() {
  const context = useContext(VideoProcessingDebugContext);
  if (!context) {
    throw new Error("useVideoProcessingDebug must be used within VideoProcessingDebugProvider");
  }
  return context;
}
