import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search, Pencil, Trash2, Pill } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/drugs")({
  component: DrugsPage,
});

interface Drug {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  expiry_date: string | null;
  supplier: string | null;
}

const empty = { name: "", category: "General", price: 0, quantity: 0, expiry_date: "", supplier: "" };

function DrugsPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("admin") || hasRole("store_manager");
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Drug | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const fetchDrugs = async () => {
    const { data, error } = await supabase.from("drugs").select("*").order("name");
    if (error) { toast.error(error.message); return; }
    setDrugs(data as Drug[]);
  };

  useEffect(() => { fetchDrugs(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setDialogOpen(true); };
  const openEdit = (d: Drug) => {
    setEditing(d);
    setForm({
      name: d.name, category: d.category, price: Number(d.price), quantity: d.quantity,
      expiry_date: d.expiry_date ?? "", supplier: d.supplier ?? "",
    });
    setDialogOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Drug name is required"); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || "General",
      price: Number(form.price) || 0,
      quantity: Number(form.quantity) || 0,
      expiry_date: form.expiry_date || null,
      supplier: form.supplier.trim() || null,
    };
    const { error } = editing
      ? await supabase.from("drugs").update(payload).eq("id", editing.id)
      : await supabase.from("drugs").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Drug updated" : "Drug added");
    setDialogOpen(false);
    fetchDrugs();
  };

  const remove = async (d: Drug) => {
    if (!confirm(`Delete "${d.name}"?`)) return;
    const { error } = await supabase.from("drugs").delete().eq("id", d.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Drug deleted");
    fetchDrugs();
  };

  const filtered = drugs.filter((d) => {
    const q = search.toLowerCase();
    return !q || d.name.toLowerCase().includes(q) || d.category.toLowerCase().includes(q) || (d.supplier ?? "").toLowerCase().includes(q);
  });

  const isExpired = (date: string | null) => date && date < new Date().toISOString().slice(0, 10);

  return (
    <AppShell title="Drug Inventory">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, category, supplier…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="bg-gradient-primary"><Plus className="h-4 w-4" /> Add drug</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit drug" : "Add a new drug"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={save} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
                  <Field label="Category"><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></Field>
                  <Field label="Price"><Input type="number" min={0} step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></Field>
                  <Field label="Quantity"><Input type="number" min={0} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></Field>
                  <Field label="Expiry date"><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></Field>
                  <Field label="Supplier"><Input value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} /></Field>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={saving} className="bg-gradient-primary">{saving ? "Saving…" : (editing ? "Save changes" : "Add drug")}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Drug</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Supplier</TableHead>
              {canEdit && <TableHead className="w-24 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 7 : 6} className="py-12 text-center text-muted-foreground">
                  <Pill className="mx-auto h-8 w-8 opacity-40" />
                  <div className="mt-2 text-sm">{drugs.length === 0 ? "No drugs yet. Add your first drug to get started." : "No drugs match your search."}</div>
                </TableCell>
              </TableRow>
            ) : filtered.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell><Badge variant="secondary">{d.category}</Badge></TableCell>
                <TableCell className="text-right tabular-nums">${Number(d.price).toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <span className={`tabular-nums font-medium ${d.quantity === 0 ? "text-destructive" : d.quantity <= 10 ? "text-warning" : ""}`}>
                    {d.quantity}
                  </span>
                </TableCell>
                <TableCell>
                  {d.expiry_date ? (
                    <span className={isExpired(d.expiry_date) ? "text-destructive font-medium" : ""}>{d.expiry_date}</span>
                  ) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">{d.supplier || "—"}</TableCell>
                {canEdit && (
                  <TableCell className="text-right">
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
      </div>
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
