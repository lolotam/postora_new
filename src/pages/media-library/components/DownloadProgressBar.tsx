import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DownloadProgress } from "../types";

interface DownloadProgressBarProps {
  progress: DownloadProgress;
  onCancel: () => void;
}

export function DownloadProgressBar({ progress, onCancel }: DownloadProgressBarProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          <Download className="w-4 h-4 animate-pulse" />
          Downloading files...
        </span>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">
            {progress.current} / {progress.total}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onCancel}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <Progress
        value={(progress.current / progress.total) * 100}
        className="h-2"
      />
    </div>
  );
}
