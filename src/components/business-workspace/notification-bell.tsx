import { Bell, BellRing, Radio, MessageSquare, CalendarRange, Mail, BellOff } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkspaceNotifications } from "./notifications-provider";
import { cn } from "@/lib/utils";

export function WorkspaceNotificationBell() {
  const { businessId, counts, data, browserPermission, requestBrowserPermission } =
    useWorkspaceNotifications();
  const has = counts.total > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={has ? "default" : "outline"}
          size="sm"
          className={cn("relative gap-2", has && "animate-pulse")}
          aria-label={`Notifications (${counts.total} new)`}
        >
          {has ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          <span className="hidden sm:inline">Notifications</span>
          {has && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 flex items-center justify-center text-[10px]"
            >
              {counts.total > 99 ? "99+" : counts.total}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-semibold text-sm">Notifications</div>
          {browserPermission === "default" && (
            <Button size="sm" variant="ghost" onClick={requestBrowserPermission} className="text-xs">
              Enable popups
            </Button>
          )}
          {browserPermission === "denied" && (
            <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
              <BellOff className="h-3 w-3" /> Popups blocked
            </span>
          )}
        </div>
        <ScrollArea className="max-h-[420px]">
          {!has && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              You're all caught up.
            </div>
          )}

          {counts.tow > 0 && (
            <Section
              icon={<Radio className="h-4 w-4 text-destructive" />}
              title="New tow requests"
              count={counts.tow}
            >
              {data?.tow.map((t: any) => (
                <Item
                  key={t.id}
                  href={`/dashboard/business/${businessId}/dispatch`}
                  title={t.vehicle_summary ?? "Vehicle"}
                  subtitle={`${t.pickup_city ?? "Pickup"} • ${t.urgency ?? ""}`}
                  time={t.created_at}
                />
              ))}
            </Section>
          )}

          {counts.messages > 0 && (
            <Section
              icon={<MessageSquare className="h-4 w-4 text-blue-500" />}
              title="Unread messages"
              count={counts.messages}
            >
              {data?.messages.map((m: any) => (
                <Item
                  key={m.id}
                  href="/dashboard/inbox"
                  title={(m.body ?? "").slice(0, 60)}
                  subtitle="Tap to open inbox"
                  time={m.created_at}
                />
              ))}
            </Section>
          )}

          {counts.inquiries > 0 && (
            <Section
              icon={<Mail className="h-4 w-4 text-green-500" />}
              title="New inquiries"
              count={counts.inquiries}
            >
              {data?.inquiries.map((i: any) => (
                <Item
                  key={i.id}
                  href={`/dashboard/business/${businessId}`}
                  title={i.name}
                  subtitle={(i.message ?? "").slice(0, 80)}
                  time={i.created_at}
                />
              ))}
            </Section>
          )}

          {counts.bookings > 0 && (
            <Section
              icon={<CalendarRange className="h-4 w-4 text-purple-500" />}
              title="Pending bookings"
              count={counts.bookings}
            >
              {data?.bookings.map((b: any) => (
                <Item
                  key={b.id}
                  href={`/dashboard/business/${businessId}`}
                  title={b.customer_name}
                  subtitle={new Date(b.starts_at).toLocaleString()}
                  time={b.created_at}
                />
              ))}
            </Section>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Section({
  icon,
  title,
  count,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 text-xs font-medium sticky top-0">
        {icon}
        <span>{title}</span>
        <Badge variant="secondary" className="ml-auto text-[10px]">
          {count}
        </Badge>
      </div>
      <div>{children}</div>
    </div>
  );
}

function Item({
  href,
  title,
  subtitle,
  time,
}: {
  href: string;
  title: string;
  subtitle: string;
  time: string;
}) {
  return (
    <Link
      to={href as any}
      className="block px-3 py-2 hover:bg-muted border-b last:border-b-0 text-sm"
    >
      <div className="font-medium truncate">{title}</div>
      <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">
        {new Date(time).toLocaleString()}
      </div>
    </Link>
  );
}
