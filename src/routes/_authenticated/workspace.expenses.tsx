import { VehicleReceiptPanel } from "@/components/vehicle-receipt-panel";
import { createFileRoute } from "@tanstack/react-router";
import {
  hashKey,
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useServerFn } from "@tanstack/react-start";
import { Receipt, Plus, Trash2, Paperclip, Upload } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { smSupabase } from "@/lib/shop-manager/db";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getShopExpenseScope, getShopExpenseReadPage } from "@/lib/shop-expenses-read.functions";
import {
  parseShopExpenseScope,
  parseShopExpenseReadPage,
  type ShopExpenseKind,
} from "@/lib/shop-expenses-read-contract";

const READ_FAILURE = "Could not load this expense workspace. Please try again.";

function ExpensesError({ reset }: { reset: () => void }) {
  const { user, loading } = useAuth();
  if (!user || loading) return null;
  return (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <p role="alert" className="mt-2 text-destructive">
          {READ_FAILURE}
        </p>
        <Button className="mt-4" onClick={reset}>
          Retry
        </Button>
      </div>
    </SiteLayout>
  );
}

function useExactRead(client: QueryClient, key: readonly unknown[]) {
  const queryHash = hashKey(key);
  return useSyncExternalStore(
    (notify) =>
      client.getQueryCache().subscribe((event) => {
        if (event.query.queryHash === queryHash) notify();
      }),
    () => client.getQueryCache().get(queryHash)?.state,
    () => undefined,
  );
}

export const Route = createFileRoute("/_authenticated/workspace/expenses")({
  head: () => ({
    meta: [
      { title: "Expenses — Shop Manager" },
      { name: "description", content: "Track shop expenses by category." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ExpensesPage,
  errorComponent: ExpensesError,
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-4xl px-4 py-10">Not found.</div>
    </SiteLayout>
  ),
});

function ExpensesPage() {
  const { user, loading } = useAuth();
  if (!user || loading) return null;
  return <AccountExpenses key={user.id} accountId={user.id} />;
}

function ExpenseFrame({ children }: { children: ReactNode }) {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <Receipt aria-hidden="true" className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Expenses</h1>
            <p className="text-sm text-muted-foreground">
              Review visible expenses by category. Amount and tax are shown separately, not an
              accounting balance.
            </p>
          </div>
        </div>
        {children}
      </div>
    </SiteLayout>
  );
}

function AccountExpenses({ accountId }: { accountId: string }) {
  const qc = useQueryClient();
  const accountScope = useRef({ active: false, lifetime: 0 });
  useLayoutEffect(() => {
    const current = accountScope.current;
    current.active = true;
    current.lifetime += 1;
    return () => {
      current.active = false;
      current.lifetime += 1;
    };
  }, []);
  const readLifetime = useId();
  const loadScope = useServerFn(getShopExpenseScope);
  const scopeKey = ["shop-manager", accountId, "expense-scope", readLifetime] as const;
  const query = useQuery({
    queryKey: scopeKey,
    queryFn: async ({ signal }) => {
      const lifetime = accountScope.current.lifetime;
      const ready = () =>
        accountScope.current.active &&
        accountScope.current.lifetime === lifetime &&
        !signal.aborted;
      if (!ready()) throw new Error(READ_FAILURE);
      const raw = await loadScope({
        data: { expectedAccountId: accountId },
        signal,
      });
      if (!ready()) throw new Error(READ_FAILURE);
      const parsed = parseShopExpenseScope(raw);
      if (!ready()) throw new Error(READ_FAILURE);
      return parsed;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    placeholderData: undefined,
    retry: false,
  });
  const state = useExactRead(qc, scopeKey);
  const scopeVersion = state?.dataUpdateCount ?? -1;
  const retryScope = () => {
    if (accountScope.current.active) void query.refetch({ cancelRefetch: false });
  };
  const data =
    query.isSuccess &&
    state?.status === "success" &&
    state.fetchStatus === "idle" &&
    !state.isInvalidated &&
    state.data === query.data
      ? query.data
      : undefined;
  if (!data)
    return (
      <ExpenseFrame>
        {query.isPending || state?.fetchStatus !== "idle" ? (
          <p role="status">Loading expense workspace…</p>
        ) : (
          <div>
            <p role={query.isError ? "alert" : "status"}>
              {query.isError ? READ_FAILURE : "Refresh the expense workspace before continuing."}
            </p>
            <Button variant="outline" onClick={retryScope}>
              Retry expense workspace
            </Button>
          </div>
        )}
      </ExpenseFrame>
    );
  if (!data.available || data.shopId === null)
    return (
      <ExpenseFrame>
        <p role="status">No native shop is currently available for this account.</p>
        <Button variant="outline" onClick={retryScope}>
          Refresh expense workspace
        </Button>
      </ExpenseFrame>
    );
  return (
    <ShopExpenses
      key={`${data.shopId}:${scopeVersion}`}
      accountId={accountId}
      shopId={data.shopId}
      scopeCurrent={() => {
        const current = qc.getQueryState(scopeKey);
        return (
          accountScope.current.active &&
          current?.status === "success" &&
          current.fetchStatus === "idle" &&
          !current.isInvalidated &&
          current.data === data &&
          current.dataUpdateCount === scopeVersion
        );
      }}
    />
  );
}

function useExpenseWindow(
  kind: ShopExpenseKind,
  accountId: string,
  shopId: string,
  scopeCurrent: () => boolean,
) {
  const qc = useQueryClient();
  const load = useServerFn(getShopExpenseReadPage);
  const lifetime = useId();
  const [window, setWindow] = useState({ page: 0, generation: 0 });
  const intent = useRef(window);
  const prefix =
    kind === "expenses"
      ? "expenses"
      : kind === "categories"
        ? "expense_categories"
        : "receipt-vehicle-choices";
  const key = [
    "shop-manager",
    accountId,
    prefix,
    shopId,
    lifetime,
    window.page,
    window.generation,
  ] as const;
  const request = { expectedAccountId: accountId, expectedShopId: shopId, kind, page: window.page };
  const query = useQuery({
    queryKey: key,
    queryFn: async ({ signal }) => {
      if (!scopeCurrent() || intent.current !== window || signal.aborted)
        throw new Error(READ_FAILURE);
      const raw = await load({ data: request, signal });
      if (!scopeCurrent() || intent.current !== window || signal.aborted)
        throw new Error(READ_FAILURE);
      const parsed = parseShopExpenseReadPage(raw, request);
      if (!scopeCurrent() || intent.current !== window || signal.aborted)
        throw new Error(READ_FAILURE);
      return parsed;
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    placeholderData: undefined,
    retry: false,
  });
  const state = useExactRead(qc, key);
  const data =
    scopeCurrent() &&
    intent.current === window &&
    query.isSuccess &&
    state?.status === "success" &&
    state.fetchStatus === "idle" &&
    !state.isInvalidated &&
    state.data === query.data
      ? query.data
      : undefined;
  function current() {
    const now = qc.getQueryState(key);
    return Boolean(
      data &&
      scopeCurrent() &&
      intent.current === window &&
      now?.status === "success" &&
      now.fetchStatus === "idle" &&
      !now.isInvalidated &&
      now.data === data &&
      now.dataUpdateCount === state?.dataUpdateCount,
    );
  }
  function page(next: number) {
    if (
      !scopeCurrent() ||
      intent.current !== window ||
      !Number.isSafeInteger(next) ||
      next < 0 ||
      next > 1_000_000
    )
      return;
    const nextWindow = { page: next, generation: window.generation + 1 };
    intent.current = nextWindow;
    setWindow(nextWindow);
  }
  function retry() {
    if (scopeCurrent() && intent.current === window) void query.refetch({ cancelRefetch: false });
  }
  return { query, state, data, current, page, retry, window, key };
}

type ExpenseWindow = ReturnType<typeof useExpenseWindow>;
function ReadWindowControls({ read, label }: { read: ExpenseWindow; label: string }) {
  return (
    <div className="space-y-2 text-sm">
      {(read.query.isPending || read.state?.fetchStatus !== "idle") && (
        <p role="status">Loading {label}…</p>
      )}
      {read.query.isError && read.state?.fetchStatus === "idle" && (
        <div role="alert">
          <p>Could not load {label}. Please try again.</p>
          <Button variant="outline" size="sm" onClick={read.retry}>
            Retry {label}
          </Button>
        </div>
      )}
      {read.query.isSuccess && read.state?.fetchStatus === "idle" && read.state.isInvalidated && (
        <div>
          <p role="status">Refresh {label} to view this window.</p>
          <Button variant="outline" size="sm" onClick={read.retry}>
            Refresh {label}
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={read.window.page === 0}
          onClick={() => read.page(read.window.page - 1)}
        >
          Previous {label}
        </Button>
        <span>
          {label[0].toUpperCase() + label.slice(1)} page {read.window.page + 1}
          {read.data ? ` · ${read.data.totalCount} visible records at read time` : ""}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={!read.data?.hasNext || read.window.page >= 1_000_000}
          onClick={() => {
            if (read.current() && read.data?.hasNext) read.page(read.window.page + 1);
          }}
        >
          Next {label}
        </Button>
      </div>
    </div>
  );
}

function receivedAmount(value: unknown) {
  if (value === "NaN") return "Unusable amount (NaN)";
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value) : "Amount unavailable";
  return typeof value === "string" && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)
    ? value
    : "Amount unavailable";
}

function ShopExpenses({
  accountId,
  shopId,
  scopeCurrent,
}: {
  accountId: string;
  shopId: string;
  scopeCurrent: () => boolean;
}) {
  const qc = useQueryClient();
  const sm = smSupabase as any;
  const scope = useRef({ active: false, lifetime: 0 });
  useLayoutEffect(() => {
    const current = scope.current;
    current.active = true;
    current.lifetime += 1;
    return () => {
      current.active = false;
      current.lifetime += 1;
    };
  }, []);
  const currentScope = () => scope.current.active && scopeCurrent();
  function captureCurrent() {
    const lifetime = scope.current.lifetime;
    return () => currentScope() && scope.current.lifetime === lifetime;
  }
  const expenses = useExpenseWindow("expenses", accountId, shopId, scopeCurrent);
  const categories = useExpenseWindow("categories", accountId, shopId, scopeCurrent);
  const vehicles = useExpenseWindow("vehicles", accountId, shopId, scopeCurrent);
  const [receiptVehicleId, setReceiptVehicleId] = useState("");
  const rows = expenses.data?.kind === "expenses" ? expenses.data.rows : [];
  const cats = categories.data?.kind === "categories" ? categories.data.rows : [];
  const vehicleRows = vehicles.data?.kind === "vehicles" ? vehicles.data.rows : [];
  const openReads = useRef(new Set<() => boolean>());
  useLayoutEffect(() => {
    openReads.current.forEach((current) => current());
  }, [expenses.state]);
  function viewReceipt(row: (typeof rows)[number]) {
    if (!currentScope() || !expenses.current() || !rows.includes(row) || !row.receipt_url) return;
    const currentContext = captureCurrent();
    const data = expenses.data;
    const version = expenses.state?.dataUpdateCount;
    let lost = false;
    const current = () => {
      const state = qc.getQueryState(expenses.key);
      if (
        !currentContext() ||
        state?.status !== "success" ||
        state.fetchStatus !== "idle" ||
        state.isInvalidated ||
        state.data !== data ||
        state.dataUpdateCount !== version
      )
        lost = true;
      return !lost;
    };
    openReads.current.add(current);
    void openReceipt(row.receipt_url, current).finally(() => openReads.current.delete(current));
  }
  function refresh(kind: "expenses" | "categories") {
    if (!currentScope()) return;
    const prefix = kind === "expenses" ? "expenses" : "expense_categories";
    void qc.invalidateQueries({ queryKey: ["shop-manager", prefix], exact: true });
    void qc.invalidateQueries({ queryKey: ["shop-manager", accountId, prefix, shopId] });
  }
  const del = useMutation({
    onMutate: () => captureCurrent(),
    mutationFn: async (id: string) => {
      const { error } = await sm.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, _id, isCurrent) => {
      if (!isCurrent?.()) return;
      toast.message("Expense request acknowledged. Refresh expenses to check.");
      refresh("expenses");
    },
    onError: (_error, _id, isCurrent) => {
      if (isCurrent?.())
        toast.error("Could not confirm expense removal. Refresh expenses before trying again.");
    },
  });
  return (
    <ExpenseFrame>
      <div className="mb-6 flex gap-2">
        <NewCategoryDialog
          ready={Boolean(categories.data)}
          canLaunch={() => currentScope() && categories.current()}
          captureCurrent={captureCurrent}
          onCreated={() => refresh("categories")}
        />
        <NewExpenseDialog
          categories={cats}
          ready={Boolean(expenses.data && categories.data)}
          canLaunch={() => currentScope() && expenses.current() && categories.current()}
          captureCurrent={captureCurrent}
          onCreated={() => refresh("expenses")}
        />
      </div>
      <div className="mb-6 rounded-lg border p-4">
        <h2 className="font-medium">Expense categories</h2>
        <ReadWindowControls read={categories} label="categories" />
        {categories.data && (
          <p className="text-xs text-muted-foreground">
            Showing {cats.length} of {categories.data.totalCount} active categories in this
            read-time window.
          </p>
        )}
      </div>
      <div className="mb-6 space-y-3 rounded-lg border p-4">
        <Label htmlFor="expense-receipt-vehicle">Scan or enter a receipt for a vehicle</Label>
        <ReadWindowControls read={vehicles} label="vehicles" />
        <select
          id="expense-receipt-vehicle"
          className="h-10 w-full rounded-md border bg-background px-3 text-sm"
          value={receiptVehicleId}
          disabled={!vehicles.data}
          onChange={(event) => {
            if (!currentScope()) return;
            if (event.target.value === "") {
              setReceiptVehicleId("");
              return;
            }
            if (!vehicles.current()) return;
            const selected = vehicleRows.find((row) => row.id === event.target.value);
            if (selected) setReceiptVehicleId(selected.id);
          }}
        >
          <option value="">Select vehicle</option>
          {vehicleRows.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.make} {vehicle.model} {vehicle.license_plate ?? ""}
            </option>
          ))}
        </select>
        {vehicles.data && vehicleRows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No vehicles are visible in this read-time window.
          </p>
        )}
        {receiptVehicleId && (
          <>
            <p className="text-xs text-muted-foreground">
              The selected receipt workspace stays open while vehicle choices refresh. Choose
              another vehicle to switch.
            </p>
            <VehicleReceiptPanel
              key={`${accountId}:${shopId}:${receiptVehicleId}`}
              shopVehicleId={receiptVehicleId}
            />
          </>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visible expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <ReadWindowControls read={expenses} label="expenses" />
          {expenses.data && rows.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">
              No expenses are visible in this read-time window.
            </p>
          )}
          {expenses.data && (
            <p className="mt-2 text-xs text-muted-foreground">
              Showing {rows.length} of {expenses.data.totalCount} visible expenses at read time.
              Pages can change; no month-to-date or reconciled total is inferred.
            </p>
          )}
          <div className="mt-3 space-y-2">
            {rows.map((row) => {
              const category = cats.find(
                (value) => value.id.toLowerCase() === row.category_id?.toLowerCase(),
              );
              const categoryLabel =
                row.category_id === null
                  ? "No category recorded"
                  : !categories.data
                    ? "Category unavailable"
                    : (category?.name ?? "Category not in this page");
              return (
                <div
                  key={row.id}
                  className="grid grid-cols-1 items-center gap-2 rounded border p-3 text-sm sm:grid-cols-6"
                >
                  <div className="font-mono text-xs">{row.expense_date}</div>
                  <div className="sm:col-span-2">
                    {row.description ?? "Description not recorded"}
                  </div>
                  <div>
                    <Badge variant="outline">{categoryLabel}</Badge>
                    <p>{row.status}</p>
                  </div>
                  <div>
                    <p>Amount: {receivedAmount(row.amount)}</p>
                    <p>Tax: {receivedAmount(row.tax_amount)}</p>
                  </div>
                  <div className="flex justify-end gap-1">
                    {row.receipt_url && (
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="View expense receipt"
                        onClick={() => viewReceipt(row)}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Delete expense"
                      onClick={() => {
                        if (!currentScope() || !expenses.current() || !rows.includes(row)) return;
                        if (confirm("Delete this expense?") && currentScope() && expenses.current())
                          del.mutate(row.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </ExpenseFrame>
  );
}

type DialogAdmission = {
  onCreated: () => void;
  ready: boolean;
  canLaunch: () => boolean;
  captureCurrent: () => () => boolean;
};
// These admission/callback checks do not fence the unchanged mutationFn after
// dispatch. In particular upload -> insert remains non-atomic and unreconciled.
function NewCategoryDialog({ onCreated, ready, canLaunch, captureCurrent }: DialogAdmission) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const create = useMutation({
    onMutate: () => {
      if (!canLaunch()) throw new Error("Refresh categories before continuing.");
      return captureCurrent();
    },
    mutationFn: async () => {
      const { error } = await (smSupabase as any).from("expense_categories").insert({ name });
      if (error) throw error;
    },
    onSuccess: (_data, _input, isCurrent) => {
      if (!isCurrent?.()) return;
      toast.message("Category request acknowledged. Refresh categories to check.");
      setOpen(false);
      setName("");
      onCreated();
    },
    onError: (_error, _input, isCurrent) => {
      if (isCurrent?.())
        toast.error("Could not confirm category creation. Refresh categories before trying again.");
    },
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next || canLaunch()) setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" disabled={!ready}>
          <Plus className="h-4 w-4 mr-2" /> Category
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Category</DialogTitle>
        </DialogHeader>
        <div>
          <Label>Name</Label>
          <Input
            aria-label="New category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Utilities, Rent, Marketing…"
          />
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (canLaunch()) create.mutate();
            }}
            disabled={!ready || !name.trim() || create.isPending}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function openReceipt(path: string, isCurrent: () => boolean) {
  if (!isCurrent()) return;
  // If a full URL, open directly; otherwise sign the storage path.
  if (/^https?:\/\//.test(path)) {
    if (isCurrent()) window.open(path, "_blank");
    return;
  }
  try {
    if (!isCurrent()) return;
    const { data, error } = await supabase.storage
      .from("shop-receipts")
      .createSignedUrl(path, 60 * 10);
    if (!isCurrent()) return;
    if (error) {
      if (isCurrent()) toast.error("Could not open receipt");
      return;
    }
    if (isCurrent()) window.open(data.signedUrl, "_blank");
  } catch {
    if (isCurrent()) toast.error("Could not open receipt");
  }
}

function NewExpenseDialog({
  categories,
  onCreated,
  ready,
  canLaunch,
  captureCurrent,
}: { categories: readonly { id: string; name: string }[] } & DialogAdmission) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<any>({
    category_id: "",
    amount: "",
    tax_amount: "",
    expense_date: new Date().toISOString().slice(0, 10),
    payment_method: "cash",
    reference_number: "",
    description: "",
    notes: "",
  });
  const create = useMutation({
    onMutate: () => {
      if (!canLaunch()) throw new Error("Refresh expenses and categories before continuing.");
      return captureCurrent();
    },
    mutationFn: async () => {
      let receipt_url: string | null = null;
      if (file) {
        setUploading(true);
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id ?? "anon";
        const ext = file.name.split(".").pop() ?? "bin";
        const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("shop-receipts")
          .upload(path, file, { upsert: false });
        setUploading(false);
        if (upErr) throw upErr;
        receipt_url = path;
      }
      const payload: any = {
        ...form,
        amount: Number(form.amount) || 0,
        tax_amount: Number(form.tax_amount) || 0,
        category_id: form.category_id || null,
        receipt_url,
      };
      const { error } = await (smSupabase as any).from("expenses").insert(payload);
      if (error) throw error;
    },
    onSuccess: (_data, _input, isCurrent) => {
      if (!isCurrent?.()) return;
      toast.message("Expense request acknowledged. Refresh expenses to check.");
      setOpen(false);
      onCreated();
      setForm({
        ...form,
        amount: "",
        tax_amount: "",
        description: "",
        notes: "",
        reference_number: "",
      });
      setFile(null);
    },
    onError: (_error, _input, isCurrent) => {
      if (!isCurrent?.()) return;
      setUploading(false);
      toast.error("Could not confirm this expense request. Check expenses before trying again.");
    },
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next || canLaunch()) setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={!ready}>
          <Plus className="h-4 w-4 mr-2" /> New Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Expense</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select
                value={form.category_id}
                onValueChange={(v) => setForm({ ...form, category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                aria-label="Expense date"
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                aria-label="Expense amount"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Tax</Label>
              <Input
                type="number"
                aria-label="Expense tax"
                step="0.01"
                value={form.tax_amount}
                onChange={(e) => setForm({ ...form, tax_amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Payment</Label>
              <Select
                value={form.payment_method}
                onValueChange={(v) => setForm({ ...form, payment_method: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="gcash">GCash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference #</Label>
              <Input
                aria-label="Expense reference"
                value={form.reference_number}
                onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Input
              aria-label="Expense description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              aria-label="Expense notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>
          <div>
            <Label className="flex items-center gap-2">
              <Upload className="h-3.5 w-3.5" /> Receipt (optional)
            </Label>
            <Input
              type="file"
              aria-label="Expense receipt file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p className="text-xs text-muted-foreground mt-1">
                {file.name} · {(file.size / 1024).toFixed(0)} KB
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              if (canLaunch()) create.mutate();
            }}
            disabled={!ready || !form.amount || create.isPending || uploading}
          >
            {uploading ? "Uploading…" : create.isPending ? "Saving…" : "Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
