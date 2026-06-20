import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminInbox, InboxMessage } from "@/hooks/useAdminInbox";
import { supabase } from "@/integrations/supabase/client";
import { ThreadedMessageList, type MessageThread } from "./ThreadedMessageList";
import { ThreadDetail } from "./ThreadDetail";
import { ComposeEmail, type ComposeEmailRef, type DraftData } from "./ComposeEmail";
import { ScheduledEmailsManager } from "./ScheduledEmailsManager";
import { DraftsManager, type EmailDraft } from "./DraftsManager";
import { TestEmailButton } from "./TestEmailButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw, CheckCheck, Mail, Clock, ArrowDownLeft, ArrowUpRight, Inbox, Search, X, FileEdit, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

type MessageFilter = "all" | "received" | "sent";

export function AdminInbox() {
  const {
    messages,
    unreadCount,
    isLoading,
    isRefetching,
    error,
    markAsRead,
    markAllAsRead,
    deleteMessage,
    syncDeliveryStatuses,
    isSyncingDeliveryStatuses,
    refetch,
  } = useAdminInbox();

  const composeRef = useRef<ComposeEmailRef>(null);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [activeTab, setActiveTab] = useState("inbox");
  const [messageFilter, setMessageFilter] = useState<MessageFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch draft count
  const { data: draftCount = 0 } = useQuery({
    queryKey: ["email-drafts-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("email_drafts")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count || 0;
    },
  });

  // Filter messages based on direction and search query
  const filteredMessages = useMemo(() => {
    let filtered = messages;
    
    // Apply direction filter
    if (messageFilter === "received") filtered = filtered.filter(m => m.direction === "inbound");
    if (messageFilter === "sent") filtered = filtered.filter(m => m.direction === "outbound");
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        m.from_email.toLowerCase().includes(query) ||
        m.to_email.toLowerCase().includes(query) ||
        (m.subject?.toLowerCase().includes(query)) ||
        (m.body?.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [messages, messageFilter, searchQuery]);

  const handleSelectThread = (thread: MessageThread) => {
    setSelectedThread(thread);
    // Mark all unread inbound messages in thread as read
    thread.messages.forEach((message) => {
      if (!message.is_read && message.direction === "inbound") {
        markAsRead(message.id);
      }
    });
  };

  const handleThreadDeleted = () => {
    setSelectedThread(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[600px] gap-4">
        <p className="text-destructive">Error loading messages: {error}</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="inbox" className="gap-2">
            <Mail className="w-4 h-4" />
            Inbox
            {unreadCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="drafts" className="gap-2">
            <FileEdit className="w-4 h-4" />
            Drafts
            {draftCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-amber-500 text-white rounded-full">
                {draftCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-2">
            <Clock className="w-4 h-4" />
            Scheduled
          </TabsTrigger>
        </TabsList>
        
        {activeTab === "inbox" && (
          <div className="flex items-center gap-2">
            {/* Message Filter */}
            <Select value={messageFilter} onValueChange={(v) => setMessageFilter(v as MessageFilter)}>
              <SelectTrigger className="w-auto min-w-[150px] h-9 whitespace-nowrap">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Inbox className="h-4 w-4" />
                    All Messages
                  </div>
                </SelectItem>
                <SelectItem value="received">
                  <div className="flex items-center gap-2">
                    <ArrowDownLeft className="h-4 w-4 text-blue-500" />
                    Received
                  </div>
                </SelectItem>
                <SelectItem value="sent">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                    Sent
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <TestEmailButton />
            <ComposeEmail ref={composeRef} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => syncDeliveryStatuses()}
              disabled={isSyncingDeliveryStatuses}
            >
              <RotateCcw className={cn("w-4 h-4 mr-2", isSyncingDeliveryStatuses && "animate-spin")} />
              {isSyncingDeliveryStatuses ? "Syncing..." : "Sync status"}
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark all read
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isRefetching && "animate-spin")} />
              {isRefetching ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        )}
      </div>

      <TabsContent value="inbox" className="mt-0 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by sender, subject, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex gap-4 h-[calc(100vh-340px)] min-h-[500px]">
          <div className="w-1/3 min-w-[300px] border rounded-lg overflow-hidden bg-card">
            <ThreadedMessageList
              messages={filteredMessages}
              selectedThreadId={selectedThread?.id}
              onSelectThread={handleSelectThread}
            />
          </div>
          <div className="flex-1 border rounded-lg overflow-hidden bg-card">
            <ThreadDetail
              thread={selectedThread}
              onDelete={(id) => {
                deleteMessage(id);
                // Check if this was the last message in the thread
                if (selectedThread && selectedThread.messages.length <= 1) {
                  handleThreadDeleted();
                }
              }}
              onReply={(data) => composeRef.current?.openReply(data)}
              onForward={(data) => composeRef.current?.openForward(data)}
              onMarkAsRead={markAsRead}
            />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="drafts" className="mt-0">
        <DraftsManager 
          onEditDraft={(draft: EmailDraft) => {
            const draftData: DraftData = {
              id: draft.id,
              fromEmail: draft.from_email,
              toEmails: draft.to_emails || [],
              ccEmails: draft.cc_emails || [],
              bccEmails: draft.bcc_emails || [],
              subject: draft.subject,
              body: draft.body,
              htmlBody: draft.html_body,
              attachments: draft.attachments || null,
              replyToMessageId: draft.reply_to_message_id,
            };
            // Switch to inbox tab first so the ComposeEmail component is rendered
            setActiveTab("inbox");
            // Use setTimeout to ensure tab switch completes before opening draft
            setTimeout(() => {
              composeRef.current?.openDraft(draftData);
            }, 50);
          }}
        />
      </TabsContent>

      <TabsContent value="scheduled" className="mt-0">
        <ScheduledEmailsManager />
      </TabsContent>
    </Tabs>
  );
}
