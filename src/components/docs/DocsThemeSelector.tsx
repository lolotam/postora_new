import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sun, Moon, Zap, Sparkles, Leaf, Monitor, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const THEME_OPTIONS = [
  {
    id: "light",
    name: "Light",
    icon: Sun,
    isDark: false,
    preview: {
      bg: "hsl(0 0% 100%)",
      primary: "hsl(220 90% 56%)",
      accent: "hsl(250 85% 60%)",
    },
  },
  {
    id: "dark-black",
    name: "Dark Black",
    icon: Moon,
    isDark: true,
    preview: {
      bg: "hsl(0 0% 5%)",
      primary: "hsl(220 90% 56%)",
      accent: "hsl(250 85% 60%)",
    },
  },
  {
    id: "dark-blue-cyan",
    name: "Futuristic Blue",
    icon: Zap,
    isDark: true,
    preview: {
      bg: "hsl(210 80% 8%)",
      primary: "hsl(195 100% 50%)",
      accent: "hsl(190 100% 45%)",
    },
  },
  {
    id: "dark-purple-magenta",
    name: "Neon Purple",
    icon: Sparkles,
    isDark: true,
    preview: {
      bg: "hsl(260 60% 8%)",
      primary: "hsl(280 80% 60%)",
      accent: "hsl(320 90% 55%)",
    },
  },
  {
    id: "dark-neon-green",
    name: "Neon Green",
    icon: Leaf,
    isDark: true,
    preview: {
      bg: "hsl(120 30% 5%)",
      primary: "hsl(100 80% 50%)",
      accent: "hsl(85 90% 45%)",
    },
  },
];

export function DocsThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [currentDarkVariant, setCurrentDarkVariant] = useState<string>("dark-purple-magenta");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Read the current dark theme variant from the document
    const storedVariant = document.documentElement.getAttribute("data-dark-theme");
    if (storedVariant) {
      setCurrentDarkVariant(storedVariant);
    }
  }, []);

  const getCurrentThemeId = () => {
    if (theme === "light") return "light";
    return currentDarkVariant;
  };

  const handleThemeSelect = (themeOption: typeof THEME_OPTIONS[0]) => {
    if (themeOption.id === "light") {
      setTheme("light");
    } else {
      setTheme("dark");
      setCurrentDarkVariant(themeOption.id);
      document.documentElement.setAttribute("data-dark-theme", themeOption.id);
      // Store in localStorage for persistence
      localStorage.setItem("docs-dark-theme", themeOption.id);
    }
  };

  const currentTheme = THEME_OPTIONS.find(t => t.id === getCurrentThemeId()) || THEME_OPTIONS[0];
  const CurrentIcon = currentTheme.icon;

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="w-9 h-9">
        <Monitor className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="w-9 h-9 relative overflow-hidden"
        >
          <motion.div
            key={currentTheme.id}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <CurrentIcon className="h-4 w-4" />
          </motion.div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Choose Theme
        </div>
        <DropdownMenuSeparator />
        <AnimatePresence>
          {THEME_OPTIONS.map((option, index) => {
            const Icon = option.icon;
            const isSelected = getCurrentThemeId() === option.id;
            
            return (
              <DropdownMenuItem
                key={option.id}
                onClick={() => handleThemeSelect(option)}
                className={cn(
                  "flex items-center gap-3 cursor-pointer py-2.5",
                  isSelected && "bg-primary/10"
                )}
              >
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-3 flex-1"
                >
                  {/* Theme preview circle */}
                  <div
                    className="w-6 h-6 rounded-full border border-border flex items-center justify-center overflow-hidden"
                    style={{ background: option.preview.bg }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        background: `linear-gradient(135deg, ${option.preview.primary} 0%, ${option.preview.accent} 100%)`,
                      }}
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 flex-1">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{option.name}</span>
                  </div>
                  
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    >
                      <Check className="h-4 w-4 text-primary" />
                    </motion.div>
                  )}
                </motion.div>
              </DropdownMenuItem>
            );
          })}
        </AnimatePresence>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
