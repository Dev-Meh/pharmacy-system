import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ShoppingCart, Plus, Loader2, Trash2, Printer } from "lucide-react";
import { toast } from "sonner";
import {
  createSaleBatch,
  fetchDrugsInStock,
  fetchSales,
  fetchSalesReport,
  type Drug,
  type Sale,
  type SalesReport,
  type SalesReportPeriod,
} from "@/lib/api/client";
import { formatTzs } from "@/lib/currency";
import { digitsOnly, formatQuantity, parseQuantity } from "@/lib/quantity";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";
import { ProductPicker } from "@/components/ProductPicker";
import { useAuth } from "@/hooks/use-auth";
import { useBranch, useBranchReload } from "@/hooks/use-branch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCard, tableColHideMobile } from "@/components/ui/table";

export const Route = createFileRoute("/sales")({
  component: SalesPage,
});

const REPORT_PERIODS: { id: SalesReportPeriod; label: string; hint: string }[] = [
  { id: "daily", label: "Daily", hint: "Sales on the selected date" },
  { id: "weekly", label: "Weekly", hint: "Week containing the selected date (Mon–Sun)" },
  { id: "monthly", label: "Monthly", hint: "Month of the selected date" },
  { id: "annual", label: "Annual", hint: "Year of the selected date" },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type DrugLite = { id: string; name: string; price: number; quantity: number };

type CartLine = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  maxStock: number;
};

type SaleGroup = {
  key: string;
  soldAt: string;
  lines: Sale[];
  total: number;
};

function groupSales(sales: Sale[]): SaleGroup[] {
  const groups = new Map<string, SaleGroup>();
  for (const sale of sales) {
    const key = sale.batch_id ?? sale.id;
    const existing = groups.get(key);
    if (existing) {
      existing.lines.push(sale);
      existing.total += Math.round(Number(sale.total));
    } else {
      groups.set(key, {
        key,
        soldAt: sale.sold_at,
        lines: [sale],
        total: Math.round(Number(sale.total)),
      });
    }
  }
  return Array.from(groups.values());
}

function groupReportSales(report: SalesReport): SaleGroup[] {
  return groupSales(
    report.sales.map((s) => ({
      id: s.id,
      batch_id: s.batch_id,
      drug_id: s.id,
      drug_name: s.drug_name,
      quantity: s.quantity,
      unit_price: s.unit_price,
      total: s.total,
      sold_by: 0,
      sold_at: s.sold_at,
    })),
  );
}

function SalesPage() {
  const { user, hasRole } = useAuth();
  const { activeBranch } = useBranch();
  const canManage = hasRole("store_manager");
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<DrugLite[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<SalesReportPeriod>("daily");
  const [reportDate, setReportDate] = useState(todayIso);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [reportLoading, setReportLoading] = useState(true);

  const activePeriod = REPORT_PERIODS.find((p) => p.id === reportPeriod);

  const selectedProduct = products.find((d) => d.id === productId);
  const cartTotal = cart.reduce((sum, line) => sum + Math.round(line.price * line.quantity), 0);
  const saleGroups = useMemo(() => groupSales(sales), [sales]);
  const reportGroups = useMemo(() => (report ? groupReportSales(report) : []), [report]);

  const cartQtyForProduct = (id: string) =>
    cart.filter((line) => line.productId === id).reduce((sum, line) => sum + line.quantity, 0);

  const loadProducts = async () => {
    const data = await fetchDrugsInStock();
    setProducts(data);
  };

  const loadReport = useCallback(async (period: SalesReportPeriod, date: string) => {
    if (!date) return;
    setReportLoading(true);
    try {
      setReport(await fetchSalesReport(period, date));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load report");
      setReport(null);
    } finally {
      setReportLoading(false);
    }
  }, []);

  const fetchAll = async () => {
    try {
      const [s] = await Promise.all([fetchSales(), loadProducts()]);
      setSales(s);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load sales");
    }
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { loadReport(reportPeriod, reportDate); }, [reportPeriod, reportDate, loadReport]);

  useBranchReload(() => {
    fetchSales().then(setSales).catch(() => {});
    loadProducts().catch(() => {});
    loadReport(reportPeriod, reportDate).catch(() => {});
  });

  const resetDialog = () => {
    setProductId("");
    setQty("");
    setCart([]);
  };

  const onProductAdded = (product: Drug) => {
    if (product.quantity > 0) {
      setProducts((prev) => {
        const next = [...prev, {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: product.quantity,
        }];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
    } else {
      loadProducts();
    }
  };

  const addToCart = () => {
    if (!selectedProduct) {
      toast.error("Pick a product");
      return;
    }
    if (!qty.trim()) {
      toast.error("Enter a quantity");
      return;
    }
    const saleQty = parseQuantity(qty);
    if (saleQty < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    const alreadyInCart = cartQtyForProduct(selectedProduct.id);
    const available = selectedProduct.quantity - alreadyInCart;
    if (saleQty > available) {
      toast.error(`Only ${formatQuantity(available)} available (${formatQuantity(alreadyInCart)} already in cart)`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((line) => line.productId === selectedProduct.id);
      if (existing) {
        return prev.map((line) =>
          line.productId === selectedProduct.id
            ? { ...line, quantity: line.quantity + saleQty }
            : line,
        );
      }
      return [
        ...prev,
        {
          productId: selectedProduct.id,
          name: selectedProduct.name,
          price: selectedProduct.price,
          quantity: saleQty,
          maxStock: selectedProduct.quantity,
        },
      ];
    });
    setProductId("");
    setQty("");
  };

  const updateCartQty = (productId: string, value: string) => {
    const nextQty = parseQuantity(value);
    setCart((prev) =>
      prev
        .map((line) => {
          if (line.productId !== productId) return line;
          const capped = Math.min(nextQty, line.maxStock);
          return { ...line, quantity: capped };
        })
        .filter((line) => line.quantity > 0),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((line) => line.productId !== productId));
  };

  const recordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (cart.length === 0) {
      toast.error("Add at least one product to the cart");
      return;
    }
    setSaving(true);
    try {
      await createSaleBatch(
        cart.map((line) => ({ product_id: line.productId, quantity: line.quantity })),
      );
      toast.success(`Sale recorded — ${cart.length} product${cart.length === 1 ? "" : "s"}`);
      setDialogOpen(false);
      resetDialog();
      const [s] = await Promise.all([fetchSales(), loadReport(reportPeriod, reportDate)]);
      setSales(s);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sale failed");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => window.print();

  const branchLabel = report?.branch_name || activeBranch?.name || "";

  return (
    <AppShell title="Sales">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #sales-report-print, #sales-report-print * { visibility: visible; }
          #sales-report-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 24px;
            color: #000;
            background: #fff;
          }
        }
      `}</style>

      <div id="sales-report-print" className="hidden print:block">
        {report && (
          <div className="space-y-6 text-sm text-black">
            <div className="border-b border-black pb-4">
              <h1 className="text-2xl font-bold">MehMediCore Pharmacy</h1>
              <h2 className="mt-1 text-lg font-semibold">{report.title}</h2>
              <p className="mt-2">{branchLabel} · {report.range_label}</p>
              <p className="text-sm">Report date: {report.report_date}</p>
              <p className="text-xs text-gray-600">
                Printed {new Date().toLocaleString()}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs uppercase text-gray-600">Total revenue</div>
                <div className="text-xl font-bold">{formatTzs(report.total_revenue)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-600">Items sold</div>
                <div className="text-xl font-bold">{formatQuantity(report.total_items)}</div>
              </div>
              <div>
                <div className="text-xs uppercase text-gray-600">Transactions</div>
                <div className="text-xl font-bold">{formatQuantity(report.transaction_count)}</div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">By product</h3>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black">
                    <th className="py-2 text-left">Product</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {report.by_product.length === 0 ? (
                    <tr><td colSpan={3} className="py-4 text-center text-gray-600">No sales in this period.</td></tr>
                  ) : report.by_product.map((row) => (
                    <tr key={row.drug_name} className="border-b border-gray-300">
                      <td className="py-2">{row.drug_name}</td>
                      <td className="py-2 text-right">{formatQuantity(row.quantity)}</td>
                      <td className="py-2 text-right">{formatTzs(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="mb-2 font-semibold">Transactions</h3>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-black">
                    <th className="py-2 text-left">Date</th>
                    <th className="py-2 text-left">Products</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {reportGroups.length === 0 ? (
                    <tr><td colSpan={3} className="py-4 text-center text-gray-600">No transactions.</td></tr>
                  ) : reportGroups.map((group) => (
                    <tr key={group.key} className="border-b border-gray-300">
                      <td className="py-2">{new Date(group.soldAt).toLocaleString()}</td>
                      <td className="py-2">
                        {group.lines.map((line) => `${line.drug_name} × ${formatQuantity(line.quantity)}`).join(", ")}
                      </td>
                      <td className="py-2 text-right">{formatTzs(group.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="print:hidden">
        <section className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Sales reports</h2>
              <p className="text-sm text-muted-foreground">
                Pick a date, choose a period, then print.
              </p>
            </div>
            <Button variant="outline" onClick={handlePrint} disabled={!report || reportLoading || !reportDate}>
              <Printer className="h-4 w-4" /> Print report
            </Button>
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Report date</Label>
              <Input
                type="date"
                value={reportDate}
                max={todayIso()}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full sm:w-[200px]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {REPORT_PERIODS.map((p) => (
                <Button
                  key={p.id}
                  size="sm"
                  variant={reportPeriod === p.id ? "default" : "outline"}
                  className={reportPeriod === p.id ? "bg-gradient-primary" : ""}
                  onClick={() => setReportPeriod(p.id)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
          {activePeriod && (
            <p className="mt-2 text-xs text-muted-foreground">{activePeriod.hint}</p>
          )}

          {reportLoading ? (
            <div className="mt-6 py-8 text-center text-sm text-muted-foreground">Loading report…</div>
          ) : report ? (
            <div className="mt-6 space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <div className="text-sm font-medium">{report.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {branchLabel} · {report.range_label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Based on date: {report.report_date}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-muted/50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Revenue</div>
                  <div className="mt-1 font-display text-2xl font-bold tabular-nums">{formatTzs(report.total_revenue)}</div>
                </div>
                <div className="rounded-xl bg-muted/50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Items sold</div>
                  <div className="mt-1 font-display text-2xl font-bold tabular-nums">{formatQuantity(report.total_items)}</div>
                </div>
                <div className="rounded-xl bg-muted/50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transactions</div>
                  <div className="mt-1 font-display text-2xl font-bold tabular-nums">{formatQuantity(report.transaction_count)}</div>
                </div>
              </div>

              <TableCard>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right"><span className="md:hidden">Qty</span><span className="hidden md:inline">Qty sold</span></TableHead>
                      <TableHead className="text-right"><span className="md:hidden">Rev</span><span className="hidden md:inline">Revenue</span></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.by_product.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                          No sales in this period.
                        </TableCell>
                      </TableRow>
                    ) : report.by_product.map((row) => (
                      <TableRow key={row.drug_name}>
                        <TableCell label="Product" className="font-medium">{row.drug_name}</TableCell>
                        <TableCell label="Qty sold" className="text-right tabular-nums">{formatQuantity(row.quantity)}</TableCell>
                        <TableCell label="Revenue" className="text-right font-semibold tabular-nums">{formatTzs(row.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableCard>
            </div>
          ) : null}
        </section>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Add multiple products to a cart and complete one sale.
          </p>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetDialog();
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary"><Plus className="h-4 w-4" /> New sale</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Record a sale</DialogTitle></DialogHeader>
              <form onSubmit={recordSale} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product name</Label>
                  <ProductPicker
                    products={products}
                    value={productId}
                    onValueChange={setProductId}
                    mode="sale"
                    canAddProduct={canManage}
                    onProductAdded={onProductAdded}
                    placeholder={products.length ? "Search product name…" : "No products in stock"}
                    emptyText="No matching product in stock."
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quantity</Label>
                    <Input
                      inputMode="numeric"
                      placeholder="1"
                      value={qty}
                      onChange={(e) => setQty(digitsOnly(e.target.value))}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" variant="outline" onClick={addToCart} disabled={!productId}>
                      Add to cart
                    </Button>
                  </div>
                </div>

                {cart.length > 0 && (
                  <div className="overflow-hidden rounded-xl border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">Line total</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cart.map((line) => (
                          <TableRow key={line.productId}>
                            <TableCell label="Product" className="font-medium">{line.name}</TableCell>
                            <TableCell label="Qty" className="text-right">
                              <Input
                                inputMode="numeric"
                                className="ml-auto h-8 w-16 text-right tabular-nums"
                                value={String(line.quantity)}
                                onChange={(e) => updateCartQty(line.productId, digitsOnly(e.target.value))}
                              />
                            </TableCell>
                            <TableCell label="Line total" className="text-right tabular-nums">
                              {formatTzs(Math.round(line.price * line.quantity))}
                            </TableCell>
                            <TableCell label="">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeFromCart(line.productId)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="rounded-lg bg-muted/60 p-3 text-sm">
                  {cart.length} item{cart.length === 1 ? "" : "s"} · Total:{" "}
                  <span className="font-display text-xl font-bold tabular-nums">{formatTzs(cartTotal)}</span>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving || cart.length === 0} className="bg-gradient-primary">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Complete sale
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <TableCard className="mt-5">
          <div className="border-b border-border px-5 py-3">
            <h2 className="font-display text-base font-semibold">Recent sales</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Products</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className={tableColHideMobile}>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {saleGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                    <ShoppingCart className="mx-auto h-8 w-8 opacity-40" />
                    <div className="mt-2 text-sm">No sales yet.</div>
                  </TableCell>
                </TableRow>
              ) : saleGroups.map((group) => (
                <TableRow key={group.key}>
                  <TableCell label="Products">
                    <div className="font-medium">
                      {group.lines.map((line) => line.drug_name).join(", ")}
                    </div>
                    {group.lines.length > 1 && (
                      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                        {group.lines.map((line) => (
                          <div key={line.id}>
                            {line.drug_name} × {formatQuantity(line.quantity)} @ {formatTzs(line.unit_price)}
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell label="Items" className="text-right tabular-nums">
                    {formatQuantity(group.lines.reduce((sum, line) => sum + line.quantity, 0))}
                  </TableCell>
                  <TableCell label="Total" className="text-right font-semibold tabular-nums">{formatTzs(group.total)}</TableCell>
                  <TableCell label="When" className={cn(tableColHideMobile, "text-muted-foreground")}>{new Date(group.soldAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>
      </div>
    </AppShell>
  );
}
