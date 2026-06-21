import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useMessagingAccounts } from "@/hooks/useMessaging";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Plus, FileText, CheckCircle2, Clock, XCircle, Loader2, Trash2, X, Link, Phone, MessageSquare, Image, Video, FileIcon } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

async function callMessagingApi(action: string, body: Record<string, unknown>) {
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
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, apikey: anonKey },
      body: JSON.stringify({ action, ...body }),
    }
  );
  const data = await res.json().catch(() => ({ error: res.statusText }));
  if (data.error_type) throw new Error(data.error);
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data;
}

const statusIcon = (status: string) => {
  switch (status?.toUpperCase()) {
    case "APPROVED": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "PENDING": return <Clock className="h-4 w-4 text-amber-500" />;
    case "REJECTED": return <XCircle className="h-4 w-4 text-destructive" />;
    default: return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
};

const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status?.toUpperCase()) {
    case "APPROVED": return "default";
    case "PENDING": return "secondary";
    case "REJECTED": return "destructive";
    default: return "outline";
  }
};

interface TemplateButton {
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
  text: string;
  url?: string;
  phone_number?: string;
}

type HeaderFormat = "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";

export function WhatsAppTemplatesContent() {
  const { accounts } = useMessagingAccounts();
  const waAccount = accounts.find((a) => a.platform === "whatsapp");
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "", category: "MARKETING", language: "en_US",
    headerFormat: "NONE" as HeaderFormat, headerText: "",
    bodyText: "", footerText: "",
    buttons: [] as TemplateButton[],
  });

  const resetForm = () => setNewTemplate({
    name: "", category: "MARKETING", language: "en_US",
    headerFormat: "NONE", headerText: "",
    bodyText: "", footerText: "",
    buttons: [],
  });

  const { data: templates = [], isLoading, refetch } = useQuery({
    queryKey: ["whatsapp-templates", waAccount?.id],
    queryFn: async () => {
      if (!waAccount) return [];
      const data = await callMessagingApi("whatsapp_list_templates", { social_account_id: waAccount.id });
      return data.templates || [];
    },
    enabled: !!waAccount,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!waAccount) throw new Error("No WhatsApp account");
      return callMessagingApi("whatsapp_list_templates", { social_account_id: waAccount.id });
    },
    onSuccess: () => { refetch(); toast({ title: "Templates synced from Meta" }); },
    onError: (e: Error) => toast({ title: "Sync failed", description: e.message, variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!waAccount) throw new Error("No WhatsApp account");

      const components: any[] = [];

      // Header component
      if (newTemplate.headerFormat === "TEXT" && newTemplate.headerText) {
        components.push({ type: "HEADER", format: "TEXT", text: newTemplate.headerText });
      } else if (newTemplate.headerFormat !== "NONE" && newTemplate.headerFormat !== "TEXT") {
        // Media headers: IMAGE, VIDEO, DOCUMENT — Meta requires an example handle
        components.push({ type: "HEADER", format: newTemplate.headerFormat });
      }

      // Body
      components.push({ type: "BODY", text: newTemplate.bodyText });

      // Footer
      if (newTemplate.footerText) {
        components.push({ type: "FOOTER", text: newTemplate.footerText });
      }

      // Buttons
      if (newTemplate.buttons.length > 0) {
        const buttons = newTemplate.buttons.map((btn) => {
          if (btn.type === "QUICK_REPLY") return { type: "QUICK_REPLY", text: btn.text };
          if (btn.type === "URL") return { type: "URL", text: btn.text, url: btn.url };
          if (btn.type === "PHONE_NUMBER") return { type: "PHONE_NUMBER", text: btn.text, phone_number: btn.phone_number };
          return { type: btn.type, text: btn.text };
        });
        components.push({ type: "BUTTONS", buttons });
      }

      return callMessagingApi("whatsapp_create_template", {
        social_account_id: waAccount.id,
        name: newTemplate.name,
        category: newTemplate.category,
        language: newTemplate.language,
        components,
      });
    },
    onSuccess: () => {
      toast({ title: "Template submitted for review" });
      setCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (e: Error) => toast({ title: "Create failed", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (templateName: string) => {
      if (!waAccount) throw new Error("No WhatsApp account");
      return callMessagingApi("whatsapp_delete_template", {
        social_account_id: waAccount.id,
        template_name: templateName,
      });
    },
    onSuccess: () => { toast({ title: "Template deleted" }); refetch(); },
    onError: (e: Error) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const addButton = (type: TemplateButton["type"]) => {
    if (newTemplate.buttons.length >= 3) return;
    setNewTemplate({
      ...newTemplate,
      buttons: [...newTemplate.buttons, { type, text: "", url: "", phone_number: "" }],
    });
  };

  const updateButton = (index: number, updates: Partial<TemplateButton>) => {
    const buttons = [...newTemplate.buttons];
    buttons[index] = { ...buttons[index], ...updates };
    setNewTemplate({ ...newTemplate, buttons });
  };

  const removeButton = (index: number) => {
    setNewTemplate({ ...newTemplate, buttons: newTemplate.buttons.filter((_, i) => i !== index) });
  };

  if (!waAccount) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No WhatsApp Business account connected. Connect one in Settings → Profiles.</p>
      </div>
    );
  }

  const headerFormatIcon = (fmt: HeaderFormat) => {
    switch (fmt) {
      case "IMAGE": return <Image className="h-3.5 w-3.5" />;
      case "VIDEO": return <Video className="h-3.5 w-3.5" />;
      case "DOCUMENT": return <FileIcon className="h-3.5 w-3.5" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage your Meta-approved message templates</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? "animate-spin" : ""}`} />
            Sync from Meta
          </Button>
          <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Create Template</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Create Message Template</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <Label>Template Name</Label>
                  <Input placeholder="e.g. welcome_message" value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} />
                  <p className="text-xs text-muted-foreground mt-1">Lowercase letters, numbers, underscores only</p>
                </div>

                {/* Category & Language */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select value={newTemplate.category} onValueChange={(v) => setNewTemplate({ ...newTemplate, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MARKETING">Marketing</SelectItem>
                        <SelectItem value="UTILITY">Utility</SelectItem>
                        <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Language</Label>
                    <Select value={newTemplate.language} onValueChange={(v) => setNewTemplate({ ...newTemplate, language: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en_US">English (US)</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="pt_BR">Portuguese (BR)</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Header */}
                <div>
                  <Label>Header</Label>
                  <Select value={newTemplate.headerFormat} onValueChange={(v) => setNewTemplate({ ...newTemplate, headerFormat: v as HeaderFormat, headerText: "" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">No Header</SelectItem>
                      <SelectItem value="TEXT">Text</SelectItem>
                      <SelectItem value="IMAGE">Image</SelectItem>
                      <SelectItem value="VIDEO">Video</SelectItem>
                      <SelectItem value="DOCUMENT">Document</SelectItem>
                    </SelectContent>
                  </Select>
                  {newTemplate.headerFormat === "TEXT" && (
                    <Input className="mt-2" placeholder="Header text (max 60 chars)" maxLength={60} value={newTemplate.headerText} onChange={(e) => setNewTemplate({ ...newTemplate, headerText: e.target.value })} />
                  )}
                  {["IMAGE", "VIDEO", "DOCUMENT"].includes(newTemplate.headerFormat) && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {headerFormatIcon(newTemplate.headerFormat)} Media will be provided when sending the template. Meta requires a sample during review.
                    </p>
                  )}
                </div>

                {/* Body */}
                <div>
                  <div className="flex items-center justify-between">
                    <Label>Body *</Label>
                    <span className="text-xs text-muted-foreground">{newTemplate.bodyText.length}/1024</span>
                  </div>
                  <Textarea placeholder="Hello {{1}}, welcome to our service!" value={newTemplate.bodyText} onChange={(e) => setNewTemplate({ ...newTemplate, bodyText: e.target.value.slice(0, 1024) })} rows={4} />
                  <p className="text-xs text-muted-foreground mt-1">Use {"{{1}}"}, {"{{2}}"} for variables</p>
                </div>

                {/* Footer */}
                <div>
                  <Label>Footer (optional)</Label>
                  <Input placeholder="Footer text (max 60 chars)" maxLength={60} value={newTemplate.footerText} onChange={(e) => setNewTemplate({ ...newTemplate, footerText: e.target.value })} />
                </div>

                {/* Buttons */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Buttons (max 3)</Label>
                    <span className="text-xs text-muted-foreground">{newTemplate.buttons.length}/3</span>
                  </div>

                  {newTemplate.buttons.map((btn, i) => (
                    <div key={i} className="border rounded-lg p-3 mb-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="gap-1 text-xs">
                          {btn.type === "QUICK_REPLY" && <><MessageSquare className="h-3 w-3" /> Quick Reply</>}
                          {btn.type === "URL" && <><Link className="h-3 w-3" /> URL</>}
                          {btn.type === "PHONE_NUMBER" && <><Phone className="h-3 w-3" /> Phone</>}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeButton(i)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Input placeholder="Button text (max 25 chars)" maxLength={25} value={btn.text} onChange={(e) => updateButton(i, { text: e.target.value })} />
                      {btn.type === "URL" && (
                        <Input placeholder="https://example.com/{{1}}" value={btn.url || ""} onChange={(e) => updateButton(i, { url: e.target.value })} />
                      )}
                      {btn.type === "PHONE_NUMBER" && (
                        <Input placeholder="+1234567890" value={btn.phone_number || ""} onChange={(e) => updateButton(i, { phone_number: e.target.value })} />
                      )}
                    </div>
                  ))}

                  {newTemplate.buttons.length < 3 && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => addButton("QUICK_REPLY")} className="gap-1 text-xs">
                        <MessageSquare className="h-3 w-3" /> Quick Reply
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => addButton("URL")} className="gap-1 text-xs">
                        <Link className="h-3 w-3" /> URL
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => addButton("PHONE_NUMBER")} className="gap-1 text-xs">
                        <Phone className="h-3 w-3" /> Phone
                      </Button>
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div className="border rounded-lg p-3 bg-muted/30">
                  <p className="text-xs font-medium mb-2 text-muted-foreground">Preview</p>
                  {newTemplate.headerFormat === "TEXT" && newTemplate.headerText && (
                    <p className="text-sm font-semibold mb-1">{newTemplate.headerText}</p>
                  )}
                  {["IMAGE", "VIDEO", "DOCUMENT"].includes(newTemplate.headerFormat) && (
                    <div className="bg-muted rounded h-20 flex items-center justify-center mb-2 text-muted-foreground text-xs gap-1">
                      {headerFormatIcon(newTemplate.headerFormat)} {newTemplate.headerFormat} header
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{newTemplate.bodyText || "Body text..."}</p>
                  {newTemplate.footerText && <p className="text-xs text-muted-foreground mt-1">{newTemplate.footerText}</p>}
                  {newTemplate.buttons.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {newTemplate.buttons.map((btn, i) => (
                        <div key={i} className="border rounded px-3 py-1.5 text-center text-sm text-primary font-medium">
                          {btn.text || "Button"}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button onClick={() => createMutation.mutate()} disabled={!newTemplate.name || !newTemplate.bodyText || createMutation.isPending} className="w-full">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Submit for Review
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Message Templates ({templates.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No templates found. Click "Sync from Meta" or create a new one.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Components</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t: any) => {
                  const bodyComp = t.components?.find((c: any) => c.type === "BODY");
                  const headerComp = t.components?.find((c: any) => c.type === "HEADER");
                  const buttonsComp = t.components?.find((c: any) => c.type === "BUTTONS");
                  return (
                    <TableRow key={t.name + t.language}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(t.status)} className="gap-1">
                          {statusIcon(t.status)}
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
                      <TableCell>{t.language}</TableCell>
                      <TableCell className="text-xs text-muted-foreground space-x-1">
                        {headerComp && <Badge variant="outline" className="text-xs gap-0.5">{headerComp.format === "TEXT" ? "Text Header" : headerComp.format}</Badge>}
                        {buttonsComp && <Badge variant="outline" className="text-xs">{buttonsComp.buttons?.length || 0} btn</Badge>}
                        {!headerComp && !buttonsComp && (
                          <span className="max-w-[200px] truncate inline-block">{bodyComp?.text || "—"}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete template "{t.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>This will delete the template from Meta. This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(t.name)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
