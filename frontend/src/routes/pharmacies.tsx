import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  Loader2,
  Upload,
  CheckCircle,
  Ban,
  ChevronDown,
  MapPin,
  Users,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { fetchPharmacies, registerPharmacy, resetPharmacyManagerPassword, updatePharmacyAccess, type PharmacyRecord } from "@/lib/api/client";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCard } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pharmacies")({
  component: PharmaciesPage,
});

const emptyForm = {
  pharmacy_name: "",
  address: "",
  phone: "",
  manager_email: "",
  manager_password: "",
  manager_full_name: "",
  manager_username: "",
};

function PharmaciesPage() {
  const { user, isPlatformAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<PharmacyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [accessDialog, setAccessDialog] = useState<PharmacyRecord | null>(null);
  const [passwordDialog, setPasswordDialog] = useState<PharmacyRecord | null>(null);
  const [newManagerPassword, setNewManagerPassword] = useState("");
  const [confirmManagerPassword, setConfirmManagerPassword] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await fetchPharmacies());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load pharmacies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user && isPlatformAdmin) load();
  }, [authLoading, user, isPlatformAdmin]);

  const onLogoChange = (file: File | null) => {
    setLogoFile(file);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await registerPharmacy({ ...form, logo: logoFile });
      toast.success(
        `Pharmacy registered. Manager sign-in: ${created.manager.email} or ${created.manager.username}. Grant access after payment.`,
        { duration: 8000 },
      );
      setDialogOpen(false);
      setForm(emptyForm);
      onLogoChange(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSaving(false);
    }
  };

  const grantAccess = async (pharmacy: PharmacyRecord) => {
    setUpdatingId(pharmacy.id);
    try {
      await updatePharmacyAccess(pharmacy.id, {
        access_status: "active",
        payment_notes: paymentNotes.trim(),
      });
      toast.success(`${pharmacy.name} can now sign in and use the system.`);
      setAccessDialog(null);
      setPaymentNotes("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not grant access");
    } finally {
      setUpdatingId(null);
    }
  };

  const resetManagerPassword = async () => {
    if (!passwordDialog) return;
    if (newManagerPassword !== confirmManagerPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setUpdatingId(passwordDialog.id);
    try {
      await resetPharmacyManagerPassword(passwordDialog.id, newManagerPassword);
      toast.success(
        `Password set for ${passwordDialog.name}. Manager sign-in: ${passwordDialog.manager.email} or ${passwordDialog.manager.username} with the password you just entered.`,
        { duration: 10000 },
      );
      setPasswordDialog(null);
      setNewManagerPassword("");
      setConfirmManagerPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setUpdatingId(null);
    }
  };

  const suspendAccess = async (pharmacy: PharmacyRecord) => {
    setUpdatingId(pharmacy.id);
    try {
      await updatePharmacyAccess(pharmacy.id, { access_status: "suspended" });
      toast.success(`${pharmacy.name} access suspended.`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const reactivateAccess = async (pharmacy: PharmacyRecord) => {
    setUpdatingId(pharmacy.id);
    try {
      await updatePharmacyAccess(pharmacy.id, {
        access_status: "active",
        payment_notes: pharmacy.payment_notes,
      });
      toast.success(`${pharmacy.name} access restored.`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  const accessBadge = (status: PharmacyRecord["access_status"]) => {
    if (status === "active") return <Badge>Active</Badge>;
    if (status === "pending") return <Badge variant="secondary">Awaiting payment</Badge>;
    return <Badge variant="destructive">Suspended</Badge>;
  };

  if (!isPlatformAdmin) {
    return (
      <AppShell title="Pharmacies">
        <p className="text-sm text-muted-foreground">Only platform administrators can manage pharmacies.</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Pharmacies">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Registered pharmacies</h2>
          <p className="text-sm text-muted-foreground">
            Register a pharmacy with its logo and manager account. Click a pharmacy to view its branches.
            Managers cannot sign in until you grant access after payment.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary"><Plus className="h-4 w-4" /> Register pharmacy</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Register pharmacy & manager</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <Field label="Pharmacy name">
                <Input
                  required
                  placeholder="MehMediCore Pharmacy"
                  value={form.pharmacy_name}
                  onChange={(e) => setForm({ ...form, pharmacy_name: e.target.value })}
                />
              </Field>
              <Field label="Logo (optional)">
                <div className="flex items-center gap-3">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo preview" className="h-14 w-14 rounded-lg border object-contain" />
                  ) : (
                    <div className="grid h-14 w-14 place-items-center rounded-lg border bg-muted">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(e) => onLogoChange(e.target.files?.[0] ?? null)}
                  />
                </div>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Address">
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </Field>
                <Field label="Phone">
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </Field>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Manager account</p>
                <div className="space-y-3">
                  <Field label="Full name">
                    <Input required value={form.manager_full_name} onChange={(e) => setForm({ ...form, manager_full_name: e.target.value })} />
                  </Field>
                  <Field label="Username">
                    <Input required value={form.manager_username} onChange={(e) => setForm({ ...form, manager_username: e.target.value })} />
                  </Field>
                  <Field label="Email">
                    <Input required type="email" value={form.manager_email} onChange={(e) => setForm({ ...form, manager_email: e.target.value })} />
                  </Field>
                  <Field label="Password">
                    <Input required type="password" minLength={6} value={form.manager_password} onChange={(e) => setForm({ ...form, manager_password: e.target.value })} />
                    <p className="text-xs text-muted-foreground">
                      At least 8 characters. Avoid common passwords and the manager&apos;s name or email.
                    </p>
                  </Field>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-gradient-primary">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Register
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="rounded-xl border bg-card py-12 text-center text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border bg-card py-12 text-center text-muted-foreground">
            <Building2 className="mx-auto h-8 w-8 opacity-40" />
            <div className="mt-2 text-sm">No pharmacies yet. Register the first one above.</div>
          </div>
        ) : (
          rows.map((p) => (
            <PharmacyCard
              key={p.id}
              pharmacy={p}
              expanded={expandedId === p.id}
              onExpandedChange={(open) => setExpandedId(open ? p.id : null)}
              accessBadge={accessBadge(p.access_status)}
              updating={updatingId === p.id}
              onGrant={() => { setAccessDialog(p); setPaymentNotes(p.payment_notes || ""); }}
              onResetPassword={() => { setPasswordDialog(p); setNewManagerPassword(""); setConfirmManagerPassword(""); }}
              onSuspend={() => suspendAccess(p)}
              onReactivate={() => reactivateAccess(p)}
            />
          ))
        )}
      </div>

      <Dialog open={!!accessDialog} onOpenChange={(open) => !open && setAccessDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant system access</DialogTitle>
          </DialogHeader>
          {accessDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Confirm payment for <strong>{accessDialog.name}</strong>. The manager (
                {accessDialog.manager.email}) will be able to sign in and manage branches and staff.
              </p>
              <Field label="Payment reference / notes (optional)">
                <Input
                  placeholder="e.g. M-Pesa ref, invoice #123"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </Field>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setAccessDialog(null)}>Cancel</Button>
                <Button
                  className="bg-gradient-primary"
                  disabled={updatingId === accessDialog.id}
                  onClick={() => grantAccess(accessDialog)}
                >
                  {updatingId === accessDialog.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  Grant access
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!passwordDialog} onOpenChange={(open) => !open && setPasswordDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset manager password</DialogTitle>
          </DialogHeader>
          {passwordDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set a new password for <strong>{passwordDialog.manager.full_name || passwordDialog.manager.username}</strong> (
                {passwordDialog.manager.email}). Passwords are never changed automatically — use this if the manager cannot sign in.
              </p>
              <Field label="New password">
                <Input
                  type="password"
                  minLength={8}
                  value={newManagerPassword}
                  onChange={(e) => setNewManagerPassword(e.target.value)}
                  placeholder="e.g. SagudaMgr2026!"
                  autoComplete="new-password"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  At least 8 characters. Avoid common passwords and the manager&apos;s name or email. Passwords are case-sensitive.
                </p>
              </Field>
              <Field label="Confirm password">
                <Input
                  type="password"
                  minLength={8}
                  value={confirmManagerPassword}
                  onChange={(e) => setConfirmManagerPassword(e.target.value)}
                  placeholder="Re-enter the same password"
                  autoComplete="new-password"
                  required
                />
              </Field>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setPasswordDialog(null)}>Cancel</Button>
                <Button
                  className="bg-gradient-primary"
                  disabled={
                    updatingId === passwordDialog.id
                    || newManagerPassword.length < 8
                    || confirmManagerPassword.length < 8
                    || newManagerPassword !== confirmManagerPassword
                  }
                  onClick={resetManagerPassword}
                >
                  {updatingId === passwordDialog.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  Update password
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function PharmacyCard({
  pharmacy,
  expanded,
  onExpandedChange,
  accessBadge,
  updating,
  onGrant,
  onResetPassword,
  onSuspend,
  onReactivate,
}: {
  pharmacy: PharmacyRecord;
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
  accessBadge: React.ReactNode;
  updating: boolean;
  onGrant: () => void;
  onResetPassword: () => void;
  onSuspend: () => void;
  onReactivate: () => void;
}) {
  return (
    <Collapsible open={expanded} onOpenChange={onExpandedChange} className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-3 text-left transition-colors hover:opacity-80"
          >
            {pharmacy.logo_url ? (
              <img src={pharmacy.logo_url} alt="" className="h-11 w-11 shrink-0 rounded-lg border object-contain" />
            ) : (
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-gradient-primary text-primary-foreground">
                <Building2 className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-semibold">{pharmacy.name}</span>
                {accessBadge}
              </div>
              <div className="mt-0.5 text-sm text-muted-foreground">
                Manager: {pharmacy.manager.full_name || pharmacy.manager.username} · {pharmacy.manager.email}
              </div>
              {pharmacy.address && (
                <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {pharmacy.address}
                  {pharmacy.phone && ` · ${pharmacy.phone}`}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="tabular-nums">{pharmacy.branch_count} branch{pharmacy.branch_count !== 1 ? "es" : ""}</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
            </div>
          </button>
        </CollapsibleTrigger>

        <div className="flex flex-wrap items-center gap-1 sm:ml-auto">
          <Button size="sm" variant="outline" disabled={updating} onClick={onResetPassword}>
            <KeyRound className="h-3.5 w-3.5" /> Reset password
          </Button>
          {pharmacy.access_status === "pending" && (
            <Button size="sm" className="bg-gradient-primary" disabled={updating} onClick={onGrant}>
              <CheckCircle className="h-3.5 w-3.5" /> Grant access
            </Button>
          )}
          {pharmacy.access_status === "active" && (
            <Button size="sm" variant="outline" disabled={updating} onClick={onSuspend}>
              <Ban className="h-3.5 w-3.5" /> Suspend
            </Button>
          )}
          {pharmacy.access_status === "suspended" && (
            <Button size="sm" variant="outline" disabled={updating} onClick={onReactivate}>
              <CheckCircle className="h-3.5 w-3.5" /> Reactivate
            </Button>
          )}
        </div>
      </div>

      {pharmacy.payment_notes && (
        <div className="border-t px-4 py-2 text-xs text-muted-foreground">{pharmacy.payment_notes}</div>
      )}

      <CollapsibleContent>
        <div className="border-t bg-muted/20 px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Branches</p>
          {pharmacy.branches.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No branches yet. The manager can create branches after access is granted.
            </p>
          ) : (
            <TableCard className="border-0 bg-transparent shadow-none">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead className="hidden sm:table-cell">Address</TableHead>
                    <TableHead className="hidden md:table-cell">Phone</TableHead>
                    <TableHead className="text-right">Pharmacists</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pharmacy.branches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell label="Branch">
                        <div className="font-medium">{b.name}</div>
                        <div className="text-xs text-muted-foreground sm:hidden">{b.address || "—"}</div>
                      </TableCell>
                      <TableCell label="Address" className="hidden sm:table-cell text-muted-foreground">
                        {b.address || "—"}
                      </TableCell>
                      <TableCell label="Phone" className="hidden md:table-cell text-muted-foreground">
                        {b.phone || "—"}
                      </TableCell>
                      <TableCell label="Pharmacists" className="text-right">
                        <span className="inline-flex items-center justify-end gap-1 tabular-nums">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {b.pharmacist_count}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableCard>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
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
