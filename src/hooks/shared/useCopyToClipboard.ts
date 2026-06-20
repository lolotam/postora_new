import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface UseCopyToClipboardOptions {
  /** Duration in ms to show copied state (default: 2000) */
  timeout?: number;
  /** Show toast notification on success */
  showToast?: boolean;
  /** Custom success message */
  successMessage?: string;
  /** Custom error message */
  errorMessage?: string;
}

interface UseCopyToClipboardReturn {
  /** Whether the copy was successful recently */
  copied: boolean;
  /** The ID of the last copied item (for tracking multiple copy buttons) */
  copiedId: string | null;
  /** Copy text to clipboard */
  copy: (text: string, id?: string) => Promise<boolean>;
  /** Reset the copied state */
  reset: () => void;
}

/**
 * Hook for copying text to clipboard with feedback
 * 
 * @example
 * // Basic usage
 * const { copied, copy } = useCopyToClipboard();
 * <Button onClick={() => copy("Hello World")}>
 *   {copied ? "Copied!" : "Copy"}
 * </Button>
 * 
 * @example
 * // With multiple copy buttons
 * const { copiedId, copy } = useCopyToClipboard();
 * <Button onClick={() => copy(code1, "code1")}>
 *   {copiedId === "code1" ? "Copied!" : "Copy"}
 * </Button>
 * <Button onClick={() => copy(code2, "code2")}>
 *   {copiedId === "code2" ? "Copied!" : "Copy"}
 * </Button>
 * 
 * @example
 * // With toast notification
 * const { copy } = useCopyToClipboard({ showToast: true, successMessage: "API key copied!" });
 */
export function useCopyToClipboard(options: UseCopyToClipboardOptions = {}): UseCopyToClipboardReturn {
  const {
    timeout = 2000,
    showToast = false,
    successMessage = "Copied to clipboard",
    errorMessage = "Failed to copy to clipboard",
  } = options;

  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const reset = useCallback(() => {
    setCopied(false);
    setCopiedId(null);
  }, []);

  const copy = useCallback(
    async (text: string, id?: string): Promise<boolean> => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (id) setCopiedId(id);

        if (showToast) {
          toast({
            title: "Copied!",
            description: successMessage,
          });
        }

        setTimeout(() => {
          setCopied(false);
          setCopiedId(null);
        }, timeout);

        return true;
      } catch (error) {
        console.error("Failed to copy to clipboard:", error);
        
        if (showToast) {
          toast({
            title: "Copy failed",
            description: errorMessage,
            variant: "destructive",
          });
        }

        return false;
      }
    },
    [timeout, showToast, successMessage, errorMessage, toast]
  );

  return { copied, copiedId, copy, reset };
}
