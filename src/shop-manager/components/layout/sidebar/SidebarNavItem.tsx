
import { NavLink } from "react-router-dom";
import { LucideIcon } from "lucide-react";

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  title: string;
}

interface SidebarNavItemProps {
  item: NavItem;
}

export function SidebarNavItem({ item }: SidebarNavItemProps) {
  const IconComponent = item.icon;
  
  return (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        `group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`
      }
      title={item.title}
    >
      <IconComponent
        className="mr-3 h-5 w-5 flex-shrink-0 transition-colors"
        aria-hidden="true"
      />
      {item.name}
    </NavLink>
  );
}
