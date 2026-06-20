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
import { Trash2 } from "lucide-react";
import { Icon3D } from "@/components/fx/Icon3D";

interface DeleteNodeDialogProps {
  open: boolean;
  nodeCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteNodeDialog({ 
  open, 
  nodeCount, 
  onConfirm, 
  onCancel 
}: DeleteNodeDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent className="bg-card/85 backdrop-blur-xl ring-1 ring-rose-400/30 border-0">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <Icon3D icon={Trash2} variant="rose" size="sm" />
            <AlertDialogTitle className="bg-clip-text text-transparent bg-gradient-to-r from-rose-400 via-pink-400 to-fuchsia-400">
              Delete {nodeCount > 1 ? `${nodeCount} nodes` : 'node'}?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription>
            {nodeCount > 1 
              ? `This will permanently delete ${nodeCount} selected nodes and their connections.`
              : 'This will permanently delete this node and its connections.'
            }
            {' '}This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
