/**
 * TikTok Pre-Check Details Drawer
 * Shows exact detected video metadata and which rules caused warnings/failures
 */

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HardDrive,
  Info,
  Maximize2,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface VideoCheckDetail {
  label: string;
  status: "pending" | "checking" | "passed" | "warning" | "failed";
  message?: string;
  value?: string;
  detectedValue?: string | number;
  requiredValue?: string;
  rule?: string;
}

interface TikTokPreCheckDetailsProps {
  checks: VideoCheckDetail[];
  videoMetadata?: {
    width?: number;
    height?: number;
    duration?: number;
    fileSize?: number;
    format?: string;
  };
  lastCheckedAt?: Date | null;
  children?: React.ReactNode;
}

const TIKTOK_RULES = {
  format: {
    name: "Video Format",
    requirement: "MP4 or MOV",
    description: "TikTok requires videos in MP4 or MOV format.",
  },
  resolution: {
    name: "Resolution",
    requirement: "Minimum 540×960, recommended 720×1280+",
    description:
      "Videos below minimum resolution may be rejected. Higher resolutions provide better quality on the For You page.",
  },
  aspectRatio: {
    name: "Aspect Ratio",
    requirement: "9:16 (vertical)",
    description:
      "TikTok is optimized for vertical video. Horizontal videos will have black bars and lower engagement.",
  },
  duration: {
    name: "Duration",
    requirement: "Based on account's max_video_post_duration_sec",
    description:
      "Maximum duration varies by account. Check your TikTok Creator Info for your limit.",
  },
  fileSize: {
    name: "File Size",
    requirement: "500KB – 4GB",
    description: "Very small files may be corrupt. Files over 4GB cannot be uploaded.",
  },
};

export function TikTokPreCheckDetails({
  checks,
  videoMetadata,
  lastCheckedAt,
  children,
}: TikTokPreCheckDetailsProps) {
  const failedChecks = checks.filter((c) => c.status === "failed");
  const warningChecks = checks.filter((c) => c.status === "warning");
  const passedChecks = checks.filter((c) => c.status === "passed");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "passed":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getCheckIcon = (label: string) => {
    switch (label) {
      case "Format":
        return <Video className="w-4 h-4" />;
      case "Resolution":
      case "Aspect Ratio":
        return <Maximize2 className="w-4 h-4" />;
      case "Duration":
        return <Clock className="w-4 h-4" />;
      case "File Size":
        return <HardDrive className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getRuleForCheck = (label: string) => {
    const normalized = label.toLowerCase().replace(/\s+/g, "");
    switch (normalized) {
      case "aspectratio":
        return TIKTOK_RULES.aspectRatio;
      case "filesize":
        return TIKTOK_RULES.fileSize;
      case "format":
        return TIKTOK_RULES.format;
      case "resolution":
        return TIKTOK_RULES.resolution;
      case "duration":
        return TIKTOK_RULES.duration;
      default:
        return null;
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="text-xs gap-1">
            <Info className="w-3 h-3" />
            Details
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Video className="w-5 h-5" />
            TikTok Pre-Check Details
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Last Checked */}
          {lastCheckedAt && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Last checked</span>
              <span>{formatDistanceToNow(lastCheckedAt, { addSuffix: true })}</span>
            </div>
          )}

          {/* Detected Metadata */}
          {videoMetadata && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Detected Video Properties</h4>
              <div className="grid grid-cols-2 gap-3">
                {videoMetadata.width && videoMetadata.height && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="text-xs text-muted-foreground">Resolution</div>
                    <div className="font-mono text-sm font-medium">
                      {videoMetadata.width}×{videoMetadata.height}
                    </div>
                  </div>
                )}
                {videoMetadata.width && videoMetadata.height && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="text-xs text-muted-foreground">Aspect Ratio</div>
                    <div className="font-mono text-sm font-medium">
                      {(videoMetadata.width / videoMetadata.height).toFixed(2)}
                      {videoMetadata.height > videoMetadata.width && " (vertical)"}
                      {videoMetadata.width > videoMetadata.height && " (horizontal)"}
                    </div>
                  </div>
                )}
                {videoMetadata.duration != null && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="text-xs text-muted-foreground">Duration</div>
                    <div className="font-mono text-sm font-medium">
                      {Math.floor(videoMetadata.duration / 60)}:
                      {Math.floor(videoMetadata.duration % 60)
                        .toString()
                        .padStart(2, "0")}
                    </div>
                  </div>
                )}
                {videoMetadata.fileSize != null && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="text-xs text-muted-foreground">File Size</div>
                    <div className="font-mono text-sm font-medium">
                      {formatFileSize(videoMetadata.fileSize)}
                    </div>
                  </div>
                )}
                {videoMetadata.format && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="text-xs text-muted-foreground">Format</div>
                    <div className="font-mono text-sm font-medium">{videoMetadata.format}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Failed Checks */}
          {failedChecks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <h4 className="text-sm font-medium text-destructive">
                  Failed ({failedChecks.length})
                </h4>
              </div>
              <div className="space-y-2">
                {failedChecks.map((check, idx) => {
                  const rule = getRuleForCheck(check.label);
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-destructive/5 border border-destructive/30"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {getCheckIcon(check.label)}
                        <span className="font-medium text-sm">{check.label}</span>
                        {check.value && (
                          <Badge variant="outline" className="ml-auto text-xs">
                            {check.value}
                          </Badge>
                        )}
                      </div>
                      {check.message && (
                        <p className="text-xs text-destructive mb-2">{check.message}</p>
                      )}
                      {rule && (
                        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                          <strong>Required:</strong> {rule.requirement}
                          <br />
                          {rule.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Warning Checks */}
          {warningChecks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h4 className="text-sm font-medium text-amber-600">
                  Warnings ({warningChecks.length})
                </h4>
              </div>
              <div className="space-y-2">
                {warningChecks.map((check, idx) => {
                  const rule = getRuleForCheck(check.label);
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/30"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {getCheckIcon(check.label)}
                        <span className="font-medium text-sm">{check.label}</span>
                        {check.value && (
                          <Badge variant="outline" className="ml-auto text-xs">
                            {check.value}
                          </Badge>
                        )}
                      </div>
                      {check.message && (
                        <p className="text-xs text-amber-600 mb-2">{check.message}</p>
                      )}
                      {rule && (
                        <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                          <strong>Recommended:</strong> {rule.requirement}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Passed Checks */}
          {passedChecks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <h4 className="text-sm font-medium text-emerald-600">
                  Passed ({passedChecks.length})
                </h4>
              </div>
              <div className="space-y-2">
                {passedChecks.map((check, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/30"
                  >
                    <div className="flex items-center gap-2">
                      {getCheckIcon(check.label)}
                      <span className="font-medium text-sm">{check.label}</span>
                      {check.value && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          {check.value}
                        </Badge>
                      )}
                    </div>
                    {check.message && (
                      <p className="text-xs text-emerald-600 mt-1">{check.message}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TikTok Requirements Reference */}
          <Separator />
          <div className="space-y-3">
            <h4 className="text-sm font-medium">TikTok Video Requirements</h4>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>
                <strong>Format:</strong> MP4 or MOV
              </p>
              <p>
                <strong>Resolution:</strong> Minimum 540×960, recommended 720×1280 or higher
              </p>
              <p>
                <strong>Aspect Ratio:</strong> 9:16 (vertical) is optimal
              </p>
              <p>
                <strong>Duration:</strong> Check your account's max_video_post_duration_sec
              </p>
              <p>
                <strong>File Size:</strong> 500KB – 4GB
              </p>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
