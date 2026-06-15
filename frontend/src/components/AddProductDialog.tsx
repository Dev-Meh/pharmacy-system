import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createDrug, type Drug } from "@/lib/api/client";
import { parseTzsAmount } from "@/lib/currency";
import { digitsOnly } from "@/lib/quantity";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (product: Drug) => void;
}

export function AddProductDialog({ open, onOpenChange, onCreated }: AddProductDialogProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("General");
  const [price, setPrice] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setCategory("General");
    setPrice("");
    setExpiryDate("");
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }
    setSaving(true);
    try {
      const product = await createDrug({
        name: name.trim(),
        category: category.trim() || "General",
        price: parseTzsAmount(price),
        expiry_date: expiryDate || null,
        supplier: null,
      });
      toast.success(`"${product.name}" added to catalog`);
      onCreated(product);
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add product to catalog</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <Field label="Product name *">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Paracetamol 500mg"
              required
              autoFocus
            />
          </Field>
          <Field label="Category">
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </Field>
          <Field label="Price (TZS)">
            <Input
              inputMode="numeric"
              placeholder="0"
              value={price}
              onChange={(e) => setPrice(digitsOnly(e.target.value))}
            />
          </Field>
          <Field label="Expiry date">
            <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
          </Field>
          <p className="text-xs text-muted-foreground">
            This product is available at all branches. Pharmacists record imported quantity per branch.
          </p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-gradient-primary">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save product
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
