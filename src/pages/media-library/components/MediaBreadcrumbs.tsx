import { Home, Folder, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "../types";

interface MediaBreadcrumbsProps {
  breadcrumbs: Breadcrumb[];
  onNavigate: (path: string) => void;
}

export function MediaBreadcrumbs({ breadcrumbs, onNavigate }: MediaBreadcrumbsProps) {
  return (
    <div className="flex items-center gap-1 text-sm overflow-x-auto pb-2">
      {breadcrumbs.map((crumb, index) => (
        <div key={crumb.path} className="flex items-center gap-1 shrink-0">
          {index > 0 && (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
          <Button
            variant={index === breadcrumbs.length - 1 ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onNavigate(crumb.path)}
            className="gap-1.5"
          >
            {index === 0 ? (
              <Home className="w-4 h-4" />
            ) : (
              <Folder className="w-4 h-4" />
            )}
            {crumb.name}
          </Button>
        </div>
      ))}
    </div>
  );
}
