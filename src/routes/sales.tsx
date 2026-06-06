import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShoppingCart, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/sales")({
  component: SalesPage,
});

interface Sale {
  id: string;
  drug_id: string;
  drug_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  sold_by: string;
  sold_at: string;
}

interface DrugLite { id: string; name: string; price: number; quantity: number; }

function SalesPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [drugs, setDrugs] = useState<DrugLite[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drugId, setDrugId] = useState("");
  const [qty, setQty] = useState(1);
  const [saving, setSaving] = useState(false);

  const selectedDrug = drugs.find((d) => d.id === drugId);
  const projectedTotal = selectedDrug ? Number(selectedDrug.price) * Number(qty || 0) : 0;

  const fetchAll = async () => {
    const [s, d] = await Promise.all([
      supabase.from("sales").select("*").order("sold_at", { ascending: false }).limit(200),
      supabase.from("drugs").select("id, name, price, quantity").gt("quantity", 0).order("name"),
    ]);
    if (s.error) toast.error(s.error.message); else setSales(s.data as Sale[]);
    if (d.error) toast.error(d.error.message); else setDrugs(d.data as DrugLite[]);
  };

  useEffect(() => { fetchAll(); }, []);

  const recordSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!drugId) { toast.error("Pick a drug"); return; }
    if (qty < 1) { toast.error("Quantity must be at least 1"); return; }
    if (selectedDrug && qty > selectedDrug.quantity) { toast.error(`Only ${selectedDrug.quantity} in stock`); return; }
    setSaving(true);
    // unit_price / total / drug_name are overwritten by DB trigger, but columns are NOT NULL.
    const { error } = await supabase.from("sales").insert({
      drug_id: drugId,
      quantity: qty,
      sold_by: user.id,
      drug_name: selectedDrug?.name ?? "",
      unit_price: selectedDrug?.price ?? 0,
      total: projectedTotal,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Sale recorded");
    setDialogOpen(false);
    setDrugId(""); setQty(1);
    fetchAll();
  };

  return (
    <AppShell title="Sales">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Record sales and view recent transactions.</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary"><Plus className="h-4 w-4" /> New sale</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record a sale</DialogTitle></DialogHeader>
            <form onSubmit={recordSale} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Drug</Label>
                <Select value={drugId} onValueChange={setDrugId}>
                  <SelectTrigger><SelectValue placeholder={drugs.length ? "Choose a drug" : "No drugs in stock"} /></SelectTrigger>
                  <SelectContent>
                    {drugs.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} — ${Number(d.price).toFixed(2)} ({d.quantity} in stock)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quantity</Label>
                <Input type="number" min={1} max={selectedDrug?.quantity ?? undefined} value={qty} onChange={(e) => setQty(Number(e.target.value))} />
              </div>
              <div className="rounded-lg bg-muted/60 p-3 text-sm">
                Total: <span className="font-display text-xl font-bold tabular-nums">${projectedTotal.toFixed(2)}</span>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving || !drugId} className="bg-gradient-primary">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Record sale
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Drug</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  <ShoppingCart className="mx-auto h-8 w-8 opacity-40" />
                  <div className="mt-2 text-sm">No sales yet.</div>
                </TableCell>
              </TableRow>
            ) : sales.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.drug_name}</TableCell>
                <TableCell className="text-right tabular-nums">{s.quantity}</TableCell>
                <TableCell className="text-right tabular-nums">${Number(s.unit_price).toFixed(2)}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums">${Number(s.total).toFixed(2)}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(s.sold_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </AppShell>
  );
}
