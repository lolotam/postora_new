import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Shield, ArrowLeft, Key, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

interface PasswordResetOptionsProps {
  onBack: () => void;
  onSuccess: () => void;
}

type ResetView = "email-input" | "choose-method" | "mfa-verify" | "mfa-password" | "email-sent";

interface MFAStatus {
  hasMFA: boolean;
  factorId?: string;
  userExists: boolean;
}

export function PasswordResetOptions({ onBack, onSuccess }: PasswordResetOptionsProps) {
  const [view, setView] = useState<ResetView>("email-input");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingMFA, setIsCheckingMFA] = useState(false);
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaVerified, setMfaVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const { toast } = useToast();

  const handleCheckMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");

    if (!email || !z.string().email().safeParse(email).success) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setIsCheckingMFA(true);

    try {
      const { data, error } = await supabase.functions.invoke("check-user-mfa", {
        body: { email },
      });

      if (error) throw error;

      setMfaStatus(data);

      if (!data.userExists) {
        // Don't reveal if user exists - just send "reset email" anyway for security
        toast({
          title: "Check your email",
          description: "If an account exists with this email, you'll receive a reset link.",
        });
        setView("email-sent");
      } else if (data.hasMFA) {
        // User has MFA - show options
        setView("choose-method");
      } else {
        // No MFA - send reset email directly
        await sendResetEmail();
      }
    } catch (error) {
      console.error("Error checking MFA:", error);
      // Fallback to sending reset email
      await sendResetEmail();
    } finally {
      setIsCheckingMFA(false);
    }
  };

  const sendResetEmail = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset-password`,
      });

      if (error) throw error;

      toast({
        title: "Check your email",
        description: "We've sent you a password reset link.",
      });
      setView("email-sent");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Verify MFA code only
  const handleVerifyMFA = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mfaCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the 6-digit code from your authenticator app",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Verify the MFA code first (without password)
      const { data, error } = await supabase.functions.invoke("verify-mfa-reset", {
        body: { email, code: mfaCode, verifyOnly: true },
      });

      if (error) throw error;

      if (data.verified) {
        setMfaVerified(true);
        setView("mfa-password");
        toast({
          title: "Code verified!",
          description: "Now set your new password.",
        });
      } else {
        throw new Error(data.error || "Invalid code");
      }
    } catch (error) {
      toast({
        title: "Invalid code",
        description: error instanceof Error ? error.message : "Please check your authenticator app",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Set new password after MFA verified
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-mfa-reset", {
        body: { email, code: mfaCode, newPassword },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Password reset!",
          description: "Your password has been changed. You can now sign in.",
        });
        onSuccess();
      } else {
        throw new Error(data.error || "Failed to reset password");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Email input view
  if (view === "email-input") {
    return (
      <form onSubmit={handleCheckMFA} className="space-y-5">
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
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isCheckingMFA}
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
          disabled={isCheckingMFA}
        >
          {isCheckingMFA ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Checking...
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

  // Choose method view - FIXED UI
  if (view === "choose-method") {
    return (
      <div className="space-y-5">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">2FA Enabled</h2>
          <p className="text-muted-foreground text-sm">
            Choose how to reset your password
          </p>
        </div>

        <div className="space-y-3">
          {/* Use Authenticator App Option - Fixed layout */}
          <Button
            onClick={() => setView("mfa-verify")}
            variant="outline"
            className="w-full h-auto py-4 px-4 justify-start"
          >
            <div className="flex items-center gap-3 w-full min-w-0">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="font-semibold">Use Authenticator App</div>
                <div className="text-xs text-muted-foreground truncate">
                  Verify with 2FA code
                </div>
              </div>
            </div>
          </Button>

          {/* Send Reset Email Option - Fixed layout */}
          <Button
            onClick={sendResetEmail}
            variant="outline"
            className="w-full h-auto py-4 px-4 justify-start"
            disabled={isLoading}
          >
            <div className="flex items-center gap-3 w-full min-w-0">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="font-semibold flex items-center gap-2">
                  Send Reset Email
                  {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  Receive a reset link via email
                </div>
              </div>
            </div>
          </Button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setView("email-input")}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Use different email
          </button>
        </div>
      </div>
    );
  }

  // Step 1: MFA Verify view - Enter code only
  if (view === "mfa-verify") {
    return (
      <form onSubmit={handleVerifyMFA} className="space-y-5">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Enter Authenticator Code</h2>
          <p className="text-muted-foreground text-sm">
            Open your authenticator app and enter the 6-digit code
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              1
            </div>
            <span className="text-xs text-primary font-medium">Verify Code</span>
          </div>
          <div className="w-8 h-px bg-border" />
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs">
              2
            </div>
            <span className="text-xs text-muted-foreground">Set Password</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mfa-code">Authenticator Code</Label>
          <Input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            placeholder="000000"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="text-center text-2xl tracking-[0.5em] font-mono h-14"
            maxLength={6}
            disabled={isLoading}
            autoFocus
          />
        </div>

        <Button
          type="submit"
          variant="gradient"
          className="w-full"
          size="lg"
          disabled={isLoading || mfaCode.length !== 6}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Verifying...
            </>
          ) : (
            "Verify Code"
          )}
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setMfaCode("");
              setView("choose-method");
            }}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Choose different method
          </button>
        </div>
      </form>
    );
  }

  // Step 2: Set new password (after MFA verified)
  if (view === "mfa-password") {
    return (
      <form onSubmit={handleSetPassword} className="space-y-5">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Set New Password</h2>
          <p className="text-muted-foreground text-sm">
            Code verified! Now create your new password
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">
              <CheckCircle className="w-4 h-4" />
            </div>
            <span className="text-xs text-green-500 font-medium">Verified</span>
          </div>
          <div className="w-8 h-px bg-green-500" />
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              2
            </div>
            <span className="text-xs text-primary font-medium">Set Password</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isLoading}
              className={passwordError ? "border-destructive" : ""}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">Confirm Password</Label>
            <Input
              id="confirm-new-password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              className={passwordError ? "border-destructive" : ""}
            />
            {passwordError && (
              <p className="text-xs text-destructive">{passwordError}</p>
            )}
          </div>
        </div>

        <Button
          type="submit"
          variant="gradient"
          className="w-full"
          size="lg"
          disabled={isLoading || newPassword.length < 6}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Resetting...
            </>
          ) : (
            "Reset Password"
          )}
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setNewPassword("");
              setConfirmPassword("");
              setPasswordError("");
              setView("mfa-verify");
            }}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to verification
          </button>
        </div>
      </form>
    );
  }

  // Email sent view
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
