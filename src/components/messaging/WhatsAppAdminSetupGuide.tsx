import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Settings2,
  ChevronDown,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Loader2,
  X,
  PlugZap,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ConfigTestResult {
  mode: "cloud_api" | "coexistence";
  setting_key: string;
  config_id: string | null;
  valid: boolean;
  name?: string;
  feature_type?: string;
  error?: string;
}

interface ConfigTestResponse {
  cloud_api: ConfigTestResult;
  coexistence: ConfigTestResult;
  all_valid: boolean;
}

interface CopyableProps {
  value: string;
  label?: string;
}

function Copyable({ value, label }: CopyableProps) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`Copied ${label || "value"}`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1.5">
      <code className="flex-1 text-xs break-all font-mono text-foreground">{value}</code>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0 shrink-0"
        onClick={handleCopy}
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
      </Button>
    </div>
  );
}

interface StepProps {
  index: number;
  title: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
}

function Step({ index, title, href, hrefLabel, children }: StepProps) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold shrink-0">
            {index}
          </span>
          <h4 className="font-semibold text-sm">{title}</h4>
        </div>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {hrefLabel || "Open in Meta"}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      <div className="pl-8 space-y-2 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}

function ResultRow({ label, result }: { label: string; result: ConfigTestResult }) {
  return (
    <div className="rounded-md border bg-background p-2.5 space-y-1">
      <div className="flex items-center gap-2">
        {result.valid ? (
          <Check className="w-4 h-4 text-green-600 shrink-0" />
        ) : (
          <X className="w-4 h-4 text-destructive shrink-0" />
        )}
        <span className="text-xs font-semibold">{label}</span>
        <Badge
          variant="outline"
          className={`text-[10px] ml-auto ${
            result.valid
              ? "border-green-600/40 text-green-700 dark:text-green-400"
              : "border-destructive/40 text-destructive"
          }`}
        >
          {result.valid ? "Valid" : "Invalid"}
        </Badge>
      </div>
      {result.valid ? (
        <p className="text-xs text-muted-foreground pl-6">
          <span className="font-mono">{result.config_id}</span>
          {result.name && <> — {result.name}</>}
          {result.feature_type && (
            <span className="text-[10px] ml-1 opacity-70">({result.feature_type})</span>
          )}
        </p>
      ) : (
        <p className="text-xs text-destructive pl-6 break-words">{result.error}</p>
      )}
    </div>
  );
}

export function WhatsAppAdminSetupGuide() {
  const [open, setOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConfigTestResponse | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke<ConfigTestResponse>(
        "whatsapp-config-test",
        { body: {} },
      );
      if (error) throw error;
      if (!data) throw new Error("Empty response from server");
      setTestResult(data);
      if (data.all_valid) {
        toast.success("Both Config IDs are valid");
      } else {
        toast.error("One or more Config IDs failed validation");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Test failed";
      toast.error(msg);
      setTestResult(null);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="border-primary/30 bg-primary/[0.02]">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Settings2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Setup guide for admins
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Admin only
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Doc-accurate Meta App Dashboard configuration for Coexistence + Cloud API.
                  </CardDescription>
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-3">
            <Step
              index={1}
              title="Facebook Login for Business → Settings"
              href="https://developers.facebook.com/apps/"
              hrefLabel="Open App Dashboard"
            >
              <p>Add your domains under <strong>Allowed Domains for the JavaScript SDK</strong>:</p>
              <Copyable value="postora.cloud" label="domain" />
              <Copyable value="*.lovable.app" label="domain" />
              <p>Enable these toggles:</p>
              <ul className="list-disc pl-5 space-y-0.5 text-xs">
                <li>Client OAuth login</li>
                <li>Web OAuth login</li>
                <li>Enforce HTTPS</li>
                <li>Embedded Browser OAuth Login</li>
                <li>Strict Mode for redirect URIs</li>
                <li>Login with the JavaScript SDK</li>
              </ul>
            </Step>

            <Step
              index={2}
              title="Facebook Login for Business → Configurations"
              href="https://developers.facebook.com/apps/"
              hrefLabel="Create configuration"
            >
              <p>
                Click <strong>Create configuration</strong> and pick the{" "}
                <strong>WhatsApp Embedded Signup</strong> login variation. Create{" "}
                <strong>two</strong> configurations:
              </p>
              <div className="space-y-2 mt-2">
                <div className="rounded-md border border-blue-600/30 bg-blue-500/5 p-2.5 space-y-1">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                    (a) Postora — Cloud API
                  </p>
                  <p className="text-xs">
                    Products: <code className="bg-muted px-1 rounded">WhatsApp Business Platform Cloud API</code>
                  </p>
                </div>
                <div className="rounded-md border border-green-600/30 bg-green-500/5 p-2.5 space-y-1">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400">
                    (b) Postora — Coexistence
                  </p>
                  <p className="text-xs">
                    Products: <code className="bg-muted px-1 rounded">WhatsApp Business App Onboarding</code>
                  </p>
                </div>
              </div>
              <p className="text-xs mt-2">Copy each <strong>Configuration ID</strong> for Step 3.</p>
            </Step>

            <Step
              index={3}
              title="Postora → /admin/settings → App Credentials"
              href="/admin/settings"
              hrefLabel="Open Admin Settings"
            >
              <p>Paste the IDs from Step 2 into these settings keys:</p>
              <Copyable value="META_WHATSAPP_CONFIG_ID" label="key" />
              <Copyable value="META_WHATSAPP_COEXISTENCE_CONFIG_ID" label="key" />

              <div className="pt-2 space-y-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleTest}
                  disabled={testing}
                  className="w-full sm:w-auto"
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Testing…
                    </>
                  ) : (
                    <>
                      <PlugZap className="w-3.5 h-3.5" />
                      Test connection
                    </>
                  )}
                </Button>
                {testResult && (
                  <div className="space-y-2">
                    <ResultRow label="Cloud API" result={testResult.cloud_api} />
                    <ResultRow label="Coexistence" result={testResult.coexistence} />
                  </div>
                )}
              </div>
            </Step>

            <Step
              index={4}
              title="App Review → Permissions and Features (Advanced Access)"
              href="https://developers.facebook.com/apps/"
              hrefLabel="Open App Review"
            >
              <p>Request <strong>Advanced Access</strong> for:</p>
              <Copyable value="whatsapp_business_messaging" label="permission" />
              <Copyable value="whatsapp_business_management" label="permission" />
              <Copyable value="business_management" label="permission" />
            </Step>

            <Step
              index={5}
              title="WhatsApp → Configuration → Webhooks"
              href="https://developers.facebook.com/apps/"
              hrefLabel="Open Webhooks"
            >
              <p><strong>Callback URL:</strong></p>
              <Copyable
                value="https://api.postora.cloud/functions/v1/whatsapp-webhook"
                label="webhook URL"
              />
              <p>
                <strong>Verify token:</strong> the value of the{" "}
                <code className="bg-muted px-1 rounded">WHATSAPP_WEBHOOK_VERIFY_TOKEN</code> secret.
              </p>
              <p>Subscribe to these <strong>WhatsApp Business Account</strong> fields:</p>
              <ul className="space-y-1 text-xs">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <code className="bg-muted px-1 rounded">messages</code>
                  <span className="text-muted-foreground">— required for both modes</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <code className="bg-muted px-1 rounded">history</code>
                  <Badge variant="outline" className="text-[10px] border-green-600/40 text-green-700 dark:text-green-400">
                    Coexistence
                  </Badge>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <code className="bg-muted px-1 rounded">smb_app_state_sync</code>
                  <Badge variant="outline" className="text-[10px] border-green-600/40 text-green-700 dark:text-green-400">
                    Coexistence
                  </Badge>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <code className="bg-muted px-1 rounded">smb_message_echoes</code>
                  <Badge variant="outline" className="text-[10px] border-green-600/40 text-green-700 dark:text-green-400">
                    Coexistence
                  </Badge>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <code className="bg-muted px-1 rounded">account_update</code>
                  <span className="text-muted-foreground">— recommended</span>
                </li>
              </ul>
            </Step>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
