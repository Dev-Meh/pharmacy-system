import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Building2, Plus, Loader2, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  assignBranchMember,
  createBranch,
  fetchBranchMembers,
  fetchBranches,
  fetchUsers,
  removeBranchMember,
  type Branch,
  type BranchMember,
} from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";
import { useBranch } from "@/hooks/use-branch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCard, tableColHideMobile } from "@/components/ui/table";

export const Route = createFileRoute("/branches")({
  component: BranchesPage,
});

const emptyBranch = { name: "", address: "", phone: "" };

function BranchesPage() {
  const { hasRole } = useAuth();
  const { refreshBranches, setBranch } = useBranch();
  const canManage = hasRole("store_manager");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [members, setMembers] = useState<BranchMember[]>([]);
  const [users, setUsers] = useState<Array<{ id: number; full_name: string; email: string; roles: string[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [form, setForm] = useState(emptyBranch);
  const [assignUserId, setAssignUserId] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await fetchBranches();
      setBranches(list);
      if (!selectedId && list.length > 0) setSelectedId(list[0].id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load branches");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const loadMembers = useCallback(async (branchId: string) => {
    if (!branchId) return;
    try {
      setMembers(await fetchBranchMembers(branchId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load staff");
    }
  }, []);

  useEffect(() => {
    if (canManage) load();
  }, [canManage, load]);

  useEffect(() => {
    if (selectedId) loadMembers(selectedId);
  }, [selectedId, loadMembers]);

  useEffect(() => {
    if (canManage) {
      fetchUsers()
        .then(setUsers)
        .catch(() => toast.error("Failed to load pharmacists"));
    }
  }, [canManage]);

  useEffect(() => {
    if (canManage && assignOpen && users.length === 0) {
      fetchUsers()
        .then(setUsers)
        .catch(() => toast.error("Failed to load users"));
    }
  }, [canManage, assignOpen, users.length]);

  const saveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Branch name is required"); return; }
    setSaving(true);
    try {
      const branch = await createBranch({
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
      });
      toast.success(`Branch "${branch.name}" created`);
      setDialogOpen(false);
      setForm(emptyBranch);
      await load();
      await refreshBranches();
      setSelectedId(branch.id);
      setBranch(branch.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create branch");
    } finally {
      setSaving(false);
    }
  };

  const assignStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !assignUserId) { toast.error("Pick a staff member"); return; }
    setSaving(true);
    try {
      await assignBranchMember(selectedId, Number(assignUserId), false);
      toast.success("Pharmacist assigned to branch");
      setAssignOpen(false);
      setAssignUserId("");
      loadMembers(selectedId);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setSaving(false);
    }
  };

  const removeStaff = async (member: BranchMember) => {
    if (!selectedId) return;
    if (!confirm(`Remove ${member.full_name || member.email} from this branch?`)) return;
    try {
      await removeBranchMember(selectedId, member.user_id);
      toast.success("Staff removed");
      loadMembers(selectedId);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    }
  };

  if (!canManage) {
    return (
      <AppShell title="Branches">
        <p className="text-sm text-muted-foreground">Only managers can manage branches.</p>
      </AppShell>
    );
  }

  const selected = branches.find((b) => b.id === selectedId);
  const assignedUserIds = new Set(members.filter((m) => !m.is_manager).map((m) => m.user_id));
  const pharmacistUsers = users.filter(
    (u) => u.roles.includes("pharmacist") && !assignedUserIds.has(u.id),
  );

  return (
    <AppShell title="Branches">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Create branches, assign pharmacists, and manage separate stock per branch.
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary"><Plus className="h-4 w-4" /> New branch</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create branch</DialogTitle></DialogHeader>
            <form onSubmit={saveBranch} className="space-y-3">
              <Field label="Branch name *">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </Field>
              <Field label="Address">
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </Field>
              <Field label="Phone">
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-gradient-primary">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create branch
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <TableCard>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Branch</TableHead>
                <TableHead className="text-right"><span className="md:hidden">Staff</span><span className="hidden md:inline">Pharmacists</span></TableHead>
                <TableHead className={tableColHideMobile}>Phone</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">Loading…</TableCell>
                </TableRow>
              ) : branches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                    <Building2 className="mx-auto h-8 w-8 opacity-40" />
                    <div className="mt-2 text-sm">No branches yet.</div>
                  </TableCell>
                </TableRow>
              ) : branches.map((b) => (
                <TableRow
                  key={b.id}
                  className={b.id === selectedId ? "bg-muted/50" : "cursor-pointer"}
                  onClick={() => { setSelectedId(b.id); setBranch(b.id); }}
                >
                  <TableCell label="Branch">
                    <div className="font-medium">{b.name}</div>
                    {b.address && <div className="text-xs text-muted-foreground">{b.address}</div>}
                  </TableCell>
                  <TableCell label="Pharmacists" className="text-right tabular-nums">{b.pharmacist_count}</TableCell>
                  <TableCell label="Phone" className={cn(tableColHideMobile, "text-muted-foreground")}>{b.phone || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableCard>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold">
                {selected ? `${selected.name} — staff` : "Select a branch"}
              </h2>
              <p className="text-sm text-muted-foreground">Pharmacists assigned to this branch see its inventory only.</p>
            </div>
            {selected && (
              <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline"><UserPlus className="h-4 w-4" /> Assign</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Assign pharmacist</DialogTitle></DialogHeader>
                  <form onSubmit={assignStaff} className="space-y-4">
                    <Field label="Pharmacist">
                      <Select value={assignUserId} onValueChange={setAssignUserId}>
                        <SelectTrigger><SelectValue placeholder="Choose pharmacist" /></SelectTrigger>
                        <SelectContent>
                          {pharmacistUsers.length === 0 ? (
                            <SelectItem value="__none" disabled>
                              {users.some((u) => u.roles.includes("pharmacist"))
                                ? "All pharmacists are already assigned here"
                                : "No pharmacists — add staff first"}
                            </SelectItem>
                          ) : (
                            pharmacistUsers.map((u) => (
                              <SelectItem key={u.id} value={String(u.id)}>
                                {u.full_name || u.email}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </Field>
                    <DialogFooter>
                      <Button type="button" variant="ghost" onClick={() => setAssignOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={saving || !assignUserId} className="bg-gradient-primary">
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        Assign to branch
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {selected && (
            <div className="mt-4 space-y-2">
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No staff assigned yet.</p>
              ) : members.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div>
                    <div className="text-sm font-medium">{m.full_name || m.email}</div>
                    <div className="text-xs text-muted-foreground">{m.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{m.is_manager ? "Manager" : "Pharmacist"}</Badge>
                    {!m.is_manager && (
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeStaff(m)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
