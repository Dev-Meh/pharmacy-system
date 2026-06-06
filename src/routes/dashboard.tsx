import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pill, AlertTriangle, CalendarClock, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

const LOW_STOCK_THRESHOLD = 10;

interface Stats {
  totalDrugs: number;
  lowStock: number;
  expiringSoon: number;
  salesToday: number;
}

function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ totalDrugs: 0, lowStock: 0, expiringSoon: 0, salesToday: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const in30 = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const [drugs, sales] = await Promise.all([
        supabase.from("drugs").select("id, quantity, expiry_date"),
        supabase.from("sales").select("total").gte("sold_at", startOfDay),
      ]);

      const drugRows = drugs.data ?? [];
      setStats({
        totalDrugs: drugRows.length,
        lowStock: drugRows.filter((d) => (d.quantity ?? 0) <= LOW_STOCK_THRESHOLD).length,
        expiringSoon: drugRows.filter((d) => d.expiry_date && d.expiry_date <= in30).length,
        salesToday: (sales.data ?? []).reduce((s, r) => s + Number(r.total ?? 0), 0),
      });
      setLoading(false);
    })();
  }, [user]);

  const cards = [
    { label: "Total drugs", value: stats.totalDrugs, icon: Pill, tone: "from-primary to-primary/70" },
    { label: "Low stock", value: stats.lowStock, icon: AlertTriangle, tone: "from-warning to-warning/60" },
    { label: "Expiring ≤ 30d", value: stats.expiringSoon, icon: CalendarClock, tone: "from-destructive to-destructive/60" },
    { label: "Sales today", value: `$${stats.salesToday.toFixed(2)}`, icon: DollarSign, tone: "from-accent to-accent/60" },
  ];

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

      <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold">Quick start</h2>
        <p className="mt-1 text-sm text-muted-foreground">Welcome to MediCore. Use the sidebar to navigate.</p>
        <ul className="mt-4 grid gap-2 text-sm text-foreground/80 md:grid-cols-2">
          <li className="rounded-lg bg-muted/50 p-3"><strong>Drugs</strong> — add, update stock, search inventory.</li>
          <li className="rounded-lg bg-muted/50 p-3"><strong>Sales</strong> — record a sale; stock decrements automatically.</li>
          <li className="rounded-lg bg-muted/50 p-3"><strong>Users</strong> — admins manage roles and accounts.</li>
          <li className="rounded-lg bg-muted/50 p-3"><strong>Dashboard</strong> — overview of stock and sales activity.</li>
        </ul>
      </div>
    </AppShell>
  );
}
