import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClipboardList, Check, X, Plus, Loader2, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import {
  createStockOrder,
  fetchDrugs,
  fetchStockOrders,
  recordStockImport,
  updateStockOrderStatus,
  type Drug,
  type StockOrder,
} from "@/lib/api/client";
import { AppShell } from "@/components/AppShell";
import { ProductPicker } from "@/components/ProductPicker";
import { digitsOnly, formatQuantity, parseQuantity, suggestRestockQuantity } from "@/lib/quantity";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useBranchReload } from "@/hooks/use-branch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCard, tableColHideMobile } from "@/components/ui/table";

export const Route = createFileRoute("/stock-orders")({
  component: StockOrdersPage,
});

function StockOrdersPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole("store_manager");
  const [orders, setOrders] = useState<StockOrder[]>([]);
  const [products, setProducts] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [orderQty, setOrderQty] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receiveOrder, setReceiveOrder] = useState<StockOrder | null>(null);
  const [importQty, setImportQty] = useState("");
  const [receiving, setReceiving] = useState(false);

  const loadProducts = async () => {
    const data = await fetchDrugs();
    setProducts(data);
  };

  const load = async () => {
    try {
      setOrders(await fetchStockOrders());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadProducts().catch((err) =>
      toast.error(err instanceof Error ? err.message : "Failed to load products"),
    );
  }, []);

  useBranchReload(() => {
    load();
    loadProducts().catch(() => {});
  });

  const onProductPick = (id: string) => {
    setProductId(id);
    const product = products.find((d) => d.id === id);
    if (product) setOrderQty(String(suggestRestockQuantity(product.quantity)));
  };

  const onProductAdded = (product: Drug) => {
    setProducts((prev) => {
      const next = [...prev, product];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
    setOrderQty(String(suggestRestockQuantity(product.quantity)));
  };

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) { toast.error("Pick a product"); return; }
    const qty = parseQuantity(orderQty);
    if (!orderQty.trim() || qty < 1) { toast.error("Quantity must be at least 1"); return; }
    setSubmitting(true);
    try {
      await createStockOrder({ product_id: productId, quantity_requested: qty, notes: orderNotes.trim() });
      toast.success(canManage ? "Order recorded" : "Order sent to manager for review");
      setDialogOpen(false);
      setProductId("");
      setOrderQty("");
      setOrderNotes("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const setStatus = async (order: StockOrder, status: "fulfilled" | "cancelled") => {
    const label = status === "fulfilled" ? "fulfill" : "cancel";
    if (!confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} order for "${order.drug_name}"?`)) return;
    setUpdatingId(order.id);
    try {
      await updateStockOrderStatus(order.id, status);
      toast.success(
        status === "fulfilled"
          ? "Order fulfilled — pharmacist can record import when stock arrives"
          : "Order cancelled",
      );
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const openReceive = (order: StockOrder) => {
    setReceiveOrder(order);
    setImportQty(String(order.quantity_requested));
  };

  const submitReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveOrder) return;
    const qty = parseQuantity(importQty);
    if (!importQty.trim() || qty < 1) { toast.error("Quantity must be at least 1"); return; }
    setReceiving(true);
    try {
      await recordStockImport(receiveOrder.id, qty);
      toast.success(`Imported ${formatQuantity(qty)} units of "${receiveOrder.drug_name}"`);
      setReceiveOrder(null);
      setImportQty("");
      load();
      loadProducts().catch(() => {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setReceiving(false);
    }
  };

  const pending = orders.filter((o) => o.status === "pending");
  const awaitingImport = orders.filter((o) => o.status === "fulfilled");
  const pageTitle = canManage ? "Stock orders" : "My orders";
  const showActions = canManage || awaitingImport.length > 0;

  const orderDialog = (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary">
          <Plus className="h-4 w-4" /> New order
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{canManage ? "New stock order" : "Request stock reorder"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submitOrder} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product name</Label>
            <ProductPicker
              products={products}
              value={productId}
              onValueChange={onProductPick}
              mode="order"
              canAddProduct={canManage}
              onProductAdded={onProductAdded}
              placeholder={products.length ? "Search product name…" : "No products yet"}
              emptyText="No matching product."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quantity to order</Label>
            <Input
              inputMode="numeric"
              placeholder="1"
              value={orderQty}
              onChange={(e) => setOrderQty(digitsOnly(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes (optional)</Label>
            <Input
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Urgent, supplier preference, etc."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting || !productId} className="bg-gradient-primary">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {canManage ? "Save order" : "Send to manager"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

  return (
    <AppShell title={pageTitle}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {canManage
            ? "Review reorder requests. After you fulfill an order, the pharmacist records the imported quantity."
            : "Request a reorder from your manager. After it is fulfilled, record the quantity imported when stock arrives."}
          {pending.length > 0 && (
            <span className="ml-1 font-medium text-warning">
              {pending.length} pending
            </span>
          )}
          {!canManage && awaitingImport.length > 0 && (
            <span className="ml-1 font-medium text-primary">
              {awaitingImport.length} ready to import
            </span>
          )}
        </p>
        <div className="flex gap-2">
          {orderDialog}
          <Button variant="outline" asChild>
            <Link to="/drugs">View products</Link>
          </Button>
        </div>
      </div>

      <TableCard className="mt-5">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right"><span className="md:hidden">Ord</span><span className="hidden md:inline">Ordered</span></TableHead>
              <TableHead className="text-right"><span className="md:hidden">Imp</span><span className="hidden md:inline">Imported</span></TableHead>
              <TableHead className={cn("text-right", tableColHideMobile)}>Stock at request</TableHead>
              {canManage && <TableHead className={tableColHideMobile}>Requested by</TableHead>}
              <TableHead className={tableColHideMobile}>Notes</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              {showActions && <TableHead className="text-right"><span className="md:hidden">Act</span><span className="hidden md:inline">Actions</span></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={showActions ? 9 : 7} className="py-12 text-center text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showActions ? 9 : 7} className="py-12 text-center text-muted-foreground">
                  <ClipboardList className="mx-auto h-8 w-8 opacity-40" />
                  <div className="mt-2 text-sm">
                    {canManage ? "No stock orders yet." : "You have not submitted any orders yet."}
                  </div>
                  <Button className="mt-4 bg-gradient-primary" onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4" /> New order
                  </Button>
                </TableCell>
              </TableRow>
            ) : orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell label="Product" className="font-medium">{o.drug_name}</TableCell>
                <TableCell label="Ordered" className="text-right tabular-nums">{formatQuantity(o.quantity_requested)}</TableCell>
                <TableCell label="Imported" className="text-right tabular-nums text-muted-foreground">
                  {o.quantity_imported != null ? formatQuantity(o.quantity_imported) : "—"}
                </TableCell>
                <TableCell label="Stock at request" className={cn("text-right tabular-nums text-muted-foreground", tableColHideMobile)}>{formatQuantity(o.stock_at_request)}</TableCell>
                {canManage && <TableCell label="Requested by" className={tableColHideMobile}>{o.requester_name || "—"}</TableCell>}
                <TableCell label="Notes" className={cn("text-muted-foreground", tableColHideMobile)}>{o.notes || "—"}</TableCell>
                <TableCell label="Status">
                  <StatusBadge status={o.status} />
                </TableCell>
                <TableCell label="Date" className="text-muted-foreground">
                  <span className="md:hidden">{new Date(o.created_at).toLocaleDateString(undefined, { month: "numeric", day: "numeric" })}</span>
                  <span className="hidden md:inline">{new Date(o.created_at).toLocaleDateString()}</span>
                </TableCell>
                {showActions && (
                  <TableCell label="Actions" className="text-right">
                    {canManage && o.status === "pending" ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-primary"
                          disabled={updatingId === o.id}
                          onClick={() => setStatus(o, "fulfilled")}
                          title="Fulfill order"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={updatingId === o.id}
                          onClick={() => setStatus(o, "cancelled")}
                          title="Cancel order"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : !canManage && o.status === "fulfilled" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary/10"
                        onClick={() => openReceive(o)}
                      >
                        <PackageCheck className="h-4 w-4" /> Record import
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>

      <Dialog open={!!receiveOrder} onOpenChange={(open) => !open && setReceiveOrder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record stock import</DialogTitle>
          </DialogHeader>
          {receiveOrder && (
            <form onSubmit={submitReceive} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{receiveOrder.drug_name}</span>
                {" — "}ordered:{" "}
                <span className="font-medium">{formatQuantity(receiveOrder.quantity_requested)}</span>
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quantity imported</Label>
                <Input
                  inputMode="numeric"
                  placeholder="1"
                  value={importQty}
                  onChange={(e) => setImportQty(digitsOnly(e.target.value))}
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setReceiveOrder(null)}>Cancel</Button>
                <Button type="submit" disabled={receiving} className="bg-gradient-primary">
                  {receiving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Add to branch stock
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function StatusBadge({ status }: { status: StockOrder["status"] }) {
  if (status === "pending") return <Badge variant="outline" className="border-warning text-warning">Pending</Badge>;
  if (status === "fulfilled") return <Badge variant="outline" className="border-primary text-primary">Awaiting import</Badge>;
  if (status === "received") return <Badge className="bg-primary/90">Received</Badge>;
  return <Badge variant="secondary">Cancelled</Badge>;
}
