import { PLATFORM_TOKEN_INFO } from "@/lib/tokenExpiryConstants";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Clock, RefreshCw, Info } from "lucide-react";

interface TokenLifetimeInfoProps {
  platform: string;
  compact?: boolean;
}

/**
 * Displays platform-specific token lifetime information
 * to help users understand when they might need to reconnect
 */
export function TokenLifetimeInfo({ platform, compact = false }: TokenLifetimeInfoProps) {
  const normalizedPlatform = platform.toLowerCase();
  const tokenInfo = PLATFORM_TOKEN_INFO[normalizedPlatform];

  if (!tokenInfo) {
    return null;
  }

  // Determine urgency level for styling
  const getUrgencyLevel = (): "critical" | "medium" | "low" => {
    const expirySeconds = tokenInfo.accessTokenExpirySeconds;
    if (expirySeconds <= 7200) return "critical"; // 2 hours or less
    if (expirySeconds <= 86400) return "medium"; // 24 hours or less
    return "low";
  };

  const urgency = getUrgencyLevel();

  const urgencyStyles = {
    critical: "bg-red-500/10 text-red-500 border-red-500/30",
    medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    low: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`text-[9px] gap-1 cursor-help whitespace-nowrap ${urgencyStyles[urgency]}`}
            >
              <Clock className="w-2.5 h-2.5" />
              {tokenInfo.accessTokenExpiry}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-2 text-xs">
              <p className="font-medium">{tokenInfo.platform} Token Info</p>
              <div className="space-y-1">
                <p className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Access:</span>
                  <span className="font-medium">{tokenInfo.accessTokenExpiry}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <RefreshCw className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Refresh:</span>
                  <span className="font-medium">{tokenInfo.refreshTokenExpiry}</span>
                </p>
              </div>
              {urgency === "critical" && (
                <p className="text-amber-500 text-[10px]">
                  ⚡ Auto-refreshed frequently. May need reconnection if offline.
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Full view with more details
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs cursor-help border ${urgencyStyles[urgency]}`}
          >
            <Clock className="w-3 h-3" />
            <span>{tokenInfo.accessTokenExpiry}</span>
            <Info className="w-3 h-3 opacity-60" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-sm p-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{tokenInfo.platform}</span>
              <span className="text-muted-foreground text-xs">Token Lifecycle</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <p className="text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Access Token
                </p>
                <p className="font-medium">{tokenInfo.accessTokenExpiry}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Refresh Token
                </p>
                <p className="font-medium">{tokenInfo.refreshTokenExpiry}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
              <p>{tokenInfo.notes}</p>
            </div>

            {urgency === "critical" && (
              <div className="pt-1 text-[10px] text-amber-500 flex items-start gap-1">
                <span>⚡</span>
                <span>Short-lived tokens are auto-refreshed. Extended offline periods may require reconnection.</span>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Badge showing which platforms need frequent reconnection
 */
export function ReconnectionFrequencyBadge({ platform }: { platform: string }) {
  const normalizedPlatform = platform.toLowerCase();
  const tokenInfo = PLATFORM_TOKEN_INFO[normalizedPlatform];

  if (!tokenInfo) return null;

  // Check refresh token expiry
  const refreshExpiry = tokenInfo.refreshTokenExpirySeconds;
  
  if (refreshExpiry === null) {
    // Continuous/indefinite refresh - rarely needs reconnection
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-600 border-green-500/30 cursor-help whitespace-nowrap">
              Auto-refresh
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="text-xs max-w-xs">
            <p>This platform has long-lived or continuous refresh tokens. Manual reconnection is rarely needed.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Calculate days until refresh token expires
  const daysUntilRefreshExpiry = Math.floor(refreshExpiry / 86400);
  
  if (daysUntilRefreshExpiry <= 90) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/30 cursor-help whitespace-nowrap">
              ~{daysUntilRefreshExpiry}d reconnect
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="text-xs max-w-xs">
            <p>Refresh token expires after {daysUntilRefreshExpiry} days. You may need to reconnect periodically.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-600 border-blue-500/30 cursor-help whitespace-nowrap">
            ~{Math.floor(daysUntilRefreshExpiry / 30)}mo refresh
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="text-xs max-w-xs">
          <p>Refresh token is valid for ~{Math.floor(daysUntilRefreshExpiry / 30)} months. Reconnection needed periodically.</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
