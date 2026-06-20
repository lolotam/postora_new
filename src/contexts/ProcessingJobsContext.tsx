import React, { createContext, useContext, ReactNode, useCallback, useRef } from "react";
import { ProcessingJob, ProcessingStatus, OperationType, useProcessingJobs } from "@/components/post/ProcessingStatusPanel";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationSound } from "@/hooks/useNotificationSound";

type RetryHandler = (job: ProcessingJob) => void;

interface ProcessingJobsContextType {
  jobs: ProcessingJob[];
  addJob: (job: Omit<ProcessingJob, "startedAt">) => void;
  updateJob: (jobId: string, updates: Partial<ProcessingJob>) => void;
  removeJob: (jobId: string) => void;
  clearCompleted: () => void;
  retryJob: (jobId: string) => void;
  registerRetryHandler: (handler: RetryHandler) => void;
}

const ProcessingJobsContext = createContext<ProcessingJobsContextType | null>(null);

export function ProcessingJobsProvider({ children }: { children: ReactNode }) {
  const processingJobs = useProcessingJobs();
  const retryHandlerRef = useRef<RetryHandler | null>(null);
  const { toast } = useToast();
  const { profile } = useAuth();
  const { playSuccessSound, playErrorSound } = useNotificationSound();

  // Check if sound is enabled from user preferences (default to true)
  const soundEnabled = profile?.notification_sound_enabled ?? true;

  const registerRetryHandler = useCallback((handler: RetryHandler) => {
    retryHandlerRef.current = handler;
  }, []);

  // Wrapper for updateJob that shows toast and plays sound on completion/failure
  const updateJobWithToast = useCallback((jobId: string, updates: Partial<ProcessingJob>) => {
    processingJobs.updateJob(jobId, updates);

    // Show toast and play sound when job completes or fails
    if (updates.status === "done") {
      const job = processingJobs.jobs.find(j => j.id === jobId);
      const operationName = job?.operation === "crop" ? "Crop" : 
                           job?.operation === "compress" ? "Compression" : "Processing";
      toast({
        title: `${operationName} Complete`,
        description: `${job?.fileName || "File"} has been processed successfully.`,
      });
      
      // Play success sound if enabled
      if (soundEnabled) {
        playSuccessSound();
      }
    } else if (updates.status === "error") {
      const job = processingJobs.jobs.find(j => j.id === jobId);
      const operationName = job?.operation === "crop" ? "Crop" : 
                           job?.operation === "compress" ? "Compression" : "Processing";
      toast({
        title: `${operationName} Failed`,
        description: updates.error || "An error occurred during processing.",
        variant: "destructive",
      });
      
      // Play error sound if enabled
      if (soundEnabled) {
        playErrorSound();
      }
    }
  }, [processingJobs, toast, soundEnabled, playSuccessSound, playErrorSound]);

  const retryJobWithHandler = useCallback((jobId: string) => {
    const job = processingJobs.jobs.find(j => j.id === jobId);
    if (job && retryHandlerRef.current) {
      // Reset job status first
      processingJobs.retryJob(jobId);
      // Then trigger the retry handler
      retryHandlerRef.current(job);
    } else {
      // Fallback to just resetting status
      processingJobs.retryJob(jobId);
    }
  }, [processingJobs]);

  return (
    <ProcessingJobsContext.Provider value={{
      ...processingJobs,
      updateJob: updateJobWithToast,
      retryJob: retryJobWithHandler,
      registerRetryHandler,
    }}>
      {children}
    </ProcessingJobsContext.Provider>
  );
}

export function useProcessingJobsContext() {
  const context = useContext(ProcessingJobsContext);
  if (!context) {
    throw new Error("useProcessingJobsContext must be used within a ProcessingJobsProvider");
  }
  return context;
}

// Re-export types for convenience
export type { ProcessingJob, ProcessingStatus, OperationType };
