import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PlatformIcon } from "@/components/PlatformIcon";
import { Loader2, Search } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FacebookPage {
  id: string;
  name: string;
  has_instagram?: boolean;
}

interface StandaloneInstagram {
  id: string;
  username: string;
  profile_picture_url?: string;
}

interface PageSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pages: FacebookPage[];
  standaloneInstagram?: StandaloneInstagram[];
  pageSearchQuery: string;
  onPageSearchChange: (query: string) => void;
  onSelectPage: (pageId: string) => void;
  onSelectStandaloneInstagram?: (igAccount: StandaloneInstagram) => void;
  selectingPage: string | null;
}

export function PageSelectionDialog({
  open,
  onOpenChange,
  pages,
  standaloneInstagram = [],
  pageSearchQuery,
  onPageSearchChange,
  onSelectPage,
  onSelectStandaloneInstagram,
  selectingPage,
}: PageSelectionDialogProps) {
  const filteredPages = pages.filter((page) =>
    page.name.toLowerCase().includes(pageSearchQuery.toLowerCase())
  );

  const filteredStandaloneIg = standaloneInstagram.filter((ig) =>
    ig.username.toLowerCase().includes(pageSearchQuery.toLowerCase())
  );

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <PlatformIcon platform="facebook" size="sm" />
            Select a Facebook Page
          </AlertDialogTitle>
          <AlertDialogDescription>
            Choose which Facebook Page you want to connect. This Page will be used for publishing posts.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            value={pageSearchQuery}
            onChange={(e) => onPageSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Pages with Instagram badge info */}
        {pages.some((p) => p.has_instagram) && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-pink-500/20">
            <PlatformIcon platform="instagram" size="sm" />
            <span className="text-xs text-muted-foreground">
              Pages with{" "}
              <Badge
                variant="secondary"
                className="mx-1 h-5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-400 border-pink-500/30"
              >
                IG
              </Badge>{" "}
              will also connect Instagram
            </span>
          </div>
        )}

        {/* Pages List */}
        <ScrollArea className="max-h-[300px] pr-4">
          <div className="space-y-2">
            {filteredPages.map((page) => (
              <Button
                key={page.id}
                variant="outline"
                className="w-full justify-between h-auto py-3"
                onClick={() => onSelectPage(page.id)}
                disabled={!!selectingPage}
              >
                <span className="font-medium">{page.name}</span>
                <div className="flex items-center gap-2">
                  {page.has_instagram && (
                    <Badge
                      variant="secondary"
                      className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-400 border-pink-500/30"
                    >
                      IG
                    </Badge>
                  )}
                  {selectingPage === page.id && <Loader2 className="w-4 h-4 animate-spin" />}
                </div>
              </Button>
            ))}
          </div>

          {/* Standalone Instagram Accounts Section */}
          {filteredStandaloneIg.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <PlatformIcon platform="instagram" size="sm" />
                <span className="text-sm font-medium text-muted-foreground">
                  Standalone Instagram Accounts
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                These Instagram accounts are not linked to a Facebook Page but are in your Business Portfolio.
              </p>
              <div className="space-y-2">
                {filteredStandaloneIg.map((ig) => (
                  <Button
                    key={ig.id}
                    variant="outline"
                    className="w-full justify-between h-auto py-3 border-pink-500/20 hover:bg-pink-500/5"
                    onClick={() => onSelectStandaloneInstagram?.(ig)}
                    disabled={!!selectingPage}
                  >
                    <div className="flex items-center gap-2">
                      {ig.profile_picture_url ? (
                        <img
                          src={ig.profile_picture_url}
                          alt={ig.username}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <PlatformIcon platform="instagram" size="sm" />
                      )}
                      <span className="font-medium">@{ig.username}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-pink-400 border-pink-500/30"
                      >
                        IG Only
                      </Badge>
                      {selectingPage === ig.id && <Loader2 className="w-4 h-4 animate-spin" />}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={!!selectingPage}
            onClick={() => onPageSearchChange("")}
          >
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

