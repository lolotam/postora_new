import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Building2, Eye, Type, FileText, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPlatformProfileUrl } from "@/lib/platformProfileUrls";

export type LinkedInVisibility = "PUBLIC" | "CONNECTIONS" | "LOGGED_IN" | "CONTAINER";

export interface LinkedInPage {
  id: string;
  name: string;
  vanityName?: string;
  logoUrl?: string;
}

interface SelectedAccount {
  id: string;
  platform_username: string | null;
  platform_user_id?: string | null;
  avatar_url: string | null;
  account_metadata?: Record<string, unknown> | null;
}

interface LinkedInSettingsProps {
  visibility: LinkedInVisibility;
  setVisibility: (v: LinkedInVisibility) => void;
  linkedInTitle: string;
  setLinkedInTitle: (v: string) => void;
  linkedInDescription: string;
  setLinkedInDescription: (v: string) => void;
  selectedPageId: string;
  setSelectedPageId: (v: string) => void;
  availablePages?: LinkedInPage[];
  selectedAccounts?: SelectedAccount[];
}

export function LinkedInSettings({
  visibility,
  setVisibility,
  linkedInTitle,
  setLinkedInTitle,
  linkedInDescription,
  setLinkedInDescription,
  selectedPageId,
  setSelectedPageId,
  availablePages = [],
  selectedAccounts = [],
}: LinkedInSettingsProps) {
  return (
    <div className="space-y-4">
      {/* Posting to LinkedIn as: */}
      {selectedAccounts.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Posting to LinkedIn as:</Label>
          <div className="flex flex-wrap gap-2">
            {selectedAccounts.map((account) => {
              const profileUrl = getPlatformProfileUrl("linkedin", account.platform_username, account.platform_user_id, account.account_metadata);
              return (
                <a
                  key={account.id}
                  href={profileUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-2 p-2 bg-secondary/50 rounded-lg border transition-colors",
                    profileUrl && "hover:bg-secondary hover:border-primary/30 cursor-pointer"
                  )}
                  onClick={(e) => !profileUrl && e.preventDefault()}
                >
                  {account.avatar_url ? (
                    <img
                      src={account.avatar_url}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={cn("w-8 h-8 rounded-full bg-[#0A66C2] flex items-center justify-center text-white text-xs font-bold", account.avatar_url && "hidden")}>
                    in
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium flex items-center gap-1">
                      {account.platform_username || "Unknown"}
                      {profileUrl && <ExternalLink className="w-3 h-3 text-muted-foreground" />}
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}
      {/* Post to LinkedIn Page */}
      <div className="space-y-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Label className="text-sm font-medium flex items-center gap-2 cursor-help">
                <Building2 className="w-4 h-4" />
                Post to LinkedIn Page (Optional)
              </Label>
            </TooltipTrigger>
            <TooltipContent>
              <p>Post to a company page you manage instead of your personal profile</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Select value={selectedPageId} onValueChange={setSelectedPageId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Post to Personal Profile" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="personal">
              <span>Post to Personal Profile</span>
            </SelectItem>
            {availablePages.map((page) => (
              <SelectItem key={page.id} value={page.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={page.logoUrl} alt={page.name} />
                    <AvatarFallback className="text-xs">
                      {page.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span>{page.name}</span>
                    {page.vanityName && (
                      <span className="text-xs text-muted-foreground">{page.vanityName}</span>
                    )}
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Visibility and Title Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Visibility */}
        <div className="space-y-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Label className="text-sm font-medium flex items-center gap-2 cursor-help">
                  <Eye className="w-4 h-4" />
                  Visibility
                </Label>
              </TooltipTrigger>
              <TooltipContent>
                <p>Control who can see your post on LinkedIn</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Select value={visibility} onValueChange={(v) => setVisibility(v as LinkedInVisibility)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PUBLIC">PUBLIC</SelectItem>
              <SelectItem value="CONNECTIONS">CONNECTIONS</SelectItem>
              <SelectItem value="LOGGED_IN">LOGGED_IN</SelectItem>
              <SelectItem value="CONTAINER">CONTAINER</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* LinkedIn Title */}
        <div className="space-y-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Label className="text-sm font-medium flex items-center gap-2 cursor-help">
                  <Type className="w-4 h-4" />
                  LinkedIn Title (optional)
                </Label>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add a custom title that appears above your post content</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Textarea
            placeholder="Custom title for LinkedIn"
            className="min-h-[40px] resize-y"
            value={linkedInTitle}
            onChange={(e) => setLinkedInTitle(e.target.value)}
          />
        </div>
      </div>

      {/* LinkedIn Description */}
      <div className="space-y-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Label className="text-sm font-medium flex items-center gap-2 cursor-help">
                <FileText className="w-4 h-4" />
                LinkedIn Description (optional)
              </Label>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add additional context or details specific to your LinkedIn audience</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Textarea
          placeholder="LinkedIn description"
          className="min-h-[80px] resize-y"
          value={linkedInDescription}
          onChange={(e) => setLinkedInDescription(e.target.value)}
        />
      </div>
    </div>
  );
}
