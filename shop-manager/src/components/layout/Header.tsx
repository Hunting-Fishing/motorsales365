import React, { useState } from "react";
import { Bell, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/context/notifications";
import { NotificationsDropdown } from "@/components/notifications/NotificationsDropdown";
import { useIsMobile } from "@/hooks/use-mobile";
import { HeaderSidebarToggle } from "./HeaderSidebarToggle";
import { HeaderActions } from "./HeaderActions";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Header() {
  const { unreadCount } = useNotifications();
  const [searchOpen, setSearchOpen] = useState(false);
  const isMobile = useIsMobile();

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 px-4 print:hidden">
      <div className="flex items-center gap-2">
        <HeaderSidebarToggle />

        {/* Search shown differently on mobile vs desktop */}
        {isMobile ? (
          searchOpen ? (
            <div className="absolute inset-0 bg-background z-20 flex items-center px-4">
              <input
                type="text"
                placeholder="Search..."
                className="h-9 w-full rounded-lg border border-input bg-card text-foreground px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="ml-2"
                onClick={() => setSearchOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
              <Search className="h-5 w-5" />
            </Button>
          )
        ) : (
          <div className="relative w-64 lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              className="h-9 w-full rounded-lg border border-input bg-card/60 text-foreground pl-9 pr-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring transition-shadow"
            />
            <kbd className="hidden lg:inline-flex absolute right-2 top-1/2 -translate-y-1/2 h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <NotificationsDropdown>
          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <Bell className="h-[1.15rem] w-[1.15rem]" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </NotificationsDropdown>
        <HeaderActions />
      </div>
    </header>
  );
}
