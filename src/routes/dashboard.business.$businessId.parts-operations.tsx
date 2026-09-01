import { useMemo, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRightLeft,
  Boxes,
  MapPin,
  PackageCheck,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import {
  createPartsReturn,
  createPartsWarrantyClaim,
  listPartsOperations,
  receivePartsNetworkOrder,
  recordInstalledComponent,
  transitionPartsNetworkOrder,
  transitionPartsReturn,
  transitionPartsWarrantyClaim,
  upsertBusinessPartsLocation,
} from "@/lib/parts-network-operations.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/dashboard/business/$businessId/parts-operations")({
  component: PartsOperationsPage,
  head: () => ({
    meta: [
      { title: "Parts operations — 365 Associate Network" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function PartsOperationsPage() {
  const { businessId } = useParams({ from: "/dashboard/business/$businessId/parts-operations" });
  const queryClient = useQueryClient();
  const load = useServerFn(listPartsOperations);
  const transitionOrder = useServerFn(transitionPartsNetworkOrder);
  const receiveOrder = useServerFn(receivePartsNetworkOrder);
  const transitionReturn = useServerFn(transitionPartsReturn);
  const transitionWarranty = useServerFn(transitionPartsWarrantyClaim);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [returnOrder, setReturnOrder] = useState<any | null>(null);
  const [warrantyOrder, setWarrantyOrder] = useState<any | null>(null);
  const [installOrder, setInstallOrder] = useState<any | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);

  const operations = useQuery({
    queryKey: ["parts-operations", businessId],
    queryFn: () => load({ data: { businessId } }),
  });

  const data = operations.data ?? { orders: [], returns: [], warranties: [], locations: [] };
  const orders = data.orders as any[];
  const incoming = orders.filter((order) => order.supplier_business_id === businessId);
  const outgoing = orders.filter((order) => order.requester_business_id === businessId);
  const activeOrders = orders.filter(
    (order) => !["received", "declined", "cancelled"].includes(order.status),
  );

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["parts-operations", businessId] });
    await queryClient.invalidateQueries({ queryKey: ["business-inventory", businessId] });
    await queryClient.invalidateQueries({ queryKey: ["network-stock"] });
  }

  async function changeOrder(order: any, status: string) {
    const key = `${order.id}:${status}`;
    setBusyKey(key);
    try {
      await transitionOrder({ data: { orderId: order.id, status: status as any } });
      toast.success(`${order.order_number} moved to ${labelStatus(status)}`);
      await refresh();
    } catch (error: any) {
      toast.error(error?.message ?? "Could not update the order");
    } finally {
      setBusyKey(null);
    }
  }

  async function receive(order: any) {
    const key = `${order.id}:receive`;
    setBusyKey(key);
    try {
      const result: any = await receiveOrder({ data: { orderId: order.id } });
      toast.success(
        result.status === "received"
          ? `${order.order_number} received into inventory`
          : `${order.order_number} partially received`,
      );
      await refresh();
    } catch (error: any) {
      toast.error(error?.message ?? "Could not receive the order");
    } finally {
      setBusyKey(null);
    }
  }

  async function changeReturn(item: any, status: string) {
    const key = `${item.id}:${status}`;
    setBusyKey(key);
    try {
      await transitionReturn({ data: { id: item.id, status } });
      toast.success(`${item.return_number} moved to ${labelStatus(status)}`);
      await refresh();
    } catch (error: any) {
      toast.error(error?.message ?? "Could not update the return");
    } finally {
      setBusyKey(null);
    }
  }

  async function changeWarranty(item: any, status: string) {
    const key = `${item.id}:${status}`;
    setBusyKey(key);
    try {
      await transitionWarranty({ data: { id: item.id, status } });
      toast.success(`${item.claim_number} moved to ${labelStatus(status)}`);
      await refresh();
    } catch (error: any) {
      toast.error(error?.message ?? "Could not update the warranty claim");
    } finally {
      setBusyKey(null);
    }
  }

  if (operations.isLoading) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        Loading Associate Network operations…
      </Card>
    );
  }
  if (operations.isError) {
    return (
      <Card className="p-6">
        <p className="font-semibold text-destructive">Parts operations could not be loaded.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {String((operations.error as any)?.message ?? operations.error)}
        </p>
        <Button className="mt-4" variant="outline" onClick={() => operations.refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <ArrowRightLeft className="h-5 w-5" /> Parts operations
          </h1>
          <p className="text-sm text-muted-foreground">
            Network orders, inter-location transfers, receiving, returns, and warranty recovery.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/parts/network">
              <Search className="mr-1.5 h-4 w-4" /> Find parts
            </Link>
          </Button>
          <Button onClick={() => setLocationOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Add location
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={ShoppingCart} label="Buying / transfers" value={outgoing.length} />
        <Metric icon={Truck} label="Supplier orders" value={incoming.length} />
        <Metric icon={PackageCheck} label="Active fulfillment" value={activeOrders.length} />
        <Metric
          icon={RotateCcw}
          label="Open cases"
          value={
            data.returns.filter(
              (item: any) => !["closed", "cancelled", "rejected"].includes(item.status),
            ).length +
            data.warranties.filter(
              (item: any) => !["closed", "cancelled", "rejected"].includes(item.status),
            ).length
          }
        />
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="orders">Orders & transfers</TabsTrigger>
          <TabsTrigger value="returns">Returns ({data.returns.length})</TabsTrigger>
          <TabsTrigger value="warranty">Warranty ({data.warranties.length})</TabsTrigger>
          <TabsTrigger value="locations">Locations ({data.locations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-3">
          {orders.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="No network orders yet"
              body="Find a priced part in live stock to submit a purchase order or transfer. Quote requests continue to work for unpriced parts."
            />
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                businessId={businessId}
                busyKey={busyKey}
                onStatus={(status) => changeOrder(order, status)}
                onReceive={() => receive(order)}
                onReturn={() => setReturnOrder(order)}
                onWarranty={() => setWarrantyOrder(order)}
                onInstall={() => setInstallOrder(order)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="returns" className="space-y-3">
          {data.returns.length === 0 ? (
            <EmptyState
              icon={RotateCcw}
              title="No returns"
              body="Returns opened from a received order will appear here for both shops."
            />
          ) : (
            data.returns.map((item: any) => (
              <CaseCard
                key={item.id}
                number={item.return_number}
                status={item.status}
                title={`${labelStatus(item.reason_code)} · ${labelStatus(item.requested_resolution)}`}
                note={item.requester_note || item.supplier_note}
                actions={returnActions(item, businessId)}
                busyKey={busyKey}
                onAction={(status: string) => changeReturn(item, status)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="warranty" className="space-y-3">
          {data.warranties.length === 0 ? (
            <EmptyState
              icon={ShieldCheck}
              title="No warranty claims"
              body="Claims opened from a received or installed part will be tracked here."
            />
          ) : (
            data.warranties.map((item: any) => (
              <CaseCard
                key={item.id}
                number={item.claim_number}
                status={item.status}
                title={item.parts_order_lines?.name_snapshot || "Parts warranty claim"}
                note={item.issue_description}
                actions={warrantyActions(item, businessId)}
                busyKey={busyKey}
                onAction={(status: string) => changeWarranty(item, status)}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="locations" className="space-y-3">
          {data.locations.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="Add your first stock location"
              body="Locations make nearby ordering and same-business transfers precise while preserving the existing shelf/bin field on each item."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {data.locations.map((location: any) => (
                <Card key={location.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between gap-2 text-base">
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> {location.name}
                      </span>
                      <Badge variant={location.active ? "secondary" : "outline"}>
                        {location.active ? "Active" : "Inactive"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p>
                      {location.code} · {labelStatus(location.location_type)}
                    </p>
                    <p>
                      {[location.city, location.province].filter(Boolean).join(", ") ||
                        "No city/province recorded"}
                    </p>
                    <p className="mt-1">
                      {location.network_visible
                        ? "Visible in nearby stock"
                        : "Private internal location"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ReturnDialog order={returnOrder} onClose={() => setReturnOrder(null)} onCreated={refresh} />
      <WarrantyDialog
        order={warrantyOrder}
        businessId={businessId}
        onClose={() => setWarrantyOrder(null)}
        onCreated={refresh}
      />
      <InstallationDialog
        order={installOrder}
        businessId={businessId}
        onClose={() => setInstallOrder(null)}
        onCreated={refresh}
      />
      <LocationDialog
        open={locationOpen}
        businessId={businessId}
        onClose={() => setLocationOpen(false)}
        onSaved={refresh}
      />
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function OrderCard({
  order,
  businessId,
  busyKey,
  onStatus,
  onReceive,
  onReturn,
  onWarranty,
  onInstall,
}: {
  order: any;
  businessId: string;
  busyKey: string | null;
  onStatus: (status: string) => void;
  onReceive: () => void;
  onReturn: () => void;
  onWarranty: () => void;
  onInstall: () => void;
}) {
  const supplierSide = order.supplier_business_id === businessId;
  const requesterSide = order.requester_business_id === businessId;
  const counterparty = supplierSide ? order.requester?.name : order.supplier?.name;
  const actions = orderActions(order, supplierSide, requesterSide);
  const events = [...(order.parts_order_events ?? [])].sort(
    (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              {order.order_number}
              <Badge variant="outline">
                {order.order_kind === "transfer"
                  ? "Transfer"
                  : supplierSide
                    ? "Incoming"
                    : "Purchase"}
              </Badge>
              <StatusBadge status={order.status} />
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {supplierSide ? "From" : "With"} {counterparty || "Associate business"}
              {order.source_location?.name ? ` · ${order.source_location.name}` : ""}
              {order.destination_location?.name ? ` → ${order.destination_location.name}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold">₱{Number(order.total ?? 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="divide-y rounded-md border">
          {(order.parts_order_lines ?? []).map((line: any) => (
            <div
              key={line.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{line.name_snapshot}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {line.part_number_snapshot || line.sku_snapshot || "No part number"}
                </p>
              </div>
              <p>
                {Number(line.requested_quantity)} requested · {Number(line.received_quantity)}{" "}
                received
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action.status}
              size="sm"
              variant={action.variant ?? "default"}
              disabled={busyKey === `${order.id}:${action.status}`}
              onClick={() => onStatus(action.status)}
            >
              {busyKey === `${order.id}:${action.status}` ? "Working…" : action.label}
            </Button>
          ))}
          {requesterSide && ["ready", "shipped", "partially_received"].includes(order.status) ? (
            <Button size="sm" onClick={onReceive} disabled={busyKey === `${order.id}:receive`}>
              <PackageCheck className="mr-1 h-3.5 w-3.5" />
              {busyKey === `${order.id}:receive` ? "Receiving…" : "Receive all"}
            </Button>
          ) : null}
          {requesterSide && ["partially_received", "received"].includes(order.status) ? (
            <>
              {order.work_order_id ? (
                <Button size="sm" variant="outline" onClick={onInstall}>
                  <Wrench className="mr-1 h-3.5 w-3.5" /> Record installation
                </Button>
              ) : null}
              <Button size="sm" variant="outline" onClick={onReturn}>
                <RotateCcw className="mr-1 h-3.5 w-3.5" /> Return
              </Button>
              {order.order_kind === "purchase" ? (
                <Button size="sm" variant="outline" onClick={onWarranty}>
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Warranty
                </Button>
              ) : null}
            </>
          ) : null}
        </div>

        {events[0] ? (
          <p className="text-xs text-muted-foreground">
            Latest: {labelStatus(events[0].event_type)} ·{" "}
            {new Date(events[0].created_at).toLocaleString()}
            {events[0].note ? ` — ${events[0].note}` : ""}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function orderActions(order: any, supplierSide: boolean, requesterSide: boolean) {
  const actions: Array<{ status: string; label: string; variant?: "outline" | "destructive" }> = [];
  if (supplierSide && order.status === "submitted")
    actions.push(
      { status: "accepted", label: "Accept & reserve" },
      { status: "declined", label: "Decline", variant: "outline" },
    );
  if (supplierSide && order.status === "accepted")
    actions.push({ status: "picking", label: "Start picking" });
  if (supplierSide && order.status === "picking")
    actions.push({ status: "ready", label: "Ready for handoff" });
  if (supplierSide && order.status === "ready")
    actions.push({ status: "shipped", label: "Mark shipped" });
  if (
    (supplierSide || requesterSide) &&
    ["submitted", "accepted", "picking", "ready"].includes(order.status)
  ) {
    actions.push({ status: "cancelled", label: "Cancel", variant: "outline" });
  }
  return actions;
}

function CaseCard({ number, status, title, note, actions, busyKey, onAction }: any) {
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">{number}</p>
            <StatusBadge status={status} />
          </div>
          <p className="mt-1 text-sm">{title}</p>
          {note ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{note}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action: any) => (
            <Button
              key={action.status}
              size="sm"
              variant={action.variant ?? "outline"}
              disabled={busyKey === `${action.id}:${action.status}`}
              onClick={() => onAction(action.status)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
}

function returnActions(item: any, businessId: string) {
  const requester = item.requester_business_id === businessId;
  const supplier = item.supplier_business_id === businessId;
  if (supplier && item.status === "requested")
    return [
      { id: item.id, status: "approved", label: "Approve" },
      { id: item.id, status: "rejected", label: "Reject" },
    ];
  if (requester && item.status === "requested")
    return [{ id: item.id, status: "cancelled", label: "Cancel" }];
  if (requester && item.status === "approved")
    return [{ id: item.id, status: "shipped", label: "Mark returned" }];
  if (supplier && ["approved", "shipped"].includes(item.status))
    return [{ id: item.id, status: "received", label: "Receive return" }];
  if (supplier && item.status === "received")
    return [
      { id: item.id, status: "refunded", label: "Refunded" },
      { id: item.id, status: "replaced", label: "Replaced" },
    ];
  if (supplier && ["refunded", "replaced"].includes(item.status))
    return [{ id: item.id, status: "closed", label: "Close" }];
  return [];
}

function warrantyActions(item: any, businessId: string) {
  const claimant = item.claimant_business_id === businessId;
  const supplier = item.supplier_business_id === businessId;
  if (claimant && item.status === "submitted")
    return [{ id: item.id, status: "cancelled", label: "Cancel" }];
  if (supplier && item.status === "submitted")
    return [
      { id: item.id, status: "reviewing", label: "Review" },
      { id: item.id, status: "approved", label: "Approve" },
      { id: item.id, status: "rejected", label: "Reject" },
    ];
  if (supplier && item.status === "reviewing")
    return [
      { id: item.id, status: "approved", label: "Approve" },
      { id: item.id, status: "rejected", label: "Reject" },
    ];
  if (supplier && item.status === "approved")
    return [
      { id: item.id, status: "replacement_sent", label: "Replacement sent" },
      { id: item.id, status: "credit_issued", label: "Credit issued" },
    ];
  if (supplier && ["replacement_sent", "credit_issued"].includes(item.status))
    return [{ id: item.id, status: "closed", label: "Close" }];
  return [];
}

function ReturnDialog({
  order,
  onClose,
  onCreated,
}: {
  order: any | null;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const createReturn = useServerFn(createPartsReturn);
  const [lineId, setLineId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("incorrect_part");
  const [resolution, setResolution] = useState("replacement");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const lines = order?.parts_order_lines ?? [];
  const selected = lines.find((line: any) => line.id === lineId);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!order || !lineId) return;
    setBusy(true);
    try {
      const result: any = await createReturn({
        data: {
          orderId: order.id,
          reasonCode: reason as any,
          resolution: resolution as any,
          note,
          lines: [{ order_line_id: lineId, quantity, condition_notes: note }],
        },
      });
      toast.success(`Return ${result.return_number} opened`);
      await onCreated();
      onClose();
    } catch (error: any) {
      toast.error(error?.message ?? "Could not open the return");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Open return</DialogTitle>
          <DialogDescription>
            Return against {order?.order_number}. Quantities cannot exceed received stock.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Part</Label>
            <Select value={lineId} onValueChange={setLineId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose received part" />
              </SelectTrigger>
              <SelectContent>
                {lines.map((line: any) => (
                  <SelectItem key={line.id} value={line.id}>
                    {line.name_snapshot} ({Number(line.received_quantity)} received)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                max={Number(selected?.received_quantity ?? 1)}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value) || 1)}
              />
            </div>
            <div>
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "incorrect_part",
                    "damaged",
                    "defective",
                    "not_as_described",
                    "core_return",
                    "buyer_error",
                    "other",
                  ].map((value) => (
                    <SelectItem key={value} value={value}>
                      {labelStatus(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Requested resolution</Label>
            <Select value={resolution} onValueChange={setResolution}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["refund", "replacement", "credit", "repair"].map((value) => (
                  <SelectItem key={value} value={value}>
                    {labelStatus(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Condition and details</Label>
            <Textarea
              required
              minLength={5}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={busy || !lineId || note.trim().length < 5}>
              {busy ? "Opening…" : "Open return"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WarrantyDialog({
  order,
  businessId,
  onClose,
  onCreated,
}: {
  order: any | null;
  businessId: string;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const createClaim = useServerFn(createPartsWarrantyClaim);
  const [lineId, setLineId] = useState("");
  const [issue, setIssue] = useState("");
  const [failureDate, setFailureDate] = useState("");
  const [odometer, setOdometer] = useState("");
  const [busy, setBusy] = useState(false);
  const lines = order?.parts_order_lines ?? [];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!order || !lineId) return;
    setBusy(true);
    try {
      const result: any = await createClaim({
        data: {
          businessId,
          orderLineId: lineId,
          issue,
          failureDate: failureDate || null,
          odometerKm: odometer ? Number(odometer) : null,
        },
      });
      toast.success(`Warranty claim ${result.claim_number} submitted`);
      await onCreated();
      onClose();
    } catch (error: any) {
      toast.error(error?.message ?? "Could not submit warranty claim");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit warranty claim</DialogTitle>
          <DialogDescription>
            The supplier receives the original order snapshot, warranty term, failure details, and
            future evidence attachments.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Covered part</Label>
            <Select value={lineId} onValueChange={setLineId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose part" />
              </SelectTrigger>
              <SelectContent>
                {lines.map((line: any) => (
                  <SelectItem key={line.id} value={line.id}>
                    {line.name_snapshot}
                    {line.warranty_months_snapshot
                      ? ` — ${line.warranty_months_snapshot} months`
                      : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Issue description</Label>
            <Textarea
              required
              minLength={10}
              value={issue}
              onChange={(event) => setIssue(event.target.value)}
              placeholder="Symptoms, diagnosis, and when the failure began"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Failure date</Label>
              <Input
                type="date"
                value={failureDate}
                onChange={(event) => setFailureDate(event.target.value)}
              />
            </div>
            <div>
              <Label>Odometer (km)</Label>
              <Input
                type="number"
                min={0}
                value={odometer}
                onChange={(event) => setOdometer(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={busy || !lineId || issue.trim().length < 10}>
              {busy ? "Submitting…" : "Submit claim"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InstallationDialog({
  order,
  businessId,
  onClose,
  onCreated,
}: {
  order: any | null;
  businessId: string;
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const recordInstallation = useServerFn(recordInstalledComponent);
  const [lineId, setLineId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [position, setPosition] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const lines = order?.parts_order_lines ?? [];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!order?.work_order_id || !lineId) return;
    setBusy(true);
    try {
      const result: any = await recordInstallation({
        data: {
          businessId,
          orderLineId: lineId,
          workOrderId: order.work_order_id,
          quantity,
          position: position || null,
          serialNumber: serialNumber || null,
          odometerKm: odometer ? Number(odometer) : null,
          notes: notes || null,
        },
      });
      toast.success(
        result.warranty_ends_at
          ? `Installation recorded · warranty to ${result.warranty_ends_at}`
          : "Installation recorded",
      );
      await onCreated();
      onClose();
    } catch (error: any) {
      toast.error(error?.message ?? "Could not record installation");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record installed component</DialogTitle>
          <DialogDescription>
            This keeps purchase, receipt, installation, vehicle history, and warranty entitlement as
            separate auditable events.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Installed part</Label>
            <Select value={lineId} onValueChange={setLineId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose received part" />
              </SelectTrigger>
              <SelectContent>
                {lines.map((line: any) => (
                  <SelectItem key={line.id} value={line.id}>
                    {line.name_snapshot} ({Number(line.received_quantity)} received)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value) || 1)}
              />
            </div>
            <div>
              <Label>Position</Label>
              <Input
                value={position}
                onChange={(event) => setPosition(event.target.value)}
                placeholder="Front left, engine bay"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Serial number</Label>
              <Input
                value={serialNumber}
                onChange={(event) => setSerialNumber(event.target.value)}
              />
            </div>
            <div>
              <Label>Odometer (km)</Label>
              <Input
                type="number"
                min={0}
                value={odometer}
                onChange={(event) => setOdometer(event.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Installation notes</Label>
            <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={busy || !lineId}>
              {busy ? "Recording…" : "Record installation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LocationDialog({
  open,
  businessId,
  onClose,
  onSaved,
}: {
  open: boolean;
  businessId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const upsert = useServerFn(upsertBusinessPartsLocation);
  const [form, setForm] = useState({
    code: "",
    name: "",
    locationType: "store",
    addressLine: "",
    barangay: "",
    city: "",
    province: "",
    region: "",
    postalCode: "",
    pickupNotes: "",
  });
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await upsert({
        data: {
          businessId,
          ...form,
          locationType: form.locationType as any,
          networkVisible: true,
          active: true,
        },
      });
      toast.success("Stock location added");
      await onSaved();
      onClose();
    } catch (error: any) {
      toast.error(error?.message ?? "Could not save the location");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add stock location</DialogTitle>
          <DialogDescription>
            Use a real store or warehouse so nearby search, pickup, and transfers resolve to the
            right place.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Code</Label>
              <Input
                required
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
                placeholder="MNL-01"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select
                value={form.locationType}
                onValueChange={(value) => setForm({ ...form, locationType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["store", "warehouse", "repair_shop", "counter", "mobile", "other"].map(
                    (value) => (
                      <SelectItem key={value} value={value}>
                        {labelStatus(value)}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Location name</Label>
            <Input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Quezon City Parts Counter"
            />
          </div>
          <div>
            <Label>Address</Label>
            <Input
              value={form.addressLine}
              onChange={(event) => setForm({ ...form, addressLine: event.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Barangay</Label>
              <Input
                value={form.barangay}
                onChange={(event) => setForm({ ...form, barangay: event.target.value })}
              />
            </div>
            <div>
              <Label>City</Label>
              <Input
                required
                value={form.city}
                onChange={(event) => setForm({ ...form, city: event.target.value })}
              />
            </div>
            <div>
              <Label>Province</Label>
              <Input
                required
                value={form.province}
                onChange={(event) => setForm({ ...form, province: event.target.value })}
              />
            </div>
            <div>
              <Label>Region</Label>
              <Input
                value={form.region}
                onChange={(event) => setForm({ ...form, region: event.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Pickup notes</Label>
            <Textarea
              value={form.pickupNotes}
              onChange={(event) => setForm({ ...form, pickupNotes: event.target.value })}
              placeholder="Counter hours, landmark, contact instructions"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={busy}>{busy ? "Saving…" : "Add location"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ icon: Icon, title, body }: { icon: any; title: string; body: string }) {
  return (
    <Card className="p-8 text-center">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">{body}</p>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const destructive = ["declined", "rejected", "cancelled"].includes(status);
  const complete = ["received", "refunded", "replaced", "credit_issued", "closed"].includes(status);
  return (
    <Badge variant={destructive ? "destructive" : complete ? "secondary" : "outline"}>
      {labelStatus(status)}
    </Badge>
  );
}

function labelStatus(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
