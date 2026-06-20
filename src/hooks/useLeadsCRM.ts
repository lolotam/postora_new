import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export interface LeadForm {
  id: string;
  form_id: string;
  form_name: string;
  form_status: string;
  page_id: string;
  social_account_id: string;
  last_synced_at: string | null;
}

export interface Lead {
  id: string;
  meta_lead_id: string;
  lead_data: Record<string, string>;
  status: string;
  notes: string | null;
  form_id: string;
  created_at: string;
  updated_at: string;
}

export function useLeadForms() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lead-forms", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_forms")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as LeadForm[];
    },
    enabled: !!user,
  });
}

export function useLeads(formId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["leads", formId],
    queryFn: async () => {
      let query = supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (formId) query = query.eq("form_id", formId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!user,
  });
}

export function useSyncLeadForms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ socialAccountId, pageId }: { socialAccountId: string; pageId: string }) => {
      const { data, error } = await supabase.functions.invoke("leads-api", {
        body: { action: "sync_lead_forms", social_account_id: socialAccountId, page_id: pageId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lead-forms"] });
      toast({ title: "Forms synced", description: `${data?.synced || 0} lead forms synced.` });
    },
    onError: (error) => {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useSyncLeads() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ socialAccountId, formId }: { socialAccountId: string; formId: string }) => {
      const { data, error } = await supabase.functions.invoke("leads-api", {
        body: { action: "get_leads", social_account_id: socialAccountId, form_id: formId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Leads synced", description: "Latest leads have been imported." });
    },
    onError: (error) => {
      toast({ title: "Sync failed", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, status }: { leadId: string; status: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({ status })
        .eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useUpdateLeadNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, notes }: { leadId: string; notes: string }) => {
      const { error } = await supabase
        .from("leads")
        .update({ notes })
        .eq("id", leadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Notes saved" });
    },
  });
}
