import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, Plane, Wrench, Cog, Boxes, Users, Gauge, ShieldCheck,
  BarChart3, Settings, Search, Bell, ChevronDown, LogOut, Moon, Sun,
  Calendar, AlertTriangle, TrendingUp, TrendingDown, CheckCircle2,
  ClipboardList, PackageX, PackageCheck, Clock, FileDown, Menu, X,
  ChevronRight, CircleDot,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from "recharts";
import hangar from "@/assets/hangar.jpg";
import { CasLogo } from "@/components/cas/Logo";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Operations Dashboard — CAS AMMS" },
      { name: "description", content: "Real-time aircraft maintenance operations dashboard." },
    ],
  }),
  component: DashboardPage,
});

/* ---------------- Sidebar config ---------------- */

type NavItem = { label: string; icon?: any; children?: { label: string }[] };

const NAV: { section: string; items: NavItem[] }[] = [
  { section: "Overview", items: [{ label: "Dashboard", icon: LayoutDashboard }] },
  {
    section: "Operations",
    items: [
      { label: "Aircraft Management", icon: Plane, children: [
        { label: "Aircraft Registry" }, { label: "Aircraft Status" }, { label: "Aircraft Documents" },
      ]},
      { label: "Maintenance", icon: Wrench, children: [
        { label: "Work Orders" }, { label: "Scheduled Maintenance" },
        { label: "Corrective Maintenance" }, { label: "Preventive Maintenance" },
      ]},
      { label: "Engineering", icon: Cog, children: [
        { label: "Technical Records" }, { label: "Engineering Tasks" }, { label: "Service Bulletins" },
      ]},
      { label: "Inventory", icon: Boxes, children: [
        { label: "Spare Parts" }, { label: "Tools Management" },
        { label: "Stock Requests" }, { label: "Suppliers" },
      ]},
    ],
  },
  {
    section: "Workforce",
    items: [
      { label: "Personnel", icon: Users, children: [
        { label: "Engineers" }, { label: "Technicians" },
        { label: "Certifications" }, { label: "Training Records" },
      ]},
      { label: "Flight Operations", icon: Gauge, children: [
        { label: "Flight Hours Tracking" }, { label: "Aircraft Utilization" },
      ]},
    ],
  },
  {
    section: "Governance",
    items: [
      { label: "Compliance", icon: ShieldCheck, children: [
        { label: "Airworthiness Directives" }, { label: "Regulatory Compliance" }, { label: "Audit Reports" },
      ]},
      { label: "Reports", icon: BarChart3, children: [
        { label: "Maintenance Reports" }, { label: "Aircraft Availability" },
        { label: "Cost Analysis" }, { label: "Personnel Performance" },
      ]},
      { label: "Administration", icon: Settings, children: [
        { label: "Users" }, { label: "Roles & Permissions" }, { label: "System Settings" },
      ]},
    ],
  },
];

/* ---------------- Mock data ---------------- */

const KPIS = [
  { label: "Total Aircraft", value: "48", trend: 4.2, icon: Plane, tone: "navy" },
  { label: "Active Aircraft", value: "39", trend: 2.1, icon: CheckCircle2, tone: "success" },
  { label: "Under Maintenance", value: "7", trend: -1.4, icon: Wrench, tone: "warning" },
  { label: "Open Work Orders", value: "126", trend: 8.7, icon: ClipboardList, tone: "orange" },
  { label: "Completed WO (Mo.)", value: "312", trend: 12.5, icon: CheckCircle2, tone: "success" },
  { label: "Available Spare Parts", value: "8,420", trend: 1.8, icon: Boxes, tone: "navy" },
  { label: "Certified Engineers", value: "84", trend: 3.0, icon: Users, tone: "navy" },
  { label: "Upcoming Inspections", value: "19", trend: -2.2, icon: Calendar, tone: "orange" },
];

const STATUS = [
  { name: "Operational", value: 32, color: "var(--success)" },
  { name: "Under Maintenance", value: 7, color: "var(--accent)" },
  { name: "Grounded", value: 3, color: "var(--destructive)" },
  { name: "Scheduled Inspection", value: 6, color: "var(--chart-3)" },
];

const SCHEDULE = [
  { date: "Dec 02", type: "A Check", reg: "5N-CAS01", aircraft: "B737-800", eng: "K. Adeyemi", color: "var(--accent)" },
  { date: "Dec 04", type: "Engine Inspection", reg: "5N-CAS07", aircraft: "A320neo", eng: "M. Okonkwo", color: "var(--primary)" },
  { date: "Dec 06", type: "C Check", reg: "5N-CAS12", aircraft: "B777-300ER", eng: "T. Mensah", color: "var(--destructive)" },
  { date: "Dec 09", type: "Component Replacement", reg: "5N-CAS04", aircraft: "ATR 72", eng: "A. Diallo", color: "var(--chart-3)" },
  { date: "Dec 11", type: "B Check", reg: "5N-CAS19", aircraft: "Q400", eng: "S. Banda", color: "var(--success)" },
];

const WORK_ORDERS = [
  { wo: "WO-24812", reg: "5N-CAS07", task: "Fan blade inspection — Engine #2", eng: "K. Adeyemi", prio: "High", status: "In Progress", due: "Dec 02" },
  { wo: "WO-24813", reg: "5N-CAS12", task: "Hydraulic system overhaul", eng: "T. Mensah", prio: "Critical", status: "Open", due: "Dec 03" },
  { wo: "WO-24810", reg: "5N-CAS01", task: "Avionics software update", eng: "M. Okonkwo", prio: "Medium", status: "Awaiting Parts", due: "Dec 05" },
  { wo: "WO-24809", reg: "5N-CAS04", task: "Landing gear lubrication", eng: "A. Diallo", prio: "Low", status: "Completed", due: "Nov 30" },
  { wo: "WO-24808", reg: "5N-CAS19", task: "Cabin pressurization test", eng: "S. Banda", prio: "Medium", status: "In Progress", due: "Dec 04" },
];

const INV_OVERVIEW = [
  { label: "Low Stock Items", value: 23, icon: PackageX, tone: "warning" },
  { label: "Critical Parts", value: 6, icon: AlertTriangle, tone: "destructive" },
  { label: "Pending Orders", value: 14, icon: Clock, tone: "orange" },
  { label: "Received This Week", value: 87, icon: PackageCheck, tone: "success" },
];

const ENGINEER_ACTIVITY = [
  { name: "Kofi Adeyemi", cert: "B1.1 — Powerplant", assign: "5N-CAS07 · Engine #2", hours: "38h", status: "On Shift" },
  { name: "Tunde Mensah", cert: "C — Base Maintenance", assign: "5N-CAS12 · C Check", hours: "42h", status: "On Shift" },
  { name: "Marie Okonkwo", cert: "B2 — Avionics", assign: "5N-CAS01 · Avionics", hours: "29h", status: "On Break" },
  { name: "Amadou Diallo", cert: "B1.2 — Structures", assign: "5N-CAS04 · Gear", hours: "35h", status: "On Shift" },
  { name: "Stella Banda", cert: "B1.1 — Powerplant", assign: "5N-CAS19 · Pressurization", hours: "40h", status: "On Shift" },
];

const NOTIFS = [
  { type: "Overdue Maintenance", msg: "5N-CAS03 · Daily Check overdue by 6h", tone: "destructive", time: "12 min" },
  { type: "Expiring Certification", msg: "M. Okonkwo · B2 cert expires Dec 18", tone: "warning", time: "1 h" },
  { type: "Low Inventory", msg: "Brake pads (P/N 32-8821) below threshold", tone: "warning", time: "2 h" },
  { type: "Upcoming Inspection", msg: "5N-CAS07 · A Check tomorrow 06:00", tone: "navy", time: "3 h" },
  { type: "Compliance Deadline", msg: "AD 2026-22-14 due in 5 days", tone: "destructive", time: "5 h" },
];

const WO_BARS = [
  { m: "Jul", opened: 240, closed: 210 },
  { m: "Aug", opened: 260, closed: 245 },
  { m: "Sep", opened: 280, closed: 270 },
  { m: "Oct", opened: 305, closed: 290 },
  { m: "Nov", opened: 318, closed: 312 },
  { m: "Dec", opened: 126, closed: 98 },
];

/* ---------------- Page ---------------- */

function DashboardPage() {
  const navigate = useNavigate();
  const [dark, setDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState("Dashboard");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ Maintenance: true });

  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 flex-shrink-0 transform overflow-y-auto bg-sidebar text-sidebar-foreground transition-transform lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <CasLogo light />
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded p-1 text-sidebar-foreground/70 hover:bg-sidebar-accent lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-5 px-3 py-5 text-sm">
          {NAV.map((sec) => (
            <div key={sec.section}>
              <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/40">
                {sec.section}
              </div>
              <ul className="space-y-0.5">
                {sec.items.map((it) => {
                  const Icon = it.icon;
                  const isActive = active === it.label;
                  const isOpen = expanded[it.label];
                  return (
                    <li key={it.label}>
                      <button
                        onClick={() => {
                          setActive(it.label);
                          if (it.children) setExpanded((s) => ({ ...s, [it.label]: !s[it.label] }));
                        }}
                        className={`group flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition ${
                          isActive
                            ? "bg-accent text-accent-foreground shadow-elevated"
                            : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-white"
                        }`}
                      >
                        {Icon && <Icon className="h-[18px] w-[18px] shrink-0" />}
                        <span className="flex-1 truncate font-medium">{it.label}</span>
                        {it.children && (
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`}
                          />
                        )}
                      </button>
                      {it.children && isOpen && (
                        <ul className="ml-7 mt-1 space-y-0.5 border-l border-sidebar-border/60 pl-3">
                          {it.children.map((c) => (
                            <li key={c.label}>
                              <a
                                href="#"
                                className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white"
                              >
                                <CircleDot className="h-2 w-2 text-accent/70" />
                                {c.label}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/90 px-4 backdrop-blur lg:px-7">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 hover:bg-muted lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="hidden lg:block">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">CAS · Operations Console</div>
            <div className="font-display text-lg font-bold leading-tight">Dashboard</div>
          </div>

          <div className="ml-auto flex flex-1 items-center gap-2 lg:ml-6 lg:max-w-md">
            <div className="flex h-10 w-full items-center gap-2 rounded-md border border-border bg-background px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search aircraft, work orders, parts…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
              />
              <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">⌘K</kbd>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <IconBtn onClick={toggleDark} label="Toggle theme">
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </IconBtn>
            <IconBtn label="Notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent ring-2 ring-card" />
            </IconBtn>
            <ProfileMenu onLogout={() => navigate({ to: "/" })} />
          </div>
        </header>

        {/* Banner */}
        <section className="relative mx-4 mt-4 overflow-hidden rounded-xl shadow-card lg:mx-7">
          <img src={hangar} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/80 to-primary/30" />
          <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between lg:p-8">
            <div className="max-w-xl text-white">
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider backdrop-blur">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                Live Operations · Hangar 3
              </div>
              <h1 className="font-display text-2xl font-bold leading-tight lg:text-3xl">
                Good morning, Captain Adeyemi
              </h1>
              <p className="mt-1.5 text-sm text-white/80">
                7 aircraft under maintenance · 19 inspections scheduled this week · 6 critical parts low.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="inline-flex items-center gap-2 rounded-md bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20">
                <FileDown className="h-4 w-4" /> Export PDF
              </button>
              <button className="inline-flex items-center gap-2 rounded-md bg-gradient-orange px-4 py-2 text-sm font-semibold text-white shadow-elevated transition hover:brightness-110">
                <ClipboardList className="h-4 w-4" /> New Work Order
              </button>
            </div>
          </div>
        </section>

        {/* KPI grid */}
        <section className="grid gap-4 px-4 py-5 sm:grid-cols-2 lg:grid-cols-4 lg:px-7">
          {KPIS.map((k) => <KpiCard key={k.label} {...k} />)}
        </section>

        {/* Charts row */}
        <section className="grid gap-4 px-4 lg:grid-cols-3 lg:px-7">
          <Card className="lg:col-span-1">
            <CardHeader title="Aircraft Status Overview" subtitle="Real-time fleet status" />
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={STATUS} dataKey="value" nameKey="name"
                    innerRadius={55} outerRadius={85} paddingAngle={3} stroke="none"
                  >
                    {STATUS.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="grid grid-cols-2 gap-2 px-1 pb-1 pt-2 text-xs">
              {STATUS.map((s) => (
                <li key={s.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                  <span className="flex-1 text-muted-foreground">{s.name}</span>
                  <span className="font-semibold">{s.value}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader
              title="Work Orders Trend"
              subtitle="Opened vs closed — last 6 months"
              right={<Badge tone="success"><TrendingUp className="h-3 w-3" /> 12.5%</Badge>}
            />
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={WO_BARS} barGap={4}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="m" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                  <Bar dataKey="opened" name="Opened" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="closed" name="Closed" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>

        {/* Schedule + Notifs */}
        <section className="grid gap-4 px-4 pt-5 lg:grid-cols-3 lg:px-7">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Maintenance Schedule"
              subtitle="Upcoming checks & inspections"
              right={<a href="#" className="text-xs font-semibold text-accent hover:underline">View calendar</a>}
            />
            <ul className="divide-y divide-border">
              {SCHEDULE.map((s) => (
                <li key={s.reg} className="flex items-center gap-4 py-3">
                  <div className="flex h-12 w-14 flex-col items-center justify-center rounded-md bg-muted text-center">
                    <div className="text-[10px] font-medium uppercase text-muted-foreground">{s.date.split(" ")[0]}</div>
                    <div className="font-display text-base font-bold leading-none">{s.date.split(" ")[1]}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                      <span className="font-semibold">{s.type}</span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {s.reg} · {s.aircraft} · Lead: {s.eng}
                    </div>
                  </div>
                  <button className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                    Details
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Notifications" subtitle="Critical alerts" right={<Badge tone="destructive">5 new</Badge>} />
            <ul className="space-y-2.5">
              {NOTIFS.map((n, i) => (
                <li key={i} className="flex gap-3 rounded-lg border border-border p-3">
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${toneBg(n.tone)}`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold uppercase tracking-wide">{n.type}</span>
                      <span className="text-[10px] text-muted-foreground">{n.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{n.msg}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* Inventory overview */}
        <section className="grid gap-4 px-4 pt-5 sm:grid-cols-2 lg:grid-cols-4 lg:px-7">
          {INV_OVERVIEW.map((i) => {
            const Icon = i.icon;
            return (
              <Card key={i.label}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${toneBg(i.tone)}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{i.label}</div>
                    <div className="font-display text-2xl font-bold leading-none">{i.value}</div>
                  </div>
                </div>
              </Card>
            );
          })}
        </section>

        {/* Work orders table */}
        <section className="px-4 pt-5 lg:px-7">
          <Card>
            <CardHeader
              title="Recent Work Orders"
              subtitle="Latest activity from the hangar floor"
              right={
                <div className="flex gap-2">
                  <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                    <FileDown className="h-3.5 w-3.5" /> Excel
                  </button>
                  <button className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                    <FileDown className="h-3.5 w-3.5" /> PDF
                  </button>
                </div>
              }
            />
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <Th>WO #</Th><Th>Aircraft</Th><Th>Task</Th><Th>Engineer</Th>
                    <Th>Priority</Th><Th>Status</Th><Th>Due</Th>
                  </tr>
                </thead>
                <tbody>
                  {WORK_ORDERS.map((w) => (
                    <tr key={w.wo} className="border-t border-border hover:bg-muted/50">
                      <Td className="font-mono text-xs font-semibold text-accent">{w.wo}</Td>
                      <Td className="font-medium">{w.reg}</Td>
                      <Td className="text-muted-foreground">{w.task}</Td>
                      <Td>{w.eng}</Td>
                      <Td><PriorityBadge p={w.prio} /></Td>
                      <Td><StatusBadge s={w.status} /></Td>
                      <Td className="text-muted-foreground">{w.due}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        {/* Engineer activity */}
        <section className="px-4 pb-10 pt-5 lg:px-7">
          <Card>
            <CardHeader title="Engineer Activity" subtitle="Active assignments and shift status" />
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                    <Th>Engineer</Th><Th>Certification</Th><Th>Current Assignment</Th><Th>Hours (Wk)</Th><Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {ENGINEER_ACTIVITY.map((e) => (
                    <tr key={e.name} className="border-t border-border hover:bg-muted/50">
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-navy text-xs font-semibold text-white">
                            {e.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <span className="font-medium">{e.name}</span>
                        </div>
                      </Td>
                      <Td className="text-muted-foreground">{e.cert}</Td>
                      <Td>{e.assign}</Td>
                      <Td className="font-mono text-xs">{e.hours}</Td>
                      <Td><StatusBadge s={e.status} /></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}

/* ---------------- Small components ---------------- */

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 shadow-card ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-base font-bold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function KpiCard({ label, value, trend, icon: Icon, tone }: any) {
  const up = trend >= 0;
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-card transition hover:shadow-elevated">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-1.5 font-display text-3xl font-bold leading-none tracking-tight">{value}</div>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneBg(tone)}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-xs">
        {up ? <TrendingUp className="h-3.5 w-3.5 text-success" /> : <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
        <span className={`font-semibold ${up ? "text-success" : "text-destructive"}`}>
          {up ? "+" : ""}{trend}%
        </span>
        <span className="text-muted-foreground">vs last month</span>
      </div>
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-accent/5 transition group-hover:bg-accent/10" />
    </div>
  );
}

function toneBg(tone: string) {
  switch (tone) {
    case "success": return "bg-success/10 text-success";
    case "warning": return "bg-warning/15 text-[oklch(0.55_0.13_70)]";
    case "destructive": return "bg-destructive/10 text-destructive";
    case "orange": return "bg-accent/10 text-accent";
    case "navy":
    default: return "bg-primary/10 text-primary";
  }
}

function Badge({ children, tone = "navy" }: { children: ReactNode; tone?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${toneBg(tone)}`}>
      {children}
    </span>
  );
}

function PriorityBadge({ p }: { p: string }) {
  const tone = p === "Critical" ? "destructive" : p === "High" ? "orange" : p === "Medium" ? "warning" : "navy";
  return <Badge tone={tone}>{p}</Badge>;
}

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    "Completed": "success",
    "In Progress": "orange",
    "Open": "navy",
    "Awaiting Parts": "warning",
    "On Shift": "success",
    "On Break": "warning",
  };
  return <Badge tone={map[s] ?? "navy"}>{s}</Badge>;
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-3 py-2.5 font-semibold">{children}</th>;
}
function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-3 py-3 align-middle ${className}`}>{children}</td>;
}

function IconBtn({ children, label, onClick }: { children: ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground/70 hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  );
}

function ProfileMenu({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex items-center gap-2 rounded-md p-1.5 pr-2.5 hover:bg-muted"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-navy text-xs font-semibold text-white">KA</div>
        <div className="hidden text-left sm:block">
          <div className="text-xs font-semibold leading-tight">Kofi Adeyemi</div>
          <div className="text-[10px] text-muted-foreground">Lead Engineer</div>
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-elevated">
          <MenuLink>My Profile</MenuLink>
          <MenuLink>Preferences</MenuLink>
          <MenuLink>API Tokens</MenuLink>
          <div className="my-1 border-t border-border" />
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/5"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({ children }: { children: ReactNode }) {
  return (
    <a href="#" className="block px-3 py-2 text-sm hover:bg-muted">{children}</a>
  );
}
