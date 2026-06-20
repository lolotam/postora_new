// ═══════════════════════════════════════════════════════════════════════════
// TikTok Confirmation Dialog
// Explicit consent before posting (Section 5a & 5c compliance)
// ═══════════════════════════════════════════════════════════════════════════

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  CheckCircle2, 
  Clock, 
  Eye,
  Users,
  Lock,
  MessageCircle,
  Repeat2,
  Scissors,
  AlertTriangle,
  Video,
  Image as ImageIcon,
  Sparkles,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TikTokCreatorInfo } from "./settings/TikTokSettings";

interface TikTokConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPosting: boolean;
  
  // Media info
  mediaFiles: Array<{
    previewUrl?: string;
    fileType: "image" | "video" | "gif";
    file?: File;
  }>;
  caption: string;
  
  // Settings
  privacyLevel: string;
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  discloseContent: boolean;
  yourBrand: boolean;
  brandedContent: boolean;
  aiGenerated: boolean;
  
  // Creator info
  creatorInfo: TikTokCreatorInfo | null;
}

export function TikTokConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isPosting,
  mediaFiles,
  caption,
  privacyLevel,
  allowComment,
  allowDuet,
  allowStitch,
  discloseContent,
  yourBrand,
  brandedContent,
  aiGenerated,
  creatorInfo,
}: TikTokConfirmDialogProps) {
  const isVideo = mediaFiles.some(f => f.fileType === "video");
  const previewMedia = mediaFiles[0];
  
  // Estimate processing time based on file size
  const estimatedTime = useMemo(() => {
    if (!isVideo) return "~30 seconds";
    
    const videoFile = mediaFiles.find(f => f.fileType === "video")?.file;
    if (!videoFile) return "1-2 minutes";
    
    const sizeMB = videoFile.size / (1024 * 1024);
    
    if (sizeMB < 512) return "~30 seconds";
    if (sizeMB < 1024) return "~1 minute";
    if (sizeMB < 2048) return "~1-2 minutes";
    return "2+ minutes";
  }, [isVideo, mediaFiles]);

  const privacyInfo = useMemo(() => {
    switch (privacyLevel) {
      case "PUBLIC_TO_EVERYONE":
        return { label: "Everyone", icon: Users, color: "text-green-600" };
      case "MUTUAL_FOLLOW_FRIENDS":
        return { label: "Friends only", icon: Users, color: "text-blue-600" };
      case "SELF_ONLY":
        return { label: "Only me", icon: Lock, color: "text-amber-600" };
      case "FOLLOWER_OF_CREATOR":
        return { label: "Followers", icon: Eye, color: "text-purple-600" };
      default:
        return { label: privacyLevel, icon: Eye, color: "text-muted-foreground" };
    }
  }, [privacyLevel]);

  const getContentLabel = () => {
    if (brandedContent) return "Paid partnership";
    if (yourBrand) return "Promotional content";
    return null;
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00f2ea] to-[#ff0050] flex items-center justify-center">
              <span className="text-white text-xs font-bold">TT</span>
            </div>
            Confirm TikTok Post
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Account Info */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                {creatorInfo?.creator_avatar_url ? (
                  <img 
                    src={creatorInfo.creator_avatar_url} 
                    alt="" 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00f2ea] to-[#ff0050]" />
                )}
                <div>
                  <p className="font-medium text-foreground">
                    @{creatorInfo?.creator_username || creatorInfo?.creator_nickname || "Your account"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isVideo ? "Video post" : "Photo post"}
                  </p>
                </div>
                <Badge variant="secondary" className="ml-auto">
                  {isVideo ? <Video className="w-3 h-3 mr-1" /> : <ImageIcon className="w-3 h-3 mr-1" />}
                  {mediaFiles.length} {mediaFiles.length === 1 ? "file" : "files"}
                </Badge>
              </div>

              {/* Settings Summary */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <privacyInfo.icon className="w-4 h-4" />
                    Privacy
                  </span>
                  <span className={cn("font-medium", privacyInfo.color)}>
                    {privacyInfo.label}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Comments
                  </span>
                  <span className={allowComment ? "text-green-600 font-medium" : "text-muted-foreground"}>
                    {allowComment ? "Enabled" : "Disabled"}
                  </span>
                </div>

                {isVideo && (
                  <>
                    <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Repeat2 className="w-4 h-4" />
                        Duet
                      </span>
                      <span className={allowDuet ? "text-green-600 font-medium" : "text-muted-foreground"}>
                        {allowDuet ? "Enabled" : "Disabled"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                      <span className="text-muted-foreground flex items-center gap-2">
                        <Scissors className="w-4 h-4" />
                        Stitch
                      </span>
                      <span className={allowStitch ? "text-green-600 font-medium" : "text-muted-foreground"}>
                        {allowStitch ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                  </>
                )}

                {aiGenerated && (
                  <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      AI Label
                    </span>
                    <span className="text-primary font-medium">Enabled</span>
                  </div>
                )}

                {getContentLabel() && (
                  <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Disclosure
                    </span>
                    <span className="text-primary font-medium">{getContentLabel()}</span>
                  </div>
                )}

                {/* Caption Preview */}
                {caption && (
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground mb-1">Caption:</p>
                    <p className="text-sm line-clamp-2 bg-muted/30 p-2 rounded">
                      {caption}
                    </p>
                  </div>
                )}
              </div>

              {/* Processing Time Warning */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Processing may take <strong>{estimatedTime}</strong>
                    </p>
                    <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
                      After uploading, TikTok needs time to process your content. 
                      Moderation may take an additional 1-2 minutes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Inbox Reminder */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      Check your TikTok inbox
                    </p>
                    <p className="text-xs text-blue-700/80 dark:text-blue-300/80">
                      The post will be sent to your TikTok inbox for final review before publishing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPosting}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPosting}
            className="bg-[#fe2c55] hover:bg-[#fe2c55]/90"
          >
            <AnimatePresence mode="wait">
              {isPosting ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </motion.span>
              ) : (
                <motion.span
                  key="confirm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Post
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
