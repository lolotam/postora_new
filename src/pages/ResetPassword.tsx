import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Loader2, Mail } from "lucide-react";
import { z } from "zod";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type ResetView = "email" | "email-sent" | "success";

export default function ResetPassword() {
  const [view, setView] = useState<ResetView>("email");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateEmail = (value: string) => z.string().email().safeParse(value).success;

  const handleSendEmailReset = async () => {
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
    setErrors({});

    if (!validateEmail(email)) {
      setErrors({ email: "Please enter a valid email address" });
      return;
    }

    await handleSendEmailReset();
  };

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-accent/10 rounded-full blur-[128px]" />
      </div>

      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative">
        <Link to="/auth" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>

        <div className="max-w-md">
          <Logo size="lg" className="mb-8" />
          <h1 className="text-4xl font-bold mb-4">Reset your password</h1>
          <p className="text-muted-foreground text-lg">
            We'll send you a link to reset your password.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          Secure password reset
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 text-center">
            <Link to="/">
              <Logo size="lg" className="justify-center" />
            </Link>
          </div>

          <div className="bg-card/50 backdrop-blur-xl border border-border rounded-2xl p-8">
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

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
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
                        Sending...
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

            {view === "email-sent" && (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Check your email</h2>
                  <p className="text-muted-foreground">
                    If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.
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
