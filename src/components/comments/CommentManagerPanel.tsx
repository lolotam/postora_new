import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CommentList } from "@/components/comments/CommentList";
import { CommentFilters } from "@/components/comments/CommentFilters";
import { useComments } from "@/hooks/useCommentInbox";
import { useSocialAccounts } from "@/hooks/useSocialAccounts";
import { RefreshCw, Loader2, Facebook, Camera } from "lucide-react";

interface CommentManagerPanelProps {
  platform: "facebook" | "instagram";
}

export function CommentManagerPanel({ platform }: CommentManagerPanelProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [hiddenFilter, setHiddenFilter] = useState("all");
  const [sentimentFilter, setSentimentFilter] = useState("all");

  const { data: socialAccounts = [] } = useSocialAccounts();

  const platformAccounts = useMemo(
    () => socialAccounts.filter((a) => a.platform === platform && a.is_active),
    [socialAccounts, platform]
  );

  const activeAccountId = selectedAccountId && platformAccounts.some((a) => a.id === selectedAccountId)
    ? selectedAccountId
    : platformAccounts[0]?.id || null;

  const activeAccount = platformAccounts.find((a) => a.id === activeAccountId);
  const pageId = platform === "facebook" ? activeAccount?.platform_user_id : undefined;
  const igUserId = platform === "instagram" ? activeAccount?.platform_user_id : undefined;

  const {
    data: comments = [],
    isLoading: commentsLoading,
    refetch,
    isFetching,
  } = useComments({
    platform,
    socialAccountId: activeAccountId,
    pageId,
    igUserId,
  });

  const EmptyIcon = platform === "facebook" ? Facebook : Camera;
  const emptyLabel = platform === "facebook" ? "No Facebook pages connected" : "No Instagram accounts connected";
  const emptyHint = platform === "facebook"
    ? "Connect a Facebook page to manage comments."
    : "Connect an Instagram account to manage comments.";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-4">
          {platformAccounts.length > 0 && (
            <Select
              value={activeAccountId || ""}
              onValueChange={setSelectedAccountId}
            >
              <SelectTrigger className="w-[220px] h-9">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {platformAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.platform_username || a.platform_user_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <CommentFilters
            sentimentFilter={sentimentFilter}
            onSentimentChange={setSentimentFilter}
            hiddenFilter={hiddenFilter}
            onHiddenChange={setHiddenFilter}
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
          Refresh
        </Button>
      </div>

      {platformAccounts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <EmptyIcon className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">{emptyLabel}</p>
          <p className="text-sm mt-1">{emptyHint}</p>
        </div>
      ) : commentsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <CommentList
          comments={comments}
          socialAccountId={activeAccountId!}
          hiddenFilter={hiddenFilter}
        />
      )}
    </div>
  );
}