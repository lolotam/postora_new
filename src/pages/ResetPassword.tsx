import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, Mail, Shield, KeyRound, Check } from "lucide-react";
import { z } from "zod";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/components/ui/input-otp";

type ResetView = "email" | "choose-method" | "email-sent" | "otp-verify" | "success";

interface MFAStatus {
  hasMFA: boolean;
  userExists: boolean;
}

export default function ResetPassword() {
  const [view, setView] = useState<ResetView>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateEmail = (email: string) => {
    return z.string().email().safeParse(email).success;
  };

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validateEmail(email)) {
      setErrors({ email: "Please enter a valid email address" });
      return;
    }

    setIsLoading(true);

    try {
      // Check if user has MFA enabled
      const { data, error } = await supabase.functions.invoke("check-user-mfa", {
        body: { email },
      });

      if (error) {
        throw error;
      }

      setMfaStatus({
        hasMFA: data.hasMFA || false,
        userExists: data.userExists || false,
      });

      if (data.hasMFA) {
        setView("choose-method");
      } else {
        // No MFA, go directly to email reset
        await handleSendEmailReset();
      }
    } catch (error) {
      console.error("Error checking MFA status:", error);
      // For security, don't reveal if user exists - send email anyway
      await handleSendEmailReset();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmailReset = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset-password`,
      });

      if (error) {
        throw error;
      }

      setView("email-sent");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async () => {
    setIsLoading(true);
    setDebugOtp(null);

    try {
      const { data, error } = await supabase.functions.invoke("send-reset-otp", {
        body: { email },
      });

      if (error) {
        throw error;
      }

      if (data.error === "MFA_NOT_ENABLED") {
        toast({
          title: "MFA not enabled",
          description: "Please use email reset instead.",
          variant: "destructive",
        });
        return;
      }

      // For development/testing - show debug OTP if returned
      if (data.debug_otp) {
        setDebugOtp(data.debug_otp);
      }

      setView("otp-verify");
      toast({
        title: "Code sent",
        description: "Check your email for the reset code.",
      });
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast({
        title: "Error",
        description: "Failed to send reset code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate inputs
    if (otp.length !== 6) {
      setErrors({ otp: "Please enter the 6-digit code from your email" });
      return;
    }

    if (mfaCode.length !== 6) {
      setErrors({ mfa: "Please enter the 6-digit code from your authenticator" });
      return;
    }

    if (newPassword.length < 6) {
      setErrors({ password: "Password must be at least 6 characters" });
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-reset-otp", {
        body: {
          email,
          otp,
          mfaCode,
          newPassword,
        },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setView("success");
      toast({
        title: "Password reset!",
        description: "Your password has been updated successfully.",
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      toast({
        title: "Error",
        description: "Failed to reset password. Please check your codes and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-accent/10 rounded-full blur-[128px]" />
      </div>

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative">
        <Link to="/auth" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>

        <div className="max-w-md">
          <Logo size="lg" className="mb-8" />
          <h1 className="text-4xl font-bold mb-4">Reset your password</h1>
          <p className="text-muted-foreground text-lg">
            {mfaStatus?.hasMFA
              ? "Use your authenticator app or email to verify your identity."
              : "We'll send you a link to reset your password."}
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          Secure password reset with optional MFA verification
        </p>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link to="/">
              <Logo size="lg" className="justify-center" />
            </Link>
          </div>

          <div className="bg-card/50 backdrop-blur-xl border border-border rounded-2xl p-8">
            {/* Email Input View */}
            {view === "email" && (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Forgot password?</h2>
                  <p className="text-muted-foreground">
                    Enter your email and we'll help you reset it
                  </p>
                </div>

                <form onSubmit={handleCheckEmail} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email}</p>
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
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>

                  <div className="text-center">
                    <Link to="/auth" className="text-sm text-primary hover:underline">
                      Back to sign in
                    </Link>
                  </div>
                </form>
              </>
            )}

            {/* Choose Method View */}
            {view === "choose-method" && (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Choose reset method</h2>
                  <p className="text-muted-foreground">
                    Your account has MFA enabled. How would you like to reset?
                  </p>
                </div>

                <div className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 px-4 flex items-start gap-4"
                    onClick={handleSendOTP}
                    disabled={isLoading}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <KeyRound className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Use MFA + OTP</p>
                      <p className="text-sm text-muted-foreground">
                        Verify with your authenticator app and email code
                      </p>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 px-4 flex items-start gap-4"
                    onClick={handleSendEmailReset}
                    disabled={isLoading}
                  >
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-accent" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Email reset link</p>
                      <p className="text-sm text-muted-foreground">
                        Receive a magic link to reset your password
                      </p>
                    </div>
                  </Button>
                </div>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => setView("email")}
                    className="text-sm text-primary hover:underline"
                  >
                    Use a different email
                  </button>
                </div>
              </>
            )}

            {/* Email Sent View */}
            {view === "email-sent" && (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Check your email</h2>
                  <p className="text-muted-foreground">
                    We've sent a password reset link to <strong>{email}</strong>
                  </p>
                </div>

                <div className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate("/auth")}
                  >
                    Back to sign in
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Didn't receive the email?{" "}
                    <button
                      onClick={handleSendEmailReset}
                      className="text-primary hover:underline"
                      disabled={isLoading}
                    >
                      Resend
                    </button>
                  </p>
                </div>
              </>
            )}

            {/* OTP Verify View */}
            {view === "otp-verify" && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Verify & Reset</h2>
                  <p className="text-muted-foreground text-sm">
                    Enter the code from your email and authenticator app
                  </p>
                </div>

                {/* Debug OTP display for development */}
                {debugOtp && (
                  <div className="mb-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">
                      Development Mode - Email OTP:
                    </p>
                    <p className="font-mono text-lg font-bold tracking-widest">
                      {debugOtp}
                    </p>
                  </div>
                )}

                <form onSubmit={handleVerifyAndReset} className="space-y-5">
                  <div className="space-y-2">
                    <Label>Email Code (from email)</Label>
                    <div className="flex justify-center">
                      <InputOTP
                        value={otp}
                        onChange={setOtp}
                        maxLength={6}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    {errors.otp && (
                      <p className="text-xs text-destructive text-center">{errors.otp}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Authenticator Code (from app)</Label>
                    <div className="flex justify-center">
                      <InputOTP
                        value={mfaCode}
                        onChange={setMfaCode}
                        maxLength={6}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    {errors.mfa && (
                      <p className="text-xs text-destructive text-center">{errors.mfa}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className={errors.password ? "border-destructive" : ""}
                    />
                    {errors.password && (
                      <p className="text-xs text-destructive">{errors.password}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className={errors.confirmPassword ? "border-destructive" : ""}
                    />
                    {errors.confirmPassword && (
                      <p className="text-xs text-destructive">{errors.confirmPassword}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    variant="gradient"
                    className="w-full"
                    size="lg"
                    disabled={isLoading || otp.length !== 6 || mfaCode.length !== 6}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Resetting...
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </Button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setView("choose-method")}
                      className="text-sm text-primary hover:underline"
                    >
                      Try a different method
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Success View */}
            {view === "success" && (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Password reset!</h2>
                  <p className="text-muted-foreground">
                    Your password has been updated successfully.
                  </p>
                </div>

                <Button
                  variant="gradient"
                  className="w-full"
                  size="lg"
                  onClick={() => navigate("/auth")}
                >
                  Sign in with new password
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
