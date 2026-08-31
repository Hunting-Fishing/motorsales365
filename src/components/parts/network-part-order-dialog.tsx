import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRightLeft, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import type { NetworkStockRow } from "@/lib/network-stock.functions";
import {
  createPartsNetworkOrder,
  listMyPartsBusinesses,
} from "@/lib/parts-network-operations.functions";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

export function NetworkPartOrderDialog({
  row,
  onClose,
  onCreated,
  workOrderId,
}: {
  row: NetworkStockRow | null;
  workOrderId?: string | null;
  onClose: () => void;
  onCreated?: (result: { order_number: string }) => void;
}) {
  const { user } = useAuth();
  const listBusinesses = useServerFn(listMyPartsBusinesses);
  const createOrder = useServerFn(createPartsNetworkOrder);
  const businesses = useQuery({
    queryKey: ["parts-order-businesses", user?.id],
    queryFn: () => listBusinesses(),
    enabled: !!row && !!user,
    staleTime: 60_000,
  });
  const [requesterBusinessId, setRequesterBusinessId] = useState("");
  const [destinationLocationId, setDestinationLocationId] = useState("");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<"pickup" | "delivery" | "courier">(
    "pickup",
  );
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!row) return;
    setQuantity(1);
    setNote("");
    setFulfillmentMethod("pickup");
    setDestinationLocationId("");
  }, [row]);

  useEffect(() => {
    if (!requesterBusinessId && businesses.data?.length === 1) {
      setRequesterBusinessId(businesses.data[0].id);
    }
  }, [businesses.data, requesterBusinessId]);

  const requester = useMemo(
    () => businesses.data?.find((business) => business.id === requesterBusinessId) ?? null,
    [businesses.data, requesterBusinessId],
  );
  const isTransfer = !!row && requesterBusinessId === row.business_id;
  const sourceLocationMissing = isTransfer && !row?.stock_location_id;
  const destinationRequired = isTransfer;
  const estimatedTotal = row?.price != null ? Number(row.price) * quantity : null;

  if (!row) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!row) return;
    if (!user) {
      toast.error("Sign in with your shop account to place a network order");
      return;
    }
    if (!requesterBusinessId) {
      toast.error("Choose the business receiving this part");
      return;
    }
    if (destinationRequired && !destinationLocationId) {
      toast.error("Choose the destination location for this transfer");
      return;
    }
    setBusy(true);
    try {
      const result = await createOrder({
        data: {
          requesterBusinessId,
          supplierBusinessId: row.business_id,
          itemId: row.id,
          quantity,
          sourceLocationId: row.stock_location_id,
          destinationLocationId: destinationLocationId || null,
          fulfillmentMethod: isTransfer ? "transfer" : fulfillmentMethod,
          workOrderId: workOrderId ?? null,
          note: note || null,
        },
      });
      onCreated?.(result);
      toast.success(`${isTransfer ? "Transfer" : "Order"} ${result.order_number} submitted`);
      onClose();
    } catch (error: any) {
      toast.error(error?.message ?? "Could not submit the order");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isTransfer ? (
              <ArrowRightLeft className="h-5 w-5" />
            ) : (
              <ShoppingCart className="h-5 w-5" />
            )}
            {isTransfer ? "Transfer stock" : "Order through the 365 network"}
          </DialogTitle>
          <DialogDescription>
            {row.name} from {row.stock_location_name || row.business_name}. Price, tax, fees, part
            number, and warranty are snapshotted when the order is submitted.
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="space-y-4 rounded-lg border bg-muted/40 p-4 text-sm">
            <p>Business ordering is available to signed-in 365 Associates and shop managers.</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/partners/parts/onboarding">Join as an Associate</Link>
              </Button>
            </div>
          </div>
        ) : businesses.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading your business locations…</p>
        ) : businesses.isError ? (
          <p className="text-sm text-destructive">
            {String((businesses.error as any)?.message ?? "Could not load your businesses")}
          </p>
        ) : businesses.data?.length === 0 ? (
          <div className="space-y-3 rounded-lg border bg-muted/40 p-4 text-sm">
            <p>A manager or owner role on a 365 business is required before placing orders.</p>
            <Button asChild variant="outline">
              <Link to="/partners/parts/onboarding">Set up an Associate business</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Receiving business</Label>
              <Select
                value={requesterBusinessId || NONE}
                onValueChange={(value) => {
                  setRequesterBusinessId(value === NONE ? "" : value);
                  setDestinationLocationId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose your business" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Choose your business</SelectItem>
                  {businesses.data?.map((business) => (
                    <SelectItem key={business.id} value={business.id}>
                      {business.name}
                      {business.province ? ` — ${business.province}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {requester && (requester.locations.length > 0 || destinationRequired) ? (
              <div>
                <Label>
                  {destinationRequired
                    ? "Destination location"
                    : "Receive into location (optional)"}
                </Label>
                <Select
                  value={destinationLocationId || NONE}
                  onValueChange={(value) => setDestinationLocationId(value === NONE ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose location" />
                  </SelectTrigger>
                  <SelectContent>
                    {!destinationRequired && (
                      <SelectItem value={NONE}>Business main location</SelectItem>
                    )}
                    {requester.locations
                      .filter((location) => !isTransfer || location.id !== row.stock_location_id)
                      .map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                          {location.city ? ` — ${location.city}` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {sourceLocationMissing ? (
                  <p className="mt-1 text-xs text-destructive">
                    Assign this inventory item to a source location before transferring it.
                  </p>
                ) : null}
              </div>
            ) : null}

            {!isTransfer ? (
              <div>
                <Label>Fulfillment</Label>
                <Select
                  value={fulfillmentMethod}
                  onValueChange={(value) => setFulfillmentMethod(value as typeof fulfillmentMethod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(row.fulfillment_methods?.includes("pickup") ?? true) && (
                      <SelectItem value="pickup">Pickup</SelectItem>
                    )}
                    {row.fulfillment_methods?.includes("delivery") && (
                      <SelectItem value="delivery">Local delivery</SelectItem>
                    )}
                    {row.fulfillment_methods?.includes("courier") && (
                      <SelectItem value="courier">Courier</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min={1}
                  max={Math.max(1, Number(row.available_qty ?? row.qty_on_hand))}
                  step="any"
                  value={quantity}
                  onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))}
                />
              </div>
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground">Estimated parts subtotal</p>
                <p className="font-semibold">
                  {estimatedTotal == null
                    ? "Quote required"
                    : `₱${estimatedTotal.toLocaleString()}`}
                </p>
              </div>
            </div>

            <div>
              <Label>Order note (optional)</Label>
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={2000}
                placeholder="Work order, delivery window, contact person, or fitment confirmation needed"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  busy ||
                  !requesterBusinessId ||
                  sourceLocationMissing ||
                  (destinationRequired && !destinationLocationId)
                }
              >
                {busy ? "Submitting…" : isTransfer ? "Submit transfer" : "Submit order"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
