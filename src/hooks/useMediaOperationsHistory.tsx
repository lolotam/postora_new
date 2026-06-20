import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Json } from "@/integrations/supabase/types";

export type OperationType =
  | "background_removal"
  | "upscale"
  | "crop"
  | "resize"
  | "filter"
  | "compress"
  | "batch_rename"
  | "batch_tools"
  | "image_edit"
  | "replace_file"
  | "upload"
  | "delete_file"
  | "delete_bulk"
  | "create_folder"
  | "delete_folder"
  | "rename_file"
  | "rename_folder"
  | "move_file"
  | "download";

export type OperationStatus = "processing" | "completed" | "failed";

export interface MediaOperation {
  id: string;
  user_id: string;
  media_file_id: string | null;
  operation_type: OperationType;
  status: OperationStatus;
  source_url: string | null;
  result_url: string | null;
  file_name: string | null;
  operation_details: Json;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface CreateOperationParams {
  mediaFileId?: string;
  operationType: OperationType;
  sourceUrl?: string;
  fileName?: string;
  operationDetails?: Json;
}

export interface UpdateOperationParams {
  status: OperationStatus;
  resultUrl?: string;
  errorMessage?: string;
  durationMs?: number;
}

export function useMediaOperationsHistory(filters?: {
  operationType?: OperationType | "all";
  status?: OperationStatus | "all";
  limit?: number;
}) {
  const { session } = useAuth();
  const userId = session?.user?.id;

  return useQuery({
    queryKey: ["media-operations-history", userId, filters],
    queryFn: async () => {
      if (!userId) return [];

      let query = supabase
        .from("media_operations_history")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (filters?.operationType && filters.operationType !== "all") {
        query = query.eq("operation_type", filters.operationType);
      }

      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(100);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MediaOperation[];
    },
    enabled: !!userId,
    refetchInterval: 10000, // Refresh every 10 seconds to update processing status
  });
}

export function useLogMediaOperation() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const createOperation = useMutation({
    mutationFn: async (params: CreateOperationParams) => {
      if (!userId) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("media_operations_history")
        .insert([
          {
            user_id: userId,
            media_file_id: params.mediaFileId || null,
            operation_type: params.operationType,
            source_url: params.sourceUrl || null,
            file_name: params.fileName || null,
            operation_details: params.operationDetails || {},
            status: "processing",
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data as MediaOperation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-operations-history"] });
    },
  });

  const updateOperation = useMutation({
    mutationFn: async ({
      operationId,
      updates,
    }: {
      operationId: string;
      updates: UpdateOperationParams;
    }) => {
      const updateData: {
        status: string;
        result_url?: string;
        error_message?: string;
        duration_ms?: number;
        completed_at?: string;
      } = {
        status: updates.status,
      };

      if (updates.resultUrl) {
        updateData.result_url = updates.resultUrl;
      }

      if (updates.errorMessage) {
        updateData.error_message = updates.errorMessage;
      }

      if (updates.durationMs !== undefined) {
        updateData.duration_ms = updates.durationMs;
      }

      if (updates.status === "completed" || updates.status === "failed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("media_operations_history")
        .update(updateData)
        .eq("id", operationId)
        .select()
        .single();

      if (error) throw error;
      return data as MediaOperation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-operations-history"] });
    },
  });

  const logOperation = async (
    params: CreateOperationParams
  ): Promise<string> => {
    const result = await createOperation.mutateAsync(params);
    return result.id;
  };

  const completeOperation = async (
    operationId: string,
    resultUrl?: string,
    durationMs?: number
  ) => {
    await updateOperation.mutateAsync({
      operationId,
      updates: { status: "completed", resultUrl, durationMs },
    });
  };

  const failOperation = async (
    operationId: string,
    errorMessage: string,
    durationMs?: number
  ) => {
    await updateOperation.mutateAsync({
      operationId,
      updates: { status: "failed", errorMessage, durationMs },
    });
  };

  return {
    logOperation,
    completeOperation,
    failOperation,
    isLogging: createOperation.isPending,
    isUpdating: updateOperation.isPending,
  };
}

export function useDeleteMediaOperations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (operationIds: string[]) => {
      const { error } = await supabase
        .from("media_operations_history")
        .delete()
        .in("id", operationIds);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-operations-history"] });
    },
  });
}

export function useClearAllMediaOperations() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user?.id;

  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("media_operations_history")
        .delete()
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media-operations-history"] });
    },
  });
}

// Helper to get operation type label
export function getOperationTypeLabel(type: OperationType): string {
  switch (type) {
    case "background_removal":
      return "Background Removal";
    case "upscale":
      return "Image Upscale";
    case "crop":
      return "Image Crop";
    case "resize":
      return "Image Resize";
    case "filter":
      return "Apply Filters";
    case "compress":
      return "Image Compress";
    case "batch_rename":
      return "Batch Rename";
    case "batch_tools":
      return "Batch Tools";
    case "image_edit":
      return "Image Edit";
    case "replace_file":
      return "File Replace";
    case "upload":
      return "File Upload";
    case "delete_file":
      return "File Delete";
    case "delete_bulk":
      return "Bulk Delete";
    case "create_folder":
      return "Create Folder";
    case "delete_folder":
      return "Delete Folder";
    case "rename_file":
      return "Rename File";
    case "rename_folder":
      return "Rename Folder";
    case "move_file":
      return "Move File";
    case "download":
      return "Download";
    default:
      return type;
  }
}

// Helper to get operation type icon name
export function getOperationTypeIcon(type: OperationType): string {
  switch (type) {
    case "background_removal":
      return "scissors";
    case "upscale":
      return "maximize-2";
    case "crop":
      return "crop";
    case "resize":
      return "move";
    case "filter":
      return "palette";
    case "compress":
      return "archive";
    case "batch_rename":
      return "edit-3";
    case "batch_tools":
      return "layers";
    case "image_edit":
      return "wand-2";
    case "replace_file":
      return "refresh-cw";
    case "upload":
      return "upload";
    case "delete_file":
      return "trash-2";
    case "delete_bulk":
      return "trash";
    case "create_folder":
      return "folder-plus";
    case "delete_folder":
      return "folder-minus";
    case "rename_file":
      return "pencil";
    case "rename_folder":
      return "folder-edit";
    case "move_file":
      return "folder-input";
    case "download":
      return "download";
    default:
      return "file";
  }
}
