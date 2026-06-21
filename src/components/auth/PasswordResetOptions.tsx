import { useState } from "react";
import { ArrowLeft, Key, Loader2, Mail } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PasswordResetOptionsProps {
  onBack: () => void;
  onSuccess?: () => void;
}

type ResetView = "email-input" | "email-sent";

export function PasswordResetOptions({ onBack }: PasswordResetOptionsProps) {
  const [view, setView] = useState<ResetView>("email-input");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const sendResetEmail = async () => {
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/auth?mode=reset-password",
      });

      if (error) throw error;

      setView("email-sent");
    } catch {
      toast({
        title: "Error",
        description: "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setEmailError("");

    if (!email || !z.string().email().safeParse(email).success) {
      setEmailError("Please enter a valid email address");
      return;
    }

    await sendResetEmail();
  };

  if (view === "email-input") {
    return (
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Key className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Reset your password</h2>
          <p className="text-muted-foreground">
            Enter your email to get started
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="reset-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={isLoading}
              className={`pl-10 ${emailError ? "border-destructive" : ""}`}
            />
          </div>
          {emailError && (
            <p className="text-xs text-destructive">{emailError}</p>
          )}
        </div>

        <Button
          type="submit"
          variant="gradient"
          className="w-full"
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Sending...
            </>
          ) : (
            "Continue"
          )}
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to sign in
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-5 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
        <Mail className="w-8 h-8 text-green-500" />
      </div>
      <h2 className="text-2xl font-bold">Check your email</h2>
      <p className="text-muted-foreground text-sm">
        If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.
      </p>
      <Button onClick={onBack} variant="outline" className="w-full">
        Back to sign in
      </Button>
    </div>
  );
}
