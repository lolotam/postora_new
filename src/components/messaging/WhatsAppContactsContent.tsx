import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ContactUploadDialog } from "@/components/messaging/ContactUploadDialog";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Upload, Search, Users, Tag, Trash2, FolderPlus, Loader2 } from "lucide-react";

export function WhatsAppContactsContent() {
  const { session } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [csvOpen, setCsvOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [newContact, setNewContact] = useState({ phone_number: "", display_name: "", email: "", company: "", notes: "", tags: "" });
  const [newGroup, setNewGroup] = useState({ name: "", description: "", color: "#6366f1" });

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["whatsapp-contacts", session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("whatsapp_contacts").select("*").order("display_name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.user?.id,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["whatsapp-groups", session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("whatsapp_contact_groups").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.user?.id,
  });

  const { data: groupMembers = [] } = useQuery({
    queryKey: ["whatsapp-group-members", session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("whatsapp_contact_group_members").select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.user?.id,
  });

  const addContactMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error("Not authenticated");
      const { error } = await supabase.from("whatsapp_contacts").insert({
        user_id: session.user.id,
        phone_number: newContact.phone_number,
        display_name: newContact.display_name || null,
        email: newContact.email || null,
        company: newContact.company || null,
        notes: newContact.notes || null,
        tags: newContact.tags ? newContact.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Contact added" });
      qc.invalidateQueries({ queryKey: ["whatsapp-contacts"] });
      setAddOpen(false);
      setNewContact({ phone_number: "", display_name: "", email: "", company: "", notes: "", tags: "" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteContactMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Contact deleted" });
      qc.invalidateQueries({ queryKey: ["whatsapp-contacts"] });
    },
  });

  const addGroupMutation = useMutation({
    mutationFn: async () => {
      if (!session?.user?.id) throw new Error("Not authenticated");
      const { error } = await supabase.from("whatsapp_contact_groups").insert({
        user_id: session.user.id,
        name: newGroup.name,
        description: newGroup.description || null,
        color: newGroup.color,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Group created" });
      qc.invalidateQueries({ queryKey: ["whatsapp-groups"] });
      setGroupOpen(false);
      setNewGroup({ name: "", description: "", color: "#6366f1" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addToGroupMutation = useMutation({
    mutationFn: async ({ groupId, contactId }: { groupId: string; contactId: string }) => {
      const { error } = await supabase.from("whatsapp_contact_group_members").insert({ group_id: groupId, contact_id: contactId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Added to group" });
      qc.invalidateQueries({ queryKey: ["whatsapp-group-members"] });
    },
  });

  const filteredContacts = contacts.filter((c: any) => {
    const matchesSearch = !search || c.display_name?.toLowerCase().includes(search.toLowerCase()) || c.phone_number.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase());
    if (selectedGroup === "all") return matchesSearch;
    const memberIds = groupMembers.filter((m: any) => m.group_id === selectedGroup).map((m: any) => m.contact_id);
    return matchesSearch && memberIds.includes(c.id);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{contacts.length} contacts · {groups.length} groups</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setCsvOpen(true)}><Upload className="h-4 w-4 mr-2" />Import CSV</Button>
          <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
            <DialogTrigger asChild><Button variant="outline"><FolderPlus className="h-4 w-4 mr-2" />New Group</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Contact Group</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Group Name</Label><Input value={newGroup.name} onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })} placeholder="e.g. VIP Customers" /></div>
                <div><Label>Description</Label><Input value={newGroup.description} onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })} /></div>
                <div><Label>Color</Label><Input type="color" value={newGroup.color} onChange={(e) => setNewGroup({ ...newGroup, color: e.target.value })} className="h-10 w-20" /></div>
                <Button onClick={() => addGroupMutation.mutate()} disabled={!newGroup.name || addGroupMutation.isPending} className="w-full">Create Group</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Contact</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Contact</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Phone Number *</Label><Input value={newContact.phone_number} onChange={(e) => setNewContact({ ...newContact, phone_number: e.target.value })} placeholder="+96555683677" /></div>
                <div><Label>Name</Label><Input value={newContact.display_name} onChange={(e) => setNewContact({ ...newContact, display_name: e.target.value })} /></div>
                <div><Label>Email</Label><Input value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} /></div>
                <div><Label>Company</Label><Input value={newContact.company} onChange={(e) => setNewContact({ ...newContact, company: e.target.value })} /></div>
                <div><Label>Notes</Label><Textarea value={newContact.notes} onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })} /></div>
                <div><Label>Tags (comma-separated)</Label><Input value={newContact.tags} onChange={(e) => setNewContact({ ...newContact, tags: e.target.value })} placeholder="vip, customer" /></div>
                <Button onClick={() => addContactMutation.mutate()} disabled={!newContact.phone_number || addContactMutation.isPending} className="w-full">Add Contact</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search contacts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All contacts" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All contacts</SelectItem>
            {groups.map((g: any) => (
              <SelectItem key={g.id} value={g.id}>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: g.color }} />
                  {g.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No contacts found. Add contacts manually or import a CSV file.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((c: any) => {
                  const contactGroups = groupMembers.filter((m: any) => m.contact_id === c.id).map((m: any) => groups.find((g: any) => g.id === m.group_id)).filter(Boolean);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.display_name || "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{c.phone_number}</TableCell>
                      <TableCell>{c.email || "—"}</TableCell>
                      <TableCell>{c.company || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {(c.tags || []).map((tag: string) => (
                            <Badge key={tag} variant="secondary" className="text-xs"><Tag className="h-3 w-3 mr-1" />{tag}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {contactGroups.map((g: any) => (
                            <Badge key={g.id} variant="outline" className="text-xs" style={{ borderColor: g.color, color: g.color }}>{g.name}</Badge>
                          ))}
                          {groups.length > 0 && (
                            <Select onValueChange={(gId) => addToGroupMutation.mutate({ groupId: gId, contactId: c.id })}>
                              <SelectTrigger className="h-6 w-6 p-0 border-none"><Plus className="h-3 w-3" /></SelectTrigger>
                              <SelectContent>
                                {groups.filter((g: any) => !contactGroups.some((cg: any) => cg.id === g.id)).map((g: any) => (
                                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteContactMutation.mutate(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ContactUploadDialog open={csvOpen} onOpenChange={setCsvOpen} />
    </div>
  );
}
