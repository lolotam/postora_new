import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLogMediaOperation } from "@/hooks/useMediaOperationsHistory";
import { FolderPlus, Loader2 } from "lucide-react";

interface CreateFolderDialogProps {
  open: boolean;
  onClose: () => void;
  parentPath: string;
  userId: string;
  onFolderCreated: () => void;
}

export function CreateFolderDialog({
  open,
  onClose,
  parentPath,
  userId,
  onFolderCreated,
}: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState("");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const { logOperation, completeOperation, failOperation } = useLogMediaOperation();

  const handleCreate = async () => {
    if (!folderName.trim()) return;

    setCreating(true);
    const startTime = Date.now();
    let operationId: string | null = null;

    try {
      // Sanitize folder name
      const sanitizedName = folderName.trim().replace(/[\/\\]/g, "-");
      const fullPath = parentPath === "/" 
        ? `/${sanitizedName}`
        : `${parentPath}/${sanitizedName}`;
      
      // Log the operation
      operationId = await logOperation({
        operationType: "create_folder",
        fileName: sanitizedName,
        operationDetails: {
          folderName: sanitizedName,
          parentPath,
          fullPath,
        },
      });

      const { error } = await supabase
        .from("media_folders")
        .insert({
          user_id: userId,
          name: sanitizedName,
          parent_path: parentPath,
          full_path: fullPath,
        });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Folder exists",
            description: "A folder with this name already exists",
            variant: "destructive",
          });
          if (operationId) {
            await failOperation(operationId, "Folder already exists", Date.now() - startTime);
          }
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Folder created",
          description: `Created folder "${sanitizedName}"`,
        });
        if (operationId) {
          await completeOperation(operationId, undefined, Date.now() - startTime);
        }
        onFolderCreated();
        setFolderName("");
        onClose();
      }
    } catch (error) {
      console.error("Create folder error:", error);
      toast({
        title: "Error",
        description: "Failed to create folder",
        variant: "destructive",
      });
      if (operationId) {
        await failOperation(
          operationId,
          error instanceof Error ? error.message : "Failed to create folder",
          Date.now() - startTime
        );
      }
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setFolderName("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5" />
            Create New Folder
          </DialogTitle>
          <DialogDescription>
            Enter a name for your new folder.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Enter folder name"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          {parentPath !== "/" && (
            <p className="text-sm text-muted-foreground">
              Creating in: <span className="font-medium">{parentPath}</span>
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!folderName.trim() || creating}>
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Folder"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteFolderDialogProps {
  open: boolean;
  onClose: () => void;
  folderName: string;
  folderId: string;
  onFolderDeleted: () => void;
}

export function DeleteFolderDialog({
  open,
  onClose,
  folderName,
  folderId,
  onFolderDeleted,
}: DeleteFolderDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const { logOperation, completeOperation, failOperation } = useLogMediaOperation();

  const handleDelete = async () => {
    setDeleting(true);
    const startTime = Date.now();
    let operationId: string | null = null;

    try {
      // Log the operation
      operationId = await logOperation({
        operationType: "delete_folder",
        fileName: folderName,
        operationDetails: {
          folderName,
          folderId,
        },
      });

      const { error } = await supabase
        .from("media_folders")
        .delete()
        .eq("id", folderId);

      if (error) throw error;

      toast({
        title: "Folder deleted",
        description: `Deleted folder "${folderName}"`,
      });
      
      if (operationId) {
        await completeOperation(operationId, undefined, Date.now() - startTime);
      }
      
      onFolderDeleted();
      onClose();
    } catch (error) {
      console.error("Delete folder error:", error);
      toast({
        title: "Error",
        description: "Failed to delete folder",
        variant: "destructive",
      });
      if (operationId) {
        await failOperation(
          operationId,
          error instanceof Error ? error.message : "Failed to delete folder",
          Date.now() - startTime
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete folder "{folderName}"?</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete the folder. Files inside will be moved to the root folder.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface MoveFileDialogProps {
  open: boolean;
  onClose: () => void;
  fileIds: string[];
  folders: Array<{ id: string; name: string; full_path: string }>;
  currentFolder: string;
  onFileMoved: () => void;
}

export function MoveFileDialog({
  open,
  onClose,
  fileIds,
  folders,
  currentFolder,
  onFileMoved,
}: MoveFileDialogProps) {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const { toast } = useToast();
  const { logOperation, completeOperation, failOperation } = useLogMediaOperation();

  // Reset selection when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedFolder(null);
      onClose();
    }
  };

  const handleMove = async () => {
    if (selectedFolder === null) return;
    
    setMoving(true);
    const startTime = Date.now();
    let operationId: string | null = null;

    try {
      // Log the operation
      operationId = await logOperation({
        operationType: "move_file",
        operationDetails: {
          filesCount: fileIds.length,
          destination: selectedFolder === "/" ? "Root" : selectedFolder,
          fromFolder: currentFolder,
        },
      });

      const { error } = await supabase
        .from("media_files")
        .update({ folder_path: selectedFolder })
        .in("id", fileIds);

      if (error) throw error;

      toast({
        title: "Files moved",
        description: `Moved ${fileIds.length} file(s) to ${selectedFolder === "/" ? "Root" : selectedFolder}`,
      });
      
      if (operationId) {
        await completeOperation(operationId, undefined, Date.now() - startTime);
      }
      
      onFileMoved();
      setSelectedFolder(null);
      onClose();
    } catch (error) {
      console.error("Move files error:", error);
      toast({
        title: "Error",
        description: "Failed to move files",
        variant: "destructive",
      });
      if (operationId) {
        await failOperation(
          operationId,
          error instanceof Error ? error.message : "Failed to move files",
          Date.now() - startTime
        );
      }
    } finally {
      setMoving(false);
    }
  };

  // Filter out current folder from options
  const availableFolders = folders.filter((f) => f.full_path !== currentFolder);
  const showRootOption = currentFolder !== "/";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move {fileIds.length} file(s)</DialogTitle>
          <DialogDescription>
            Select a destination folder for the selected files.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-[300px] overflow-auto">
          {showRootOption && (
            <Button
              variant={selectedFolder === "/" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setSelectedFolder("/")}
            >
              📁 Root
            </Button>
          )}
          {availableFolders.length > 0 ? (
            availableFolders.map((folder) => (
              <Button
                key={folder.id}
                variant={selectedFolder === folder.full_path ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setSelectedFolder(folder.full_path)}
              >
                📁 {folder.name}
              </Button>
            ))
          ) : !showRootOption ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No folders available. Create a folder first to move files.
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={moving}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={moving || selectedFolder === null}>
            {moving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Moving...
              </>
            ) : (
              "Move Here"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
