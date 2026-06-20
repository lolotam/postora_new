import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useMessagingAccounts, useWhatsAppRegisterPhone } from "@/hooks/useMessaging";
import { toast } from "sonner";

/**
 * Shown for WhatsApp Coexistence accounts that have not yet completed
 * Cloud API registration. Explains the mandatory mobile-app step (disable
 * 2-step verification) and exposes a manual "Verify registration" button.
 */
export function WhatsAppCoexistenceSetupBanner() {
  const { accounts } = useMessagingAccounts();
  const register = useWhatsAppRegisterPhone();
  const [dismissed, setDismissed] = useState(false);

  const pendingAccounts = useMemo(() => {
    return accounts.filter((a) => {
      if (a.platform !== "whatsapp") return false;
      const meta = (a.account_metadata || {}) as Record<string, unknown>;
      const isCoexistence = meta.onboarding_type === "coexistence" || meta.is_coexistence === true;
      const registered = meta.cloud_api_registered === true;
      return isCoexistence && !registered;
    });
  }, [accounts]);

  if (dismissed || pendingAccounts.length === 0) return null;

  const handleVerify = async (socialAccountId: string, label: string) => {
    try {
      await register.mutateAsync({ socialAccountId });
      toast.success(`${label} is now registered with the Cloud API. You can send messages.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      toast.error(msg, { duration: 12000 });
    }
  };

  return (
    <Alert className="border-destructive/30 bg-destructive/5">
      <AlertTriangle className="h-4 w-4 text-destructive" />
      <AlertTitle className="text-destructive">
        One-time setup needed for WhatsApp Coexistence
      </AlertTitle>
      <AlertDescription className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Your number was onboarded via <strong>Coexistence</strong>. Before you can send messages
          through Postora, Meta requires you to <strong>turn off two-step verification</strong> in
          the WhatsApp Business mobile app — otherwise the Cloud API cannot register the number.
        </p>
        <ol className="list-decimal pl-5 text-muted-foreground space-y-1">
          <li>Open <strong>WhatsApp Business</strong> on the phone where this number is active.</li>
          <li>Go to <strong>Settings → Account → Two-step verification</strong>.</li>
          <li>Tap <strong>Turn off</strong> (enter your existing 6-digit PIN).</li>
          <li>Come back here and click <strong>Verify registration</strong> below.</li>
          <li>After success, you may re-enable 2-step verification in the mobile app.</li>
        </ol>

        <div className="space-y-2 pt-1">
          {pendingAccounts.map((acc) => {
            const label = acc.platform_username || acc.platform_user_id;
            return (
              <div
                key={acc.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/60 p-2"
              >
                <div className="flex items-center gap-2 text-sm">
                  <ShieldOff className="h-4 w-4 text-destructive" />
                  <span className="font-medium">{label}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleVerify(acc.id, label)}
                  disabled={register.isPending}
                >
                  {register.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                      Verify registration
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>
            Dismiss for now
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
