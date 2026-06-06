import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users as UsersIcon, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/users")({
  component: UsersPage,
});

interface Row {
  id: string;
  full_name: string;
  username: string;
  email: string;
  roles: AppRole[];
}

const ROLE_OPTIONS: AppRole[] = ["admin", "pharmacist", "store_manager"];

function UsersPage() {
  const { hasRole, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user && !hasRole("admin")) {
      toast.error("Admins only");
      navigate({ to: "/dashboard" });
    }
  }, [authLoading, user, hasRole, navigate]);

  const fetchUsers = async () => {
    const [{ data: profs }, { data: rolesData }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, username, email").order("full_name"),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const byUser = new Map<string, AppRole[]>();
    (rolesData ?? []).forEach((r) => {
      const list = byUser.get(r.user_id) ?? [];
      list.push(r.role as AppRole);
      byUser.set(r.user_id, list);
    });
    setRows((profs ?? []).map((p) => ({ ...p, roles: byUser.get(p.id) ?? [] })));
    setLoading(false);
  };

  useEffect(() => { if (hasRole("admin")) fetchUsers(); }, [hasRole]);

  const setUserRole = async (userId: string, newRole: AppRole) => {
    // Replace any existing roles with this single role
    const del = await supabase.from("user_roles").delete().eq("user_id", userId);
    if (del.error) { toast.error(del.error.message); return; }
    const ins = await supabase.from("user_roles").insert({ user_id: userId, role: newRole });
    if (ins.error) { toast.error(ins.error.message); return; }
    toast.success("Role updated");
    fetchUsers();
  };

  if (!hasRole("admin")) {
    return <AppShell title="Users"><div className="text-sm text-muted-foreground">Checking permissions…</div></AppShell>;
  }

  return (
    <AppShell title="User Management">
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-accent text-accent-foreground">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <div className="font-medium">Admin only</div>
          <div className="text-sm text-muted-foreground">
            New users register themselves at the sign-in page. Assign their role here. New sign-ups default to <strong>pharmacist</strong>.
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-56">Change role</TableHead>
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
                <TableCell className="font-medium">{r.full_name || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{r.username || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{r.email}</TableCell>
                <TableCell>
                  {r.roles.length === 0
                    ? <Badge variant="outline">No role</Badge>
                    : r.roles.map((role) => (
                      <Badge key={role} className="mr-1" variant={role === "admin" ? "default" : "secondary"}>
                        {role.replace("_", " ")}
                      </Badge>
                    ))}
                </TableCell>
                <TableCell>
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
      </div>
    </AppShell>
  );
}
