
import { LucideIcon } from 'lucide-react';

export interface SettingsTabConfig {
  id: string;
  label: string;
  icon: LucideIcon;
  component: React.ComponentType;
  path?: string;
  description?: string;
  requiredRoles?: string[];
}

export interface SettingsSection {
  id: string;
  title: string;
  description?: string;
  tabs: SettingsTabConfig[];
}
