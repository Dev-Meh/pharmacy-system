import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search, Pencil, Trash2, Pill, AlertTriangle, PackagePlus, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import {
  createDirectStockImport,
  createDrug,
  createStockOrder,
  deleteDrug,
  fetchDrugs,
  updateDrug,
  type Drug,
} from "@/lib/api/client";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { digitsOnly, formatQuantity, parseQuantity, suggestRestockQuantity } from "@/lib/quantity";
import { formatTzs, parseTzsAmount } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useBranch, useBranchReload } from "@/hooks/use-branch";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { ProductPicker } from "@/components/ProductPicker";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/drugs")({
  component: DrugsPage,
});

const empty = { name: "", category: "General", price: "", expiry_date: "", supplier: "" };

function DrugsPage() {
  const { hasRole } = useAuth();
  const { activeBranch } = useBranch();
  const canEdit = hasRole("store_manager");
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Drug | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [orderDrug, setOrderDrug] = useState<Drug | null>(null);
  const [orderQty, setOrderQty] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [ordering, setOrdering] = useState(false);
  const [importDrug, setImportDrug] = useState<Drug | null>(null);
  const [importQty, setImportQty] = useState("");
  const [importNotes, setImportNotes] = useState("");
  const [importing, setImporting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importProductId, setImportProductId] = useState("");

  const lowStockCount = drugs.filter((d) => d.quantity <= LOW_STOCK_THRESHOLD).length;

  const fetchDrugsList = async () => {
    try {
      setDrugs(await fetchDrugs());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load drugs");
    }
  };

  useEffect(() => { fetchDrugsList(); }, []);
  useBranchReload(fetchDrugsList);

  const openCreate = () => { setEditing(null); setForm(empty); setDialogOpen(true); };
  const openEdit = (d: Drug) => {
    setEditing(d);
    setForm({
      name: d.name,
      category: d.category,
      price: String(parseTzsAmount(d.price)),
      expiry_date: d.expiry_date ?? "",
      supplier: d.supplier ?? "",
    });
    setDialogOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Product name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim() || "General",
        price: parseTzsAmount(form.price),
        expiry_date: form.expiry_date || null,
        supplier: form.supplier.trim() || null,
      };
      if (editing) await updateDrug(editing.id, payload);
      else await createDrug(payload);
      toast.success(editing ? "Product updated" : "Product added");
      setDialogOpen(false);
      fetchDrugsList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (d: Drug) => {
    if (!confirm(`Delete "${d.name}"?`)) return;
    try {
      await deleteDrug(d.id);
      toast.success("Drug deleted");
      fetchDrugsList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const openOrder = (d: Drug) => {
    setOrderDrug(d);
    setOrderQty(String(suggestRestockQuantity(d.quantity)));
    setOrderNotes("");
  };

  const openImport = (d?: Drug) => {
    if (d) {
      setImportDrug(d);
      setImportProductId(d.id);
      setImportQty("");
    } else {
      setImportDrug(null);
      setImportProductId("");
      setImportQty("");
    }
    setImportNotes("");
    setImportDialogOpen(true);
  };

  const submitImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const productId = importDrug?.id ?? importProductId;
    if (!productId) {
      toast.error("Pick a product");
      return;
    }
    const qty = parseQuantity(importQty);
    if (!importQty.trim() || qty < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }
    setImporting(true);
    try {
      await createDirectStockImport({
        product_id: productId,
        quantity: qty,
        notes: importNotes.trim(),
      });
      const name = importDrug?.name ?? drugs.find((d) => d.id === productId)?.name ?? "Product";
      toast.success(`Added ${formatQuantity(qty)} units of "${name}" to branch stock`);
      setImportDialogOpen(false);
      setImportDrug(null);
      setImportProductId("");
      setImportQty("");
      setImportNotes("");
      fetchDrugsList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderDrug) return;
    const qty = parseQuantity(orderQty);
    if (!orderQty.trim() || qty < 1) { toast.error("Quantity must be at least 1"); return; }
    setOrdering(true);
    try {
      await createStockOrder({
        product_id: orderDrug.id,
        quantity_requested: qty,
        notes: orderNotes.trim(),
      });
      toast.success(`Restock request sent for "${orderDrug.name}"`);
      setOrderDrug(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Request failed");
    } finally {
      setOrdering(false);
    }
  };

  const isLowStock = (qty: number) => qty <= LOW_STOCK_THRESHOLD;

  const filtered = drugs.filter((d) => {
    const q = search.toLowerCase();
    return !q || d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q) || (d.supplier ?? "").toLowerCase().includes(q);
  });

  const isExpired = (date: string | null) => date && date < new Date().toISOString().slice(0, 10);

  return (
    <AppShell title={activeBranch ? `Products — ${activeBranch.name}` : "Products"}>
      {lowStockCount > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {lowStockCount} product{lowStockCount === 1 ? "" : "s"} running low
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Stock at or below {LOW_STOCK_THRESHOLD} units. Add stock directly or request a reorder from your manager.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, category, supplier…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openImport()}>
            <PackageCheck className="h-4 w-4" /> Add stock
          </Button>
          {canEdit && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="bg-gradient-primary"><Plus className="h-4 w-4" /> Add product</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit product" : "Add a new product"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={save} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Product name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
                  <Field label="Category"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
                  <Field label="Price (TZS)">
                    <Input
                      inputMode="numeric"
                      placeholder="0"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: digitsOnly(e.target.value) })}
                    />
                  </Field>
                  <Field label="Expiry date"><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></Field>
                  <Field label="Supplier"><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></Field>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving} className="bg-gradient-primary">{saving ? "Saving…" : (editing ? "Save changes" : "Add product")}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      <Dialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          setImportDialogOpen(open);
          if (!open) {
            setImportDrug(null);
            setImportProductId("");
            setImportQty("");
            setImportNotes("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add stock to branch</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitImport} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Record inventory received without a reorder request. Stock updates immediately for this branch.
            </p>
            {!importDrug && (
              <Field label="Product">
                <ProductPicker
                  products={drugs}
                  value={importProductId}
                  onValueChange={setImportProductId}
                  mode="order"
                  canAddProduct={canEdit}
                  onProductAdded={(p) => {
                    fetchDrugsList();
                    setImportProductId(p.id);
                  }}
                  placeholder="Search product name…"
                  emptyText="No matching product."
                />
              </Field>
            )}
            {importDrug && (
              <p className="text-sm">
                <span className="font-medium">{importDrug.name}</span>
                {" — "}current stock:{" "}
                <span className="font-medium">{formatQuantity(importDrug.quantity)}</span>
              </p>
            )}
            <Field label="Quantity imported">
              <Input
                inputMode="numeric"
                placeholder="1"
                value={importQty}
                onChange={(e) => setImportQty(digitsOnly(e.target.value))}
                required
              />
            </Field>
            <Field label="Notes (optional)">
              <Input
                value={importNotes}
                onChange={(e) => setImportNotes(e.target.value)}
                placeholder="Supplier delivery, emergency restock, etc."
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={importing} className="bg-gradient-primary">
                {importing ? "Adding…" : "Add to stock"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!orderDrug} onOpenChange={(open) => !open && setOrderDrug(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request stock order</DialogTitle>
          </DialogHeader>
          {orderDrug && (
            <form onSubmit={submitOrder} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{orderDrug.name}</span>
                {" — "}current stock:{" "}
                <span className="font-medium text-warning">{formatQuantity(orderDrug.quantity)}</span>
              </p>
              <Field label="Quantity to order">
                <Input
                  inputMode="numeric"
                  placeholder="1"
                  value={orderQty}
                  onChange={(e) => setOrderQty(digitsOnly(e.target.value))}
                  required
                />
              </Field>
              <Field label="Notes (optional)">
                <Input
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Urgent, supplier preference, etc."
                />
              </Field>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setOrderDrug(null)}>Cancel</Button>
                <Button type="submit" disabled={ordering} className="bg-gradient-primary">
                  {ordering ? "Sending…" : "Send request"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <TableCard className="mt-5">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className={tableColHideMobile}>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right"><span className="md:hidden">Qty</span><span className="hidden md:inline">Branch stock</span></TableHead>
              <TableHead><span className="md:hidden">Exp</span><span className="hidden md:inline">Expiry</span></TableHead>
              <TableHead className={tableColHideMobile}>Supplier</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              {canEdit && <TableHead className="text-right"><span className="md:hidden">Act</span><span className="hidden md:inline">Actions</span></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 8 : 7} className="py-12 text-center text-muted-foreground">
                  <Pill className="mx-auto h-8 w-8 opacity-40" />
                  <div className="mt-2 text-sm">{drugs.length === 0 ? "No products yet. Ask your manager to add products." : "No products match your search."}</div>
                </TableCell>
              </TableRow>
            ) : filtered.map((d) => (
              <TableRow key={d.id}>
                <TableCell label="Product" className="max-w-[5rem] font-medium md:max-w-none">{d.name}</TableCell>
                <TableCell label="Category" className={tableColHideMobile}><Badge variant="secondary">{d.category}</Badge></TableCell>
                <TableCell label="Price" className="text-right tabular-nums">{formatTzs(d.price)}</TableCell>
                <TableCell label="Branch stock" className="text-right">
                  <span className={`tabular-nums font-medium ${d.quantity === 0 ? "text-destructive" : isLowStock(d.quantity) ? "text-warning" : ""}`}>
                    {formatQuantity(d.quantity)}
                  </span>
                </TableCell>
                <TableCell label="Expiry">
                  {d.expiry_date ? (
                    <span className={isExpired(d.expiry_date) ? "text-destructive font-medium" : ""}>{d.expiry_date}</span>
                  ) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell label="Supplier" className={cn(tableColHideMobile, "text-muted-foreground")}>{d.supplier || "—"}</TableCell>
                <TableCell label="Stock" className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-primary text-primary hover:bg-primary/10"
                      onClick={() => openImport(d)}
                      title="Add stock directly"
                    >
                      <PackageCheck className="h-4 w-4" />
                      <span className="hidden sm:inline">Add</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className={isLowStock(d.quantity) ? "border-warning text-warning hover:bg-warning/10" : ""}
                      onClick={() => openOrder(d)}
                      title="Request reorder from manager"
                    >
                      <PackagePlus className="h-4 w-4" />
                      <span className="hidden sm:inline">Order</span>
                    </Button>
                  </div>
                </TableCell>
                {canEdit && (
                  <TableCell label="Actions" className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(d)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableCard>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
