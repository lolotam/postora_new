import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Gauge } from "lucide-react";
import { useReplyQuota } from "@/hooks/useThreadsReplies";

interface Props {
  accountId: string | null;
}

function formatDuration(seconds?: number) {
  if (!seconds) return "rolling window";
  const h = Math.round(seconds / 3600);
  if (h >= 24) return `${Math.round(h / 24)} day window`;
  return `${h}h window`;
}

export function ThreadsReplyQuotaCard({ accountId }: Props) {
  const { data, isLoading, error } = useReplyQuota(accountId);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          Reply Quota
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2 w-full" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4" />
            <span>Quota unavailable for this account.</span>
          </div>
        )}

        {!isLoading && !error && data && (() => {
          const used = data.reply_quota_usage ?? 0;
          const total = data.reply_config?.quota_total ?? 1000;
          const pct = Math.min(100, Math.round((used / total) * 100));
          return (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">
                  {used.toLocaleString()} / {total.toLocaleString()} replies
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDuration(data.reply_config?.quota_duration)}
                </span>
              </div>
              <Progress value={pct} />
              <p className="text-xs text-muted-foreground">{pct}% used</p>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}