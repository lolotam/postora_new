import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  File,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface EmailAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  publicId: string;
}

interface EmailAttachmentsProps {
  attachments: EmailAttachment[];
  onAttachmentsChange: (attachments: EmailAttachment[]) => void;
  maxFiles?: number;
  maxSize?: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;

export function EmailAttachments({
  attachments,
  onAttachmentsChange,
  maxFiles = MAX_FILES,
  maxSize = MAX_FILE_SIZE,
}: EmailAttachmentsProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFile = async (file: File): Promise<EmailAttachment | null> => {
    try {
      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const fileData = btoa(binary);

      const { data, error } = await supabase.functions.invoke(
        "cloudinary-email-upload",
        {
          body: {
            action: "upload",
            fileData,
            fileName: file.name,
            contentType: file.type,
            folder: "outbound",
          },
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return {
        id: data.publicId,
        name: file.name,
        size: file.size,
        type: file.type,
        url: data.url,
        publicId: data.publicId,
      };
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (attachments.length + acceptedFiles.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed`);
        return;
      }

      const oversizedFiles = acceptedFiles.filter((f) => f.size > maxSize);
      if (oversizedFiles.length > 0) {
        toast.error(
          `Files must be under ${(maxSize / 1024 / 1024).toFixed(0)}MB`
        );
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      const newAttachments: EmailAttachment[] = [];
      const totalFiles = acceptedFiles.length;

      for (let i = 0; i < acceptedFiles.length; i++) {
        try {
          const attachment = await uploadFile(acceptedFiles[i]);
          if (attachment) {
            newAttachments.push(attachment);
          }
          setUploadProgress(((i + 1) / totalFiles) * 100);
        } catch (error) {
          toast.error(`Failed to upload ${acceptedFiles[i].name}`);
        }
      }

      onAttachmentsChange([...attachments, ...newAttachments]);
      setUploading(false);
      setUploadProgress(0);
    },
    [attachments, onAttachmentsChange, maxFiles, maxSize]
  );

  const removeAttachment = async (attachment: EmailAttachment) => {
    try {
      await supabase.functions.invoke("cloudinary-email-upload", {
        body: {
          action: "delete",
          publicId: attachment.publicId,
        },
      });
      onAttachmentsChange(attachments.filter((a) => a.id !== attachment.id));
    } catch (error) {
      console.error("Failed to remove attachment:", error);
      onAttachmentsChange(attachments.filter((a) => a.id !== attachment.id));
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading || attachments.length >= maxFiles,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/plain": [".txt"],
      "text/csv": [".csv"],
    },
  });

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return ImageIcon;
    if (type.includes("pdf") || type.includes("doc")) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
          isDragActive && "border-primary bg-primary/5",
          uploading && "opacity-50 cursor-not-allowed",
          attachments.length >= maxFiles && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Paperclip className="h-4 w-4" />
          {isDragActive ? (
            <span>Drop files here...</span>
          ) : uploading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading...
            </span>
          ) : attachments.length >= maxFiles ? (
            <span>Maximum {maxFiles} files reached</span>
          ) : (
            <span>Drag & drop files or click to browse</span>
          )}
        </div>
      </div>

      {uploading && <Progress value={uploadProgress} className="h-1" />}

      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment) => {
            const FileIcon = getFileIcon(attachment.type);
            return (
              <div
                key={attachment.id}
                className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 text-sm"
              >
                <FileIcon className="h-4 w-4 text-muted-foreground" />
                <span className="max-w-[150px] truncate">{attachment.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({formatFileSize(attachment.size)})
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => removeAttachment(attachment)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
