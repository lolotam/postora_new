export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: string;
  link?: string;
  internalLink?: string;
  required: boolean;
  notes?: string;
}

export interface CategoryInfo {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export interface PlatformConfig {
  name: string;
  storageKey: string;
  items: ChecklistItem[];
  categoryInfo: Record<string, CategoryInfo>;
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  platform?: string;
}
