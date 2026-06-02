import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Menu, X, Music2, VolumeX } from "lucide-react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
          Return home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong on our end.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Try again</button>
          <a href="/" className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent/10">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PHM-ARCC Iyumbu Church — A Place of Faith, Hope and Worship" },
      { name: "description", content: "Welcome to PHM-ARCC Iyumbu Church. Join our community of faith in worship, prayer and outreach in the Iyumbu area." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

const NAV = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/events", label: "Events" },
  { to: "/contact", label: "Contact" },
] as const;

function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { location } = useRouterState();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || !isHome;

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${solid ? "bg-background/90 backdrop-blur-md shadow-soft" : "bg-transparent"}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-10">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-gold text-primary-foreground shadow-soft">
            <span className="font-display text-lg font-bold text-primary">✝</span>
          </div>
          <div className={`leading-tight ${solid ? "text-foreground" : "text-white"}`}>
            <div className="font-display text-base font-bold">PHM-ARCC</div>
            <div className="text-[10px] uppercase tracking-[0.18em] opacity-80">Iyumbu Church</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${solid ? "text-foreground/80 hover:text-primary" : "text-white/90 hover:text-white"}`}
              activeProps={{ className: "!text-gold" }}
              activeOptions={{ exact: true }}
            >
              {n.label}
            </Link>
          ))}
          <Link to="/contact" className="ml-3 rounded-full bg-gradient-gold px-5 py-2 text-sm font-semibold text-primary shadow-soft transition hover:brightness-105">
            Visit Us
          </Link>
        </nav>

        <button className={`md:hidden ${solid ? "text-foreground" : "text-white"}`} onClick={() => setOpen((s) => !s)} aria-label="Toggle menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/50 bg-background/95 backdrop-blur md:hidden">
          <nav className="flex flex-col px-5 py-3">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="rounded-md px-3 py-3 text-sm font-medium text-foreground/80 hover:bg-muted" activeProps={{ className: "!text-gold" }} activeOptions={{ exact: true }}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 bg-primary text-primary-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-3 lg:px-10">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-gold">
              <span className="font-display text-lg font-bold text-primary">✝</span>
            </div>
            <div>
              <div className="font-display text-lg">PHM-ARCC Iyumbu</div>
              <div className="text-[11px] uppercase tracking-widest opacity-70">A place of faith</div>
            </div>
          </div>
          <p className="mt-4 text-sm text-primary-foreground/75">
            “For where two or three are gathered in my name, there am I among them.” — Matthew 18:20
          </p>
        </div>
        <div>
          <h4 className="font-display text-base text-gold">Visit</h4>
          <p className="mt-3 text-sm text-primary-foreground/80">
            Iyumbu Area, Dodoma<br/>Tanzania, East Africa
          </p>
        </div>
        <div>
          <h4 className="font-display text-base text-gold">Worship Times</h4>
          <ul className="mt-3 space-y-1.5 text-sm text-primary-foreground/80">
            <li>Sunday Service — 9:00 AM</li>
            <li>Midweek Prayer — Wed 6:00 PM</li>
            <li>Youth Fellowship — Fri 5:00 PM</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-6 py-5 text-center text-xs text-primary-foreground/60 lg:px-10">
        © {new Date().getFullYear()} PHM-ARCC Iyumbu Church. All rights reserved.
      </div>
    </footer>
  );
}

function MusicToggle() {
  const [on, setOn] = useState(false);
  return (
    <button
      onClick={() => setOn((s) => !s)}
      className="fixed bottom-5 right-5 z-40 grid h-12 w-12 place-items-center rounded-full bg-gradient-gold text-primary shadow-warm transition hover:scale-105"
      aria-label={on ? "Mute background music" : "Play soft gospel music"}
      title={on ? "Mute" : "Play soft gospel music"}
    >
      {on ? <Music2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
    </button>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Header />
      <main className="min-h-screen">
        <Outlet />
      </main>
      <Footer />
      <MusicToggle />
    </QueryClientProvider>
  );
}
