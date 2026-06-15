import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pill, AlertTriangle, CalendarClock, Banknote, PackagePlus } from "lucide-react";
import { fetchDashboardStats, fetchLowStockDrugs, fetchStockOrders, type Drug, type PlatformDashboardStats } from "@/lib/api/client";
import { Building2, Clock, CheckCircle } from "lucide-react";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import { formatTzs } from "@/lib/currency";
import { formatQuantity } from "@/lib/quantity";
import { useBranchReload } from "@/hooks/use-branch";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/AppShell";
import { SalesChart } from "@/components/SalesChart";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user, hasRole, isPlatformAdmin } = useAuth();
  const canManageOrders = hasRole("store_manager");
  const isPharmacist = hasRole("pharmacist") && !canManageOrders;
  const [stats, setStats] = useState({ totalDrugs: 0, lowStock: 0, expiringSoon: 0, salesToday: 0 });
  const [platformStats, setPlatformStats] = useState({
    pharmacy_count: 0,
    active_pharmacies: 0,
    pending_pharmacies: 0,
    suspended_pharmacies: 0,
    manager_count: 0,
    branch_count: 0,
  });
  const [lowStockDrugs, setLowStockDrugs] = useState<Drug[]>([]);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [readyToImport, setReadyToImport] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (isPlatformAdmin) {
      fetchDashboardStats()
        .then((data) => {
          const p = data as PlatformDashboardStats;
          setPlatformStats({
            pharmacy_count: p.pharmacy_count,
            active_pharmacies: p.active_pharmacies,
            pending_pharmacies: p.pending_pharmacies,
            suspended_pharmacies: p.suspended_pharmacies,
            manager_count: p.manager_count,
            branch_count: p.branch_count,
          });
        })
        .finally(() => setLoading(false));
      return;
    }
    const tasks: Promise<unknown>[] = [
      fetchDashboardStats().then((data) => {
        const d = data as { total_drugs: number; low_stock: number; expiring_soon: number; sales_today: number };
        setStats({
          totalDrugs: d.total_drugs,
          lowStock: d.low_stock,
          expiringSoon: d.expiring_soon,
          salesToday: Math.round(Number(d.sales_today)),
        });
      }),
      fetchLowStockDrugs().then(setLowStockDrugs),
    ];
    if (canManageOrders || isPharmacist) {
      tasks.push(
        fetchStockOrders().then((orders) => {
          setPendingOrders(orders.filter((o) => o.status === "pending").length);
          setReadyToImport(orders.filter((o) => o.status === "fulfilled").length);
        }),
      );
    }
    Promise.all(tasks).finally(() => setLoading(false));
  }, [user, canManageOrders, isPharmacist, isPlatformAdmin]);

  useBranchReload(() => {
    if (!user || isPlatformAdmin) return;
    setLoading(true);
    const tasks: Promise<unknown>[] = [
      fetchDashboardStats().then((data) => {
        const d = data as { total_drugs: number; low_stock: number; expiring_soon: number; sales_today: number };
        setStats({
          totalDrugs: d.total_drugs,
          lowStock: d.low_stock,
          expiringSoon: d.expiring_soon,
          salesToday: Math.round(Number(d.sales_today)),
        });
      }),
      fetchLowStockDrugs().then(setLowStockDrugs),
    ];
    if (canManageOrders || isPharmacist) {
      tasks.push(
        fetchStockOrders().then((orders) => {
          setPendingOrders(orders.filter((o) => o.status === "pending").length);
          setReadyToImport(orders.filter((o) => o.status === "fulfilled").length);
        }),
      );
    }
    Promise.all(tasks).finally(() => setLoading(false));
  });

  const cards = [
    { label: "Total products", value: stats.totalDrugs, icon: Pill, tone: "from-primary to-primary/70" },
    { label: "Low stock", value: stats.lowStock, icon: AlertTriangle, tone: "from-warning to-warning/60" },
    { label: "Expiring ≤ 30d", value: stats.expiringSoon, icon: CalendarClock, tone: "from-destructive to-destructive/60" },
    { label: "Sales today", value: formatTzs(stats.salesToday), icon: Banknote, tone: "from-accent to-accent/60" },
  ];

  const platformCards = [
    { label: "Pharmacies", value: platformStats.pharmacy_count, icon: Building2, tone: "from-primary to-primary/70" },
    { label: "Awaiting payment", value: platformStats.pending_pharmacies, icon: Clock, tone: "from-warning to-warning/60" },
    { label: "Active", value: platformStats.active_pharmacies, icon: CheckCircle, tone: "from-accent to-accent/60" },
    { label: "Branches", value: platformStats.branch_count, icon: Pill, tone: "from-destructive to-destructive/60" },
  ];

  if (isPlatformAdmin) {
    return (
      <AppShell title="Dashboard">
        <div className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="font-display text-lg font-semibold">MehMediCore platform</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Register pharmacies and assign managers. Grant access after payment — then managers can create branches and pharmacists.
          </p>
          <Button className="mt-4 bg-gradient-primary" asChild>
            <Link to="/pharmacies">Manage pharmacies</Link>
          </Button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {platformCards.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</div>
                    <div className="mt-2 font-display text-3xl font-bold">
                      {loading ? <span className="inline-block h-7 w-16 animate-pulse rounded bg-muted" /> : c.value}
                    </div>
                  </div>
                  <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${c.tone} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="group rounded-2xl border border-border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-elevated">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{c.label}</div>
                  <div className="mt-2 font-display text-3xl font-bold">
                    {loading ? <span className="inline-block h-7 w-16 animate-pulse rounded bg-muted" /> : c.value}
                  </div>
                </div>
                <div className={`grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${c.tone} text-white`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <SalesChart />

      {!loading && isPharmacist && readyToImport > 0 && (
        <div className="mt-6 rounded-2xl border border-primary/40 bg-primary/10 p-5 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Stock ready to import</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {readyToImport} fulfilled order{readyToImport === 1 ? " is" : "s are"} waiting for you to record the imported quantity.
              </p>
            </div>
            <Button className="bg-gradient-primary shrink-0" asChild>
              <Link to="/stock-orders">Record import</Link>
            </Button>
          </div>
        </div>
      )}

      {!loading && stats.lowStock > 0 && (
        <div className="mt-6 rounded-2xl border border-warning/40 bg-warning/10 p-5 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
              <div>
                <h2 className="font-display text-lg font-semibold">Low stock alert</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stats.lowStock} product{stats.lowStock === 1 ? " is" : "s are"} at or below {LOW_STOCK_THRESHOLD} units.
                  {canManageOrders && pendingOrders > 0 && (
                    <span className="ml-1 font-medium text-foreground">
                      {pendingOrders} pending restock request{pendingOrders === 1 ? "" : "s"}.
                    </span>
                  )}
                  {isPharmacist && pendingOrders > 0 && (
                    <span className="ml-1 font-medium text-foreground">
                      You have {pendingOrders} order{pendingOrders === 1 ? "" : "s"} awaiting manager review.
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" asChild>
                <Link to="/drugs">View products</Link>
              </Button>
              <Button className="bg-gradient-primary" asChild>
                <Link to="/stock-orders">{canManageOrders ? "Stock orders" : "My orders"}</Link>
              </Button>
            </div>
          </div>

          {lowStockDrugs.length > 0 && (
            <ul className="mt-4 divide-y divide-warning/20 rounded-xl border border-warning/20 bg-card/60">
              {lowStockDrugs.slice(0, 5).map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="font-medium">{d.name}</span>
                  <span className={`tabular-nums font-semibold ${d.quantity === 0 ? "text-destructive" : "text-warning"}`}>
                    {formatQuantity(d.quantity)} left
                  </span>
                </li>
              ))}
            </ul>
          )}

          {!canManageOrders && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <PackagePlus className="h-4 w-4" />
              Go to <strong>My orders</strong> or use <strong>Request</strong> on any product in Products.
            </p>
          )}
        </div>
      )}

    </AppShell>
  );
}
