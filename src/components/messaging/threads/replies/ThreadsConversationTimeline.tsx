import { useMemo } from "react";
import type { ThreadsReply } from "@/hooks/useThreadsReplies";
import { ThreadsReplyCard } from "./ThreadsReplyCard";
import { Card, CardContent } from "@/components/ui/card";
import { Inbox } from "lucide-react";

interface Props {
  accountId: string | null;
  mediaId: string | null;
  replies: ThreadsReply[];
  onReplyClick?: (reply: ThreadsReply) => void;
}

interface Node {
  reply: ThreadsReply;
  depth: number;
}

/**
 * Sort by timestamp ASC, then nest by `replied_to.id`.
 * If `replied_to` is null OR the parent is missing from the dataset → treat as root.
 */
function buildTimeline(replies: ThreadsReply[]): Node[] {
  const sorted = [...replies].sort((a, b) => {
    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return ta - tb;
  });

  const idSet = new Set(sorted.map((r) => r.id));
  const childrenByParent = new Map<string | null, ThreadsReply[]>();

  for (const r of sorted) {
    const parent = r.replied_to?.id;
    const key = parent && idSet.has(parent) ? parent : null;
    const list = childrenByParent.get(key) || [];
    list.push(r);
    childrenByParent.set(key, list);
  }

  const out: Node[] = [];
  const walk = (parentId: string | null, depth: number) => {
    const kids = childrenByParent.get(parentId) || [];
    for (const k of kids) {
      out.push({ reply: k, depth });
      walk(k.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export function ThreadsConversationTimeline({
  accountId,
  mediaId,
  replies,
  onReplyClick,
}: Props) {
  const nodes = useMemo(() => buildTimeline(replies), [replies]);

  if (nodes.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-2">
          <Inbox className="h-6 w-6 text-muted-foreground mx-auto" />
          <p className="text-sm font-medium">No conversation yet</p>
          <p className="text-xs text-muted-foreground">
            Once people reply on this thread, the conversation will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {nodes.map(({ reply, depth }) => (
        <ThreadsReplyCard
          key={reply.id}
          accountId={accountId}
          reply={reply}
          mediaId={mediaId}
          indent={Math.min(depth, 5)}
          onReplyClick={onReplyClick}
        />
      ))}
    </div>
  );
}