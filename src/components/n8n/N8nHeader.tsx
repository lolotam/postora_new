import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

interface N8nHeaderProps {
  isAuthenticated: boolean;
}

export function N8nHeader({ isAuthenticated }: N8nHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/"><Logo /></Link>
          <span className="text-muted-foreground/60">/</span>
          <Link to="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Docs</Link>
          <span className="text-muted-foreground/60">/</span>
          <span className="text-sm font-medium bg-clip-text text-transparent bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500">
            n8n Integration
          </span>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white shadow-md hover:opacity-90">
                Dashboard
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white shadow-md hover:opacity-90">
                Get Started
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
