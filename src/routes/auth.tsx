import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Stethoscope, Mail, Lock, User as UserIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import heroImg from "@/assets/pharmacy-hero.jpg";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — MediCore Pharmacy" },
      { name: "description", content: "Sign in to MediCore Pharmacy Management System." },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

const signupSchema = loginSchema.extend({
  fullName: z.string().trim().min(2, "Full name is required").max(100),
  username: z.string().trim().min(3, "Username must be at least 3 characters").max(50).regex(/^[a-zA-Z0-9_.-]+$/, "Letters, numbers, _ . - only"),
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", username: "", fullName: "" });

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "login") {
        const parsed = loginSchema.safeParse(form);
        if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) { toast.error(error.message); return; }
        toast.success("Welcome back!");
        navigate({ to: "/dashboard", replace: true });
      } else {
        const parsed = signupSchema.safeParse(form);
        if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: parsed.data.fullName, username: parsed.data.username },
          },
        });
        if (error) { toast.error(error.message); return; }
        toast.success("Account created — signing you in…");
        navigate({ to: "/dashboard", replace: true });
      }
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
              <div className="font-display text-xl font-bold">MediCore</div>
              <div className="text-[11px] uppercase tracking-widest opacity-80">Pharmacy Management</div>
            </div>
          </div>
          <div className="max-w-md">
            <h2 className="font-display text-4xl font-bold leading-tight">Care that runs on clarity.</h2>
            <p className="mt-4 text-base text-white/85">
              Manage drugs, stock, sales, and your team — all from one secure dashboard.
            </p>
          </div>
          <div className="text-xs text-white/70">© {new Date().getFullYear()} MediCore Pharmacy Systems</div>
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
              <div className="font-display text-lg font-bold">MediCore</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Pharmacy</div>
            </div>
          </div>

          <h1 className="font-display text-3xl font-bold">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "login" ? "Sign in to your pharmacy dashboard." : "Get started with MediCore in seconds."}
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            {mode === "signup" && (
              <>
                <Field label="Full name" icon={<UserIcon className="h-4 w-4" />}>
                  <Input value={form.fullName} onChange={update("fullName")} placeholder="Jane Doe" autoComplete="name" required />
                </Field>
                <Field label="Username" icon={<UserIcon className="h-4 w-4" />}>
                  <Input value={form.username} onChange={update("username")} placeholder="janedoe" autoComplete="username" required />
                </Field>
              </>
            )}
            <Field label="Email" icon={<Mail className="h-4 w-4" />}>
              <Input type="email" value={form.email} onChange={update("email")} placeholder="you@pharmacy.com" autoComplete="email" required />
            </Field>
            <Field label="Password" icon={<Lock className="h-4 w-4" />}>
              <Input type="password" value={form.password} onChange={update("password")} placeholder="••••••••" autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={6} />
            </Field>

            <Button type="submit" disabled={submitting} className="h-11 w-full bg-gradient-primary text-base font-semibold shadow-card hover:opacity-95">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Sign in" : "Create account"}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              {mode === "login" ? "Don't have an account?" : "Already registered?"}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="font-medium text-primary hover:underline"
              >
                {mode === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>
            {mode === "signup" && (
              <p className="text-center text-[11px] text-muted-foreground">
                The first user to sign up becomes the system administrator.
              </p>
            )}
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary">← Back home</Link>
          </p>
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
