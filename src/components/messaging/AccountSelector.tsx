import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Facebook, Camera, MessageSquare } from "lucide-react";
import type { MessagingAccount } from "@/hooks/useMessaging";

interface AccountSelectorProps {
  accounts: MessagingAccount[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  platformFilter?: "facebook" | "instagram" | "whatsapp" | null;
}

export function AccountSelector({ accounts, selectedId, onSelect, platformFilter }: AccountSelectorProps) {
  const filtered = platformFilter
    ? accounts.filter((a) => a.platform === platformFilter)
    : accounts;

  if (filtered.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-3 border rounded-lg">
        No connected {platformFilter || "Facebook/Instagram"} accounts found. Connect one in Profiles.
      </div>
    );
  }

  return (
    <Select value={selectedId || ""} onValueChange={onSelect}>
      <SelectTrigger className="w-full max-w-xs">
        <SelectValue placeholder="Select an account" />
      </SelectTrigger>
      <SelectContent>
        {filtered.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={account.avatar_url || ""} />
                <AvatarFallback>
                  {account.platform === "facebook" ? <Facebook className="w-3 h-3" /> : account.platform === "whatsapp" ? <MessageSquare className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{account.platform_username || account.platform_user_id}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
