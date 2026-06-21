import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Send, Zap, TestTube, Loader2, CheckCircle2, XCircle, Clock, ChevronsUpDown, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface WhatsAppDiagnosticsProps {
  socialAccountId: string;
  phoneNumberId: string;
}

interface TestResult {
  status: "success" | "error" | "pending";
  message: string;
  data?: unknown;
  timestamp: string;
}

interface ContactOption {
  phone: string; // digits only
  label: string;
  source: "contact" | "conversation";
}

async function callApi(action: string, body: Record<string, unknown>) {
  let { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    session = refreshed.session;
    if (!session?.access_token) throw new Error("Not authenticated");
  }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(
    `${supabaseUrl}/functions/v1/messaging-api`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ action, ...body }),
    }
  );
  return res.json();
}

async function callWebhookTest(payload: unknown) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const res = await fetch(
    `${supabaseUrl}/functions/v1/whatsapp-webhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
  return res.json();
}

function parseConversationPhone(conversationId: string): string | null {
  // Format: wa_{phoneNumberId}_{normalizedPhone}
  const match = conversationId.match(/^wa_[^_]+_(\d+)$/);
  return match ? match[1] : null;
}

/**
 * Map a raw Meta WhatsApp error message into something actionable.
 * Returns null when no friendly mapping is known.
 */
function mapWhatsAppError(raw: string): string | null {
  if (!raw) return null;
  if (raw.includes("131058") || raw.toLowerCase().includes("hello world templates can only be sent from the public test numbers")) {
    return "Meta only allows the 'hello_world' template to be sent from Public Test Numbers. Your business number must use one of YOUR own approved templates instead. Open WhatsApp Manager → Message Templates, copy an approved template name (e.g. one you submitted), and use that name here.";
  }
  if (raw.includes("131047")) {
    return "Recipient is outside the 24-hour customer service window. Send an approved Template Message instead of freeform text.";
  }
  if (raw.includes("131026")) {
    return "Recipient hasn't accepted WhatsApp's new Terms or the number is not a valid WhatsApp user.";
  }
  if (raw.includes("132000") || raw.includes("132001") || raw.includes("132005")) {
    return "Template parameters/format don't match the approved template. Re-check parameter count and language code.";
  }
  if (raw.includes("190") || raw.toLowerCase().includes("access token")) {
    return "WhatsApp access token is invalid or expired. Reconnect the WhatsApp account.";
  }
  return null;
}

export function WhatsAppDiagnostics({ socialAccountId, phoneNumberId }: WhatsAppDiagnosticsProps) {
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Hello from Postora! 🚀");
  const [templateName, setTemplateName] = useState("");
  const [templateLang, setTemplateLang] = useState("en_US");
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Load saved contacts + past conversation participants
  const { data: contacts = [] } = useQuery({
    queryKey: ["whatsapp-contacts-picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_contacts")
        .select("phone_number, display_name")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ["whatsapp-cache-picker", socialAccountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messaging_cache")
        .select("conversation_id, participant_name")
        .eq("platform", "whatsapp")
        .eq("social_account_id", socialAccountId)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const recipientOptions = useMemo<ContactOption[]>(() => {
    const map = new Map<string, ContactOption>();
    for (const c of contacts) {
      const phone = (c.phone_number || "").replace(/\D/g, "");
      if (!phone) continue;
      map.set(phone, {
        phone,
        label: c.display_name && c.display_name !== `+${phone}` ? `${c.display_name} — +${phone}` : `+${phone}`,
        source: "contact",
      });
    }
    for (const conv of conversations) {
      const phone = parseConversationPhone(conv.conversation_id);
      if (!phone || map.has(phone)) continue;
      map.set(phone, {
        phone,
        label: conv.participant_name && conv.participant_name !== `+${phone}` ? `${conv.participant_name} — +${phone}` : `+${phone}`,
        source: "conversation",
      });
    }
    return Array.from(map.values());
  }, [contacts, conversations]);

  const addResult = (result: TestResult) => {
    setResults(prev => [result, ...prev].slice(0, 10));
  };

  const handleSendText = async () => {
    if (!testPhone.trim()) return toast.error("Enter a recipient phone number");
    setLoading("text");
    const normalizedPhone = testPhone.replace(/\D/g, "");
    try {
      const data = await callApi("whatsapp_send_message", {
        social_account_id: socialAccountId,
        recipient_phone: normalizedPhone,
        message: testMessage,
      });
      if (data.error) throw new Error(data.error);
      const wamid = data.message_id;
      addResult({ status: "success", message: `Text sent to ${testPhone}`, data, timestamp: new Date().toISOString() });
      toast.success("Text message sent!");

      // Re-fetch after 2.5s to see if Meta marked it failed (e.g. 131047 outside 24h)
      if (wamid) {
        setTimeout(async () => {
          const { data: msgRow } = await supabase
            .from("whatsapp_messages")
            .select("status, error_code, error_message")
            .eq("message_id", wamid)
            .maybeSingle();
          if (msgRow?.status === "failed") {
            const friendly = msgRow.error_message || "Meta rejected delivery.";
            toast.error(`Delivery failed: ${friendly}`, { duration: 9000 });
            addResult({
              status: "error",
              message: `Meta rejected delivery (code ${msgRow.error_code || "?"}): ${friendly}`,
              timestamp: new Date().toISOString(),
            });
          }
        }, 2500);
      }
    } catch (err: any) {
      const friendly = mapWhatsAppError(err.message) || err.message;
      addResult({ status: "error", message: friendly, timestamp: new Date().toISOString() });
      toast.error(friendly, { duration: 10000 });
    } finally {
      setLoading(null);
    }
  };

  const handleSendTemplate = async () => {
    if (!testPhone.trim()) return toast.error("Enter a recipient phone number");
    if (!templateName.trim()) return toast.error("Enter an approved template name");
    setLoading("template");
    try {
      const data = await callApi("whatsapp_send_template", {
        social_account_id: socialAccountId,
        recipient_phone: testPhone.replace(/\D/g, ""),
        template_name: templateName.trim(),
        template_language: templateLang,
      });
      if (data.error) throw new Error(data.error);
      addResult({ status: "success", message: `Template "${templateName}" sent to ${testPhone}`, data, timestamp: new Date().toISOString() });
      toast.success("Template message sent!");
    } catch (err: any) {
      const friendly = mapWhatsAppError(err.message) || err.message;
      addResult({ status: "error", message: friendly, timestamp: new Date().toISOString() });
      toast.error(friendly, { duration: 10000 });
    } finally {
      setLoading(null);
    }
  };

  const handleListTemplates = async () => {
    setLoading("templates");
    try {
      const data = await callApi("whatsapp_list_templates", {
        social_account_id: socialAccountId,
      });
      if (data.error) throw new Error(data.error);
      const count = data.templates?.length || 0;
      addResult({ status: "success", message: `Found ${count} templates`, data: data.templates, timestamp: new Date().toISOString() });
      toast.success(`Found ${count} templates`);
    } catch (err: any) {
      addResult({ status: "error", message: err.message, timestamp: new Date().toISOString() });
      toast.error(err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleSimulateWebhook = async () => {
    setLoading("webhook");
    try {
      const simulatedPayload = {
        object: "whatsapp_business_account",
        entry: [{
          id: "950316897704615",
          changes: [{
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "+96566106604",
                phone_number_id: phoneNumberId,
              },
              contacts: [{ profile: { name: "Test User" }, wa_id: "96550000000" }],
              messages: [{
                from: "96550000000",
                id: `wamid.test_${Date.now()}`,
                timestamp: String(Math.floor(Date.now() / 1000)),
                type: "text",
                text: { body: "This is a simulated test message from diagnostics" },
              }],
            },
          }],
        }],
      };

      const data = await callWebhookTest(simulatedPayload);
      addResult({ status: "success", message: "Simulated webhook sent — check messaging_cache for new conversation", data, timestamp: new Date().toISOString() });
      toast.success("Webhook simulation sent!");
    } catch (err: any) {
      addResult({ status: "error", message: err.message, timestamp: new Date().toISOString() });
      toast.error(err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleRegisterPhone = async () => {
    setLoading("register");
    try {
      const data = await callApi("whatsapp_register_phone", {
        social_account_id: socialAccountId,
      });
      if (data.error) throw new Error(data.error);
      addResult({ status: "success", message: "Phone number registered successfully", data, timestamp: new Date().toISOString() });
      toast.success("Phone number registered!");
    } catch (err: any) {
      addResult({ status: "error", message: err.message, timestamp: new Date().toISOString() });
      toast.error(err.message);
    } finally {
      setLoading(null);
    }
  };

  const handleListConversations = async () => {
    setLoading("convos");
    try {
      const data = await callApi("whatsapp_list_conversations", {
        social_account_id: socialAccountId,
      });
      if (data.error) throw new Error(data.error);
      const count = data.conversations?.length || 0;
      addResult({ status: "success", message: `Found ${count} cached conversations`, data: data.conversations, timestamp: new Date().toISOString() });
      toast.success(`Found ${count} conversations`);
    } catch (err: any) {
      addResult({ status: "error", message: err.message, timestamp: new Date().toISOString() });
      toast.error(err.message);
    } finally {
      setLoading(null);
    }
  };

  const typedDigits = testPhone.replace(/\D/g, "");
  const showCustomEntry = typedDigits.length >= 6 && !recipientOptions.some(o => o.phone === typedDigits);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          WhatsApp Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Account ID: <code className="bg-muted px-1 rounded">{socialAccountId.slice(0, 8)}...</code></span>
          <span>Phone ID: <code className="bg-muted px-1 rounded">{phoneNumberId}</code></span>
        </div>

        <Tabs defaultValue="send">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="send">Send Test</TabsTrigger>
            <TabsTrigger value="webhook">Simulate Webhook</TabsTrigger>
            <TabsTrigger value="query">Query</TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="space-y-3 mt-3">
            <div>
              <Label className="text-xs">Recipient Phone (with country code)</Label>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={pickerOpen}
                    className="w-full justify-between mt-1 font-normal"
                  >
                    {testPhone ? `+${testPhone.replace(/\D/g, "")}` : "Select or type a phone number…"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={true}>
                    <CommandInput
                      placeholder="Search contacts or type a number…"
                      value={testPhone}
                      onValueChange={setTestPhone}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {typedDigits.length >= 6
                          ? "No saved contact — type to use a new number."
                          : "No saved contacts yet."}
                      </CommandEmpty>
                      {recipientOptions.length > 0 && (
                        <CommandGroup heading="Saved contacts & past conversations">
                          {recipientOptions.map((opt) => (
                            <CommandItem
                              key={opt.phone}
                              value={`${opt.label} ${opt.phone}`}
                              onSelect={() => {
                                setTestPhone(opt.phone);
                                setPickerOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  typedDigits === opt.phone ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="flex-1 truncate">{opt.label}</span>
                              <Badge variant="outline" className="ml-2 text-[10px] capitalize">
                                {opt.source}
                              </Badge>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                      {showCustomEntry && (
                        <CommandGroup heading="Use new number">
                          <CommandItem
                            value={`__custom__ ${typedDigits}`}
                            onSelect={() => {
                              setTestPhone(typedDigits);
                              setPickerOpen(false);
                            }}
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Use this number: +{typedDigits}
                          </CommandItem>
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs">Text Message</Label>
              <Textarea
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
            <Button onClick={handleSendText} disabled={loading === "text"} size="sm" className="gap-1.5">
              {loading === "text" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send Text Message
            </Button>

            <div className="border-t pt-3 space-y-2">
              <Label className="text-xs">Template Name (one of YOUR approved templates)</Label>
              <div className="flex gap-2">
                <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. order_confirmation" />
                <Input value={templateLang} onChange={(e) => setTemplateLang(e.target.value)} placeholder="en_US" className="w-24" />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSendTemplate} disabled={loading === "template"} size="sm" variant="outline" className="gap-1.5">
                  {loading === "template" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  Send Template Message
                </Button>
                <Button onClick={handleListTemplates} disabled={loading === "templates"} size="sm" variant="ghost" className="gap-1.5">
                  {loading === "templates" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  List my templates
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                <strong>Don't use <code>hello_world</code></strong> — Meta only allows it from Public Test Numbers (error 131058). Use one of your own approved templates from WhatsApp Manager. If freeform text fails with "outside 24h window" (131047), a template is also required.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="webhook" className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground">
              Simulates an inbound WhatsApp message webhook from a test number (96550000000).
              This will create a conversation in the messaging_cache table.
            </p>
            <Button onClick={handleSimulateWebhook} disabled={loading === "webhook"} size="sm" className="gap-1.5">
              {loading === "webhook" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              Simulate Inbound Message
            </Button>

            <div className="border-t pt-3 space-y-2">
              <Label className="text-xs font-semibold">Phone Registration</Label>
              <p className="text-xs text-muted-foreground">
                Register your WhatsApp phone number with the Cloud API. Required before sending messages (fixes error 133010).
              </p>
              <Button onClick={handleRegisterPhone} disabled={loading === "register"} size="sm" variant="outline" className="gap-1.5">
                {loading === "register" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                Register Phone Number
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="query" className="space-y-3 mt-3">
            <div className="flex gap-2">
              <Button onClick={handleListConversations} disabled={loading === "convos"} size="sm" variant="outline" className="gap-1.5">
                {loading === "convos" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                List Conversations
              </Button>
              <Button onClick={handleListTemplates} disabled={loading === "templates"} size="sm" variant="outline" className="gap-1.5">
                {loading === "templates" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                List Templates
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Results Log */}
        {results.length > 0 && (
          <div className="border-t pt-3 space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground">Test Results</h4>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {results.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-muted/30">
                  {r.status === "success" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                  ) : r.status === "error" ? (
                    <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="break-words">{r.message}</p>
                    {r.data && (
                      <pre className="mt-1 text-[10px] text-muted-foreground overflow-x-auto max-h-20">
                        {JSON.stringify(r.data, null, 2)}
                      </pre>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {new Date(r.timestamp).toLocaleTimeString()}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
