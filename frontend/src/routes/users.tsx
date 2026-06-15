import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users as UsersIcon, ShieldCheck, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createUser, fetchUsers, setUserRole as apiSetUserRole } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/AppShell";
import { useAuth, type AppRole } from "@/hooks/use-auth";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/users")({
  component: UsersPage,
});

interface Row {
  id: number;
  full_name: string;
  username: string;
  email: string;
  roles: AppRole[];
}

const ROLE_OPTIONS: AppRole[] = ["pharmacist", "store_manager"];
const CREATE_ROLE_OPTIONS: Array<{ value: "pharmacist" | "store_manager"; label: string }> = [
  { value: "pharmacist", label: "Pharmacist" },
  { value: "store_manager", label: "Store manager" },
];

const emptyForm = {
  full_name: "",
  username: "",
  email: "",
  password: "",
  role: "pharmacist" as "pharmacist" | "store_manager",
};

function UsersPage() {
  const { hasRole, isPlatformAdmin, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!authLoading && user && !hasRole("store_manager")) {
      toast.error("Store managers only");
      navigate({ to: "/dashboard" });
    }
  }, [authLoading, user, hasRole, navigate]);

  const fetchUsersList = async () => {
    try {
      const data = await fetchUsers();
      setRows(data.map((p) => ({ ...p, roles: p.roles as AppRole[] })));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (hasRole("store_manager") && !isPlatformAdmin) fetchUsersList(); }, [hasRole, isPlatformAdmin]);

  const setUserRole = async (userId: number, newRole: AppRole) => {
    try {
      await apiSetUserRole(userId, newRole);
      toast.success("Role updated");
      fetchUsersList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const createStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.username.trim() || !form.email.trim()) {
      toast.error("Full name, username, and email are required");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSaving(true);
    try {
      await createUser({
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });
      toast.success("User created");
      setDialogOpen(false);
      setForm(emptyForm);
      fetchUsersList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create user");
    } finally {
      setSaving(false);
    }
  };

  if (!hasRole("store_manager") || isPlatformAdmin) {
    return <AppShell title="Staff"><div className="text-sm text-muted-foreground">Checking permissions…</div></AppShell>;
  }

  return (
    <AppShell title="Staff">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-accent text-accent-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="font-medium">Pharmacy staff</div>
            <div className="text-sm text-muted-foreground">
              Create pharmacist accounts and assign roles for your pharmacy.
            </div>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary" onClick={() => setForm(emptyForm)}>
              <Plus className="h-4 w-4" /> Add user
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create staff account</DialogTitle>
            </DialogHeader>
            <form onSubmit={createStaff} className="space-y-3">
              <Field label="Full name">
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              </Field>
              <Field label="Username">
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </Field>
              <Field label="Password">
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={6} required />
              </Field>
              <Field label="Role">
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as "pharmacist" | "store_manager" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CREATE_ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={saving} className="bg-gradient-primary">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create user
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <TableCard>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className={tableColHideMobile}>Username</TableHead>
              <TableHead className={tableColHideMobile}>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead><span className="md:hidden">Set</span><span className="hidden md:inline">Change role</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Loading…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                  <UsersIcon className="mx-auto h-8 w-8 opacity-40" />
                  <div className="mt-2 text-sm">No users yet.</div>
                </TableCell>
              </TableRow>
            ) : rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell label="Name" className="font-medium">{r.full_name || "—"}</TableCell>
                <TableCell label="Username" className={cn(tableColHideMobile, "text-muted-foreground")}>{r.username || "—"}</TableCell>
                <TableCell label="Email" className={cn(tableColHideMobile, "text-muted-foreground")}>{r.email}</TableCell>
                <TableCell label="Role">
                  {r.roles.length === 0
                    ? <Badge variant="outline">No role</Badge>
                    : r.roles.map((role) => (
                      <Badge key={role} className="mr-1" variant={role === "admin" ? "default" : "secondary"}>
                        {role.replace("_", " ")}
                      </Badge>
                    ))}
                </TableCell>
                <TableCell label="Change role">
                  <Select value={r.roles[0] ?? ""} onValueChange={(v) => setUserRole(r.id, v as AppRole)}>
                    <SelectTrigger><SelectValue placeholder="Set role" /></SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((role) => (
                        <SelectItem key={role} value={role}>{role.replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
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
