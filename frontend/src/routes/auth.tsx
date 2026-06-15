import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Stethoscope, Mail, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { login as apiLogin } from "@/lib/api/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import heroImg from "@/assets/pharmacy-hero.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — MehMediCore Pharmacy" },
      { name: "description", content: "Sign in to MehMediCore Pharmacy Management System." },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().min(1, "Enter your email or username").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading, setSession } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const parsed = loginSchema.safeParse(form);
      if (!parsed.success) {
        toast.error(parsed.error.issues[0].message);
        return;
      }
      const { user: me, tokens } = await apiLogin(parsed.data.email, parsed.data.password);
      setSession(me, tokens);
      toast.success("Welcome back!");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Visual side */}
      <div className="relative hidden lg:block">
        <img src={heroImg} alt="Modern pharmacy interior" className="absolute inset-0 h-full w-full object-cover" width={1600} height={1200} />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary/60 to-accent/70" />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 text-primary-foreground">
          <div className="flex items-center gap-2.5">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 backdrop-blur">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <div className="font-display text-xl font-bold">MehMediCore</div>
              <div className="text-[11px] uppercase tracking-widest opacity-80">Pharmacy Management</div>
            </div>
          </div>
          <div className="max-w-md">
            <h2 className="font-display text-4xl font-bold leading-tight">Care that runs on clarity.</h2>
            <p className="mt-4 text-base text-white/85">
              Manage drugs, stock, sales, and your team — all from one secure dashboard.
            </p>
          </div>
          <div className="text-xs text-white/70">© {new Date().getFullYear()} MehMediCore Pharmacy Systems</div>
        </div>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center bg-background px-6 py-10">
        <div className="w-full max-w-md animate-fade-in">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-lg font-bold">MehMediCore</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Pharmacy</div>
            </div>
          </div>

          <h1 className="font-display text-3xl font-bold">Welcome back</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to your pharmacy dashboard.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            <Field label="Email or username" icon={<Mail className="h-4 w-4" />}>
              <Input type="text" value={form.email} onChange={update("email")} placeholder="you@pharmacy.com or your username" autoComplete="username" required />
            </Field>
            <Field label="Password" icon={<Lock className="h-4 w-4" />}>
              <Input type="password" value={form.password} onChange={update("password")} placeholder="••••••••" autoComplete="current-password" required minLength={6} />
            </Field>

            <Button type="submit" disabled={submitting} className="h-11 w-full bg-gradient-primary text-base font-semibold shadow-card hover:opacity-95">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>
        <div className="[&_input]:h-11 [&_input]:pl-9">{children}</div>
      </div>
    </div>
  );
}
