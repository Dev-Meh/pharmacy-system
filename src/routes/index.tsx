import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, Mail, Lock, ShieldCheck } from "lucide-react";
import hangar from "@/assets/hangar.jpg";
import { CasLogo } from "@/components/cas/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — Central Aviation Service (CAS)" },
      { name: "description", content: "Secure sign-in to the CAS Aircraft Maintenance Management System." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = "Email address is required.";
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-5">
      {/* Left — hero */}
      <aside className="relative hidden overflow-hidden lg:col-span-3 lg:block">
        <img
          src={hangar}
          alt="CAS aircraft maintenance engineers inspecting a commercial jet engine in a hangar"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary/70 to-primary/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
          <div className="flex items-center justify-between">
            <CasLogo light />
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5 text-white" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/90">EASA · FAA Compliant</span>
            </div>
          </div>

          <div className="max-w-xl text-white">
            <div className="mb-3 inline-block rounded-full bg-accent/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
              Central Aviation Service
            </div>
            <h1 className="font-display text-4xl font-extrabold leading-tight xl:text-5xl">
              Excellence in Aircraft Maintenance &amp; Engineering Solutions
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-white/85 xl:text-base">
              Manage aircraft maintenance, inspections, work orders, inventory and
              compliance from one centralized platform — built for airlines, MROs and
              aviation engineering teams.
            </p>

            <dl className="mt-8 grid grid-cols-3 gap-6 border-t border-white/15 pt-6">
              {[
                ["240+", "Aircraft serviced"],
                ["99.2%", "On-time release"],
                ["24/7", "Hangar operations"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="font-display text-2xl font-bold text-white">{v}</dt>
                  <dd className="text-[11px] uppercase tracking-wider text-white/70">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <p className="text-xs text-white/60">© 2026 Central Aviation Service (CAS). All rights reserved.</p>
        </div>
      </aside>

      {/* Right — form */}
      <main className="relative col-span-1 flex items-center justify-center bg-background px-6 py-10 lg:col-span-2">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-orange lg:hidden" />
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><CasLogo /></div>

          <div className="mb-7">
            <h2 className="font-display text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in to the CAS Maintenance Operations console.
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <Field
              label="Email address"
              icon={<Mail className="h-4 w-4" />}
              error={errors.email}
            >
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="engineer@cas.aero"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              />
            </Field>

            <Field
              label="Password"
              icon={<Lock className="h-4 w-4" />}
              error={errors.password}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            >
              <input
                type={showPwd ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              />
            </Field>

            <div className="flex items-center justify-between pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground/80">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-accent accent-[color:var(--accent)]"
                />
                Remember me
              </label>
              <Link to="/" className="text-sm font-medium text-accent hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-gradient-orange font-semibold text-white shadow-elevated transition hover:brightness-110 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
                </>
              ) : (
                "Sign in to console"
              )}
            </button>

            <p className="pt-4 text-center text-xs text-muted-foreground">
              Protected access · Authorized personnel only
            </p>
          </form>

          <p className="mt-10 text-center text-xs text-muted-foreground lg:hidden">
            © 2026 Central Aviation Service (CAS)
          </p>
        </div>
      </main>
    </div>
  );
}

function Field({
  label, icon, error, trailing, children,
}: {
  label: string;
  icon: React.ReactNode;
  error?: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div
        className={`flex h-11 items-center gap-2.5 rounded-md border bg-card px-3 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 ${
          error ? "border-destructive/60" : "border-border"
        }`}
      >
        <span className="text-muted-foreground">{icon}</span>
        {children}
        {trailing}
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
