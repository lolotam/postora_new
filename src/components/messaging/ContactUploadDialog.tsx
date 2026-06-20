import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";

interface ContactUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedContact {
  phone_number: string;
  display_name?: string;
  email?: string;
  company?: string;
  tags?: string;
  valid: boolean;
  error?: string;
}

export function ContactUploadDialog({ open, onOpenChange }: ContactUploadDialogProps) {
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const { toast } = useToast();
  const { session } = useAuth();
  const qc = useQueryClient();

  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const contacts: ParsedContact[] = results.data.map((row: any) => {
          const phone = (row.phone_number || row.phone || row.Phone || row.mobile || row.Mobile || "").toString().trim();
          const valid = /^\+?\d{7,15}$/.test(phone.replace(/[\s-()]/g, ""));
          return {
            phone_number: phone.replace(/[\s-()]/g, ""),
            display_name: row.display_name || row.name || row.Name || row.full_name || "",
            email: row.email || row.Email || "",
            company: row.company || row.Company || row.organization || "",
            tags: row.tags || row.Tags || "",
            valid,
            error: valid ? undefined : "Invalid phone number",
          };
        });
        setParsedContacts(contacts);
      },
      error: () => toast({ title: "Failed to parse CSV", variant: "destructive" }),
    });
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
  });

  const handleImport = async () => {
    if (!session?.user?.id) return;
    setImporting(true);
    try {
      const validContacts = parsedContacts.filter((c) => c.valid);
      const batch = validContacts.map((c) => ({
        user_id: session.user.id,
        phone_number: c.phone_number,
        display_name: c.display_name || null,
        email: c.email || null,
        company: c.company || null,
        tags: c.tags ? c.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      }));

      // Upsert in chunks of 50
      for (let i = 0; i < batch.length; i += 50) {
        const chunk = batch.slice(i, i + 50);
        const { error } = await supabase.from("whatsapp_contacts").upsert(chunk, { onConflict: "user_id,phone_number" });
        if (error) throw error;
      }

      toast({ title: `${validContacts.length} contacts imported successfully` });
      qc.invalidateQueries({ queryKey: ["whatsapp-contacts"] });
      setParsedContacts([]);
      setFileName("");
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedContacts.filter((c) => c.valid).length;
  const invalidCount = parsedContacts.filter((c) => !c.valid).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Import Contacts from CSV</DialogTitle></DialogHeader>

        {parsedContacts.length === 0 ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
          >
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium">Drop a CSV file here or click to browse</p>
            <p className="text-sm text-muted-foreground mt-1">
              Required column: <code>phone_number</code>. Optional: <code>display_name</code>, <code>email</code>, <code>company</code>, <code>tags</code>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{fileName}</span>
              </div>
              <div className="flex gap-2">
                <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" />{validCount} valid</Badge>
                {invalidCount > 0 && <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />{invalidCount} invalid</Badge>}
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phone</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedContacts.slice(0, 50).map((c, i) => (
                    <TableRow key={i} className={!c.valid ? "bg-destructive/5" : ""}>
                      <TableCell className="font-mono text-sm">{c.phone_number}</TableCell>
                      <TableCell>{c.display_name || "—"}</TableCell>
                      <TableCell>{c.email || "—"}</TableCell>
                      <TableCell>{c.company || "—"}</TableCell>
                      <TableCell>
                        {c.valid ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <span className="text-xs text-destructive">{c.error}</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedContacts.length > 50 && <p className="text-xs text-muted-foreground">Showing first 50 of {parsedContacts.length} contacts</p>}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setParsedContacts([]); setFileName(""); }}>Reset</Button>
              <Button onClick={handleImport} disabled={validCount === 0 || importing}>
                {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Import {validCount} Contacts
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
