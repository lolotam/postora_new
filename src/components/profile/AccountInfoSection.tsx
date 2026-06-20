import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Mail } from "lucide-react";

interface AccountInfoSectionProps {
  email: string | undefined;
  fullName: string | null | undefined;
}

export function AccountInfoSection({ email, fullName }: AccountInfoSectionProps) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Mail className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold">Account Information</h2>
          <p className="text-sm text-muted-foreground">
            Your account details
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={email || ""} disabled className="bg-muted/50" />
        </div>
        <div className="space-y-2">
          <Label>Full Name</Label>
          <Input value={fullName || ""} disabled className="bg-muted/50" />
        </div>
      </div>
    </div>
  );
}
