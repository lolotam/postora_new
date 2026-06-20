import { getPlatformName } from "@/components/PlatformIcon";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SocialProfile, SocialAccountWithProfile, useSocialAccountsByProfile } from "@/hooks/useSocialProfiles";

// Helper component to show account count in delete dialog
function DeleteProfileAccountCount({ profileId }: { profileId: string }) {
  const { data: accounts = [], isLoading } = useSocialAccountsByProfile(profileId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Checking connected accounts...
      </div>
    );
  }

  if (accounts.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
      <span className="text-sm text-amber-600 dark:text-amber-400">
        {accounts.length} social account{accounts.length > 1 ? "s" : ""} will be
        disconnected
      </span>
    </div>
  );
}

interface DeleteProfileDialogProps {
  profile: SocialProfile | null;
  onOpenChange: (open: boolean) => void;
  onDelete: (profile: SocialProfile) => void;
}

export function DeleteProfileDialog({
  profile,
  onOpenChange,
  onDelete,
}: DeleteProfileDialogProps) {
  return (
    <AlertDialog open={!!profile} onOpenChange={() => onOpenChange(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete profile "{profile?.name}"?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                This will permanently delete the profile and disconnect all
                associated social accounts. This action cannot be undone.
              </p>
              {profile && <DeleteProfileAccountCount profileId={profile.id} />}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => profile && onDelete(profile)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface DisconnectAccountDialogProps {
  account: SocialAccountWithProfile | null;
  onOpenChange: (open: boolean) => void;
  onDisconnect: (account: SocialAccountWithProfile) => void;
}

export function DisconnectAccountDialog({
  account,
  onOpenChange,
  onDisconnect,
}: DisconnectAccountDialogProps) {
  return (
    <AlertDialog open={!!account} onOpenChange={() => onOpenChange(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Disconnect {account && getPlatformName(account.platform)}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will remove access to your{" "}
            {account && getPlatformName(account.platform)} account. You won't be
            able to post to this platform until you reconnect.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => account && onDisconnect(account)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Disconnect
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
