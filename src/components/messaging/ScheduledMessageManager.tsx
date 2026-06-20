import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, XCircle, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useWhatsAppScheduledMessages } from "@/hooks/useWhatsAppScheduledMessages";
import { toast } from "sonner";

export function ScheduledMessageManager() {
  const { messages, isLoading, cancel } = useWhatsAppScheduledMessages();

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case "sent": return <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Sent</Badge>;
      case "failed": return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Failed</Badge>;
      case "cancelled": return <Badge variant="outline" className="gap-1"><XCircle className="h-3 w-3" /> Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCancel = (id: string) => {
    cancel.mutate(id, {
      onSuccess: () => toast.success("Scheduled message cancelled"),
      onError: (err: any) => toast.error(err.message),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Scheduled Messages ({messages.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No scheduled messages. Use the clock icon in conversations to schedule.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Scheduled For</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((msg) => (
                <TableRow key={msg.id}>
                  <TableCell className="font-medium">{msg.recipient_name || msg.recipient_phone}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {msg.message_text || `[${msg.media_type || "media"}]`}
                  </TableCell>
                  <TableCell className="text-sm">{format(new Date(msg.scheduled_at), "MMM d, yyyy h:mm a")}</TableCell>
                  <TableCell>{statusBadge(msg.status)}</TableCell>
                  <TableCell>
                    {msg.status === "pending" && (
                      <Button variant="ghost" size="sm" className="text-destructive h-7" onClick={() => handleCancel(msg.id)} disabled={cancel.isPending}>
                        Cancel
                      </Button>
                    )}
                    {msg.status === "failed" && msg.error_message && (
                      <span className="text-xs text-destructive" title={msg.error_message}>Error</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
