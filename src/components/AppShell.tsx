import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Pill,
  ShoppingCart,
  Users,
  LogOut,
  Menu,
  X,
  Stethoscope,
} from "lucide-react";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

interface NavItem {
  to: "/dashboard" | "/drugs" | "/sales" | "/users";
  label: string;
  icon: typeof LayoutDashboard;
  roles?: AppRole[]; // if omitted, all roles
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/drugs", label: "Drugs", icon: Pill, roles: ["admin", "store_manager"] },
  { to: "/sales", label: "Sales", icon: ShoppingCart },
  { to: "/users", label: "Users", icon: Users, roles: ["admin"] },
];

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const { user, profile, roles, loading, hasRole, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const visibleNav = NAV.filter((n) => !n.roles || n.roles.some((r) => hasRole(r)));
  const primaryRole = roles[0] ?? "pharmacist";

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform md:static md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-sidebar-border px-5 py-5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-primary text-primary-foreground">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-base font-bold text-sidebar-foreground">MediCore</div>
            <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Pharmacy</div>
          </div>
          <button
            className="ml-auto rounded-md p-1 text-sidebar-foreground/70 hover:bg-sidebar-accent md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleNav.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-gradient-primary text-primary-foreground shadow-card"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <div className="rounded-lg bg-sidebar-accent/50 px-3 py-3">
            <div className="text-sm font-semibold text-sidebar-foreground truncate">
              {profile?.full_name || profile?.username || user.email}
            </div>
            <div className="mt-0.5 text-[11px] uppercase tracking-wider text-sidebar-foreground/60">
              {primaryRole.replace("_", " ")}
            </div>
          </div>
          <Button
            variant="ghost"
            className="mt-2 w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent"
            onClick={async () => { await signOut(); navigate({ to: "/auth" }); }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card/80 px-4 py-3 backdrop-blur md:px-8">
          <button
            className="rounded-md p-1.5 text-foreground/70 hover:bg-muted md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-semibold md:text-xl">{title}</h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right md:block">
              <div className="text-sm font-medium leading-tight">{profile?.full_name || profile?.username}</div>
              <div className="text-[11px] text-muted-foreground">{user.email}</div>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground">
              {(profile?.full_name || profile?.username || user.email || "?").slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 animate-fade-in px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
