import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { getCustomerRemindersSnapshot } from "@/lib/customer-reminders.functions";

function calendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    year < 1 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return "Date format not recognized";
  return new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

function PrivateReminders({ accountId, customerId }: { accountId: string; customerId: string }) {
  const read = useServerFn(getCustomerRemindersSnapshot);
  const [refreshing, setRefreshing] = useState(false);
  const query = useQuery({
    queryKey: ["shop-manager", accountId, "customer_reminders", customerId],
    queryFn: ({ signal }) => read({ data: { expectedAccountId: accountId, customerId }, signal }),
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    placeholderData: undefined,
    retry: false,
  });
  const checking = refreshing || query.isFetching || query.isPending || !query.isFetchedAfterMount;
  const result = !checking && query.isSuccess ? query.data : null;
  const rows = result?.available ? result.rows : [];
  const refresh = async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  };
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>
          <h3 className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Reminders &amp; Follow-ups (
            {result?.available ? `${rows.length}${result.hasMore ? "+" : ""}` : "—"})
          </h3>
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={checking} onClick={() => void refresh()}>
            Refresh reminders
          </Button>
          <Button size="sm" disabled>
            New reminder
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Reminder changes are unavailable until shop attribution, target consistency and
          affected-row confirmation are verified.
        </p>
        <p className="text-xs text-muted-foreground">
          Earliest due dates first; includes all stored statuses. This snapshot is not a complete
          task queue.
        </p>
        {checking ? (
          <div role="status" className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading reminders…
          </div>
        ) : query.isError ? (
          <div role="alert" className="space-y-2 text-sm">
            <p>Could not load reminders.</p>
            <Button variant="outline" size="sm" onClick={() => void refresh()}>
              Retry reminders
            </Button>
          </div>
        ) : !result?.available ? (
          <p className="text-sm text-muted-foreground">
            Reminders unavailable for this customer in the current session.
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No visible reminders in this snapshot.</p>
        ) : (
          <>
            <ul aria-label="Customer reminder records" className="space-y-2">
              {rows.slice(0, 100).map((row) => (
                <li key={row.id} className="flex items-start gap-3 rounded border p-3">
                  <Bell
                    aria-hidden="true"
                    className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm break-words">
                        {row.title || "Untitled reminder"}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {row.reminder_type.replaceAll("_", " ") || "Type not set"}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {row.status || "Status not set"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Due <time dateTime={row.due_date}>{calendarDate(row.due_date)}</time>
                    </p>
                    {row.notes ? (
                      <p className="text-sm mt-1 whitespace-pre-wrap break-words">{row.notes}</p>
                    ) : null}
                    {row.completed_at ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        Recorded completion time:{" "}
                        <time dateTime={row.completed_at}>
                          {new Date(row.completed_at).toLocaleString("en-PH")}
                        </time>
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
            {result.hasMore ? (
              <p className="text-xs text-muted-foreground">
                Showing the 100 earliest-due visible reminders.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function CustomerRemindersCard({ customerId }: { customerId: string }) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <PrivateReminders
      key={`${user.id}:${customerId}`}
      accountId={user.id}
      customerId={customerId}
    />
  );
}
