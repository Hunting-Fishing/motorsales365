import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessageSquare, Phone, Mail, Users, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { getCustomerCommunicationsSnapshot } from "@/lib/customer-communications.functions";
import type { CustomerCommunication } from "@/lib/customer-communications";

const typeIcons: Record<CustomerCommunication["type"], LucideIcon> = {
  phone: Phone,
  email: Mail,
  text: MessageSquare,
  "in-person": Users,
};

function PrivateCommunications({
  accountId,
  customerId,
}: {
  accountId: string;
  customerId: string;
}) {
  const read = useServerFn(getCustomerCommunicationsSnapshot);
  const [refreshing, setRefreshing] = useState(false);
  const query = useQuery({
    queryKey: ["shop-manager", accountId, "customer_communications", customerId],
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
            <MessageSquare className="h-4 w-4" />
            Communications ({result?.available ? `${rows.length}${result.hasMore ? "+" : ""}` : "—"}
            )
          </h3>
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={checking} onClick={() => void refresh()}>
            Refresh communications
          </Button>
          <Button size="sm" disabled>
            Log entry
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          New entries are unavailable until staff attribution and entry validation are verified.
        </p>
        <p className="text-xs text-muted-foreground">
          Stored log statuses are not delivery confirmation.
        </p>
        {checking ? (
          <div role="status" className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading communications…
          </div>
        ) : query.isError ? (
          <div role="alert" className="space-y-2 text-sm">
            <p>Could not load communications.</p>
            <Button variant="outline" size="sm" onClick={() => void refresh()}>
              Retry communications
            </Button>
          </div>
        ) : !result?.available ? (
          <p className="text-sm text-muted-foreground">
            Communications unavailable for this customer in the current session.
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No visible communications in this snapshot.
          </p>
        ) : (
          <>
            <ul aria-label="Customer communication records" className="space-y-2">
              {rows.slice(0, 200).map((row) => {
                const Icon = typeIcons[row.type];
                return (
                  <li key={row.id} className="flex gap-3 rounded border p-3 text-sm">
                    <Icon
                      aria-hidden="true"
                      className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium capitalize">{row.type}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {row.direction}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {row.status}
                        </Badge>
                        <time dateTime={row.date} className="text-xs text-muted-foreground ml-auto">
                          {new Date(row.date).toLocaleString("en-PH")}
                        </time>
                      </div>
                      {row.subject ? (
                        <div className="font-medium mt-1 break-words">{row.subject}</div>
                      ) : null}
                      <div className="text-muted-foreground whitespace-pre-wrap break-words">
                        {row.content}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 break-words">
                        Recorded staff label: {row.staff_member_name || "Not provided"}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {result.hasMore ? (
              <p className="text-xs text-muted-foreground">
                Showing the 200 most recent visible communications.
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function CustomerCommunicationsLog({ customerId }: { customerId: string }) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <PrivateCommunications
      key={`${user.id}:${customerId}`}
      accountId={user.id}
      customerId={customerId}
    />
  );
}
