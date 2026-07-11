export interface NavigationSection {
  id: string;
  title: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NavigationItem {
  id: string;
  section_id: string;
  title: string;
  href: string;
  icon: string;
  description: string | null;
  display_order: number;
  required_roles: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserNavigationPreferences {
  id: string;
  user_id: string;
  hidden_sections: string[];
  hidden_items: string[];
  custom_order: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface NavigationSectionWithItems extends NavigationSection {
  items: NavigationItem[];
}