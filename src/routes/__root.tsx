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
import { Menu, X } from "lucide-react";

import appCss from "../styles.css?url";
import churchLogo from "@/assets/church-logo.jpeg";
import { MusicToggle } from "@/components/MusicToggle";
import { reportLovableError } from "../lib/lovable-error-reporting";

function ChurchLogo({ className = "h-10 w-10" }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`grid place-items-center rounded-full bg-gradient-gold text-primary shadow-soft ${className}`}>
        <span className="font-display text-lg font-bold text-primary">✝</span>
      </div>
    );
  }
  return (
    <img
      src={churchLogo}
      alt="PHM-ARCC Iyumbu Church logo"
      className={`rounded-full object-contain bg-white/95 p-0.5 shadow-soft ${className}`}
      width={40}
      height={40}
      onError={() => setFailed(true)}
    />
  );
}

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
      { property: "og:title", content: "PHM-ARCC Iyumbu Church — A Place of Faith, Hope and Worship" },
      { name: "twitter:title", content: "PHM-ARCC Iyumbu Church — A Place of Faith, Hope and Worship" },
      { property: "og:description", content: "Welcome to PHM-ARCC Iyumbu Church. Join our community of faith in worship, prayer and outreach in the Iyumbu area." },
      { name: "twitter:description", content: "Welcome to PHM-ARCC Iyumbu Church. Join our community of faith in worship, prayer and outreach in the Iyumbu area." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/5e74a230-11b2-400f-8dc0-238b7c8b5cca" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/5e74a230-11b2-400f-8dc0-238b7c8b5cca" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
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
  { to: "/our-events", label: "Events" },
  { to: "/contact", label: "Contact" },
] as const;

// Kiungo cha mfumo wa kanisa (Django).
// Dev: weka VITE_LOGIN_URL=http://127.0.0.1:8000/phm-kuingia-a8f2/ kwenye .env
// Production: lazima iendane na LOGIN_URL_PATH kwenye Django .env
const LOGIN_URL =
  (import.meta.env.VITE_LOGIN_URL as string | undefined) ||
  "/phm-kuingia-a8f2/";

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
          <ChurchLogo className="h-11 w-11 shrink-0" />
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
          <a
            href={LOGIN_URL}
            className={`ml-3 rounded-full border px-5 py-2 text-sm font-semibold transition ${solid ? "border-primary/30 text-primary hover:bg-primary/5" : "border-white/40 text-white hover:bg-white/10"}`}
          >
            Login
          </a>
          <Link to="/contact" className="ml-2 rounded-full bg-gradient-gold px-5 py-2 text-sm font-semibold text-primary shadow-soft transition hover:brightness-105">
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
            <a href={LOGIN_URL} className="mt-1 rounded-md bg-gradient-gold px-3 py-3 text-center text-sm font-semibold text-primary">
              Login
            </a>
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
            <ChurchLogo className="h-11 w-11 shrink-0" />
            <div>
              <div className="font-display text-lg">PHM-ARCC Iyumbu</div>
              <div className="text-[11px] uppercase tracking-widest opacity-70">A place of faith</div>
            </div>
          </div>
          <p className="mt-4 text-sm text-primary-foreground/75">
            «Kwa maana walipo watu wawili au watatu wamekusanyika kwa jina langu, hapo mimi nipo, katikati yao.» — Mathayo 18:20
          </p>
        </div>
        <div>
          <h4 className="font-display text-base text-gold">Visit</h4>
          <a
            href="https://www.google.com/maps/place/PENTECOSTAL+HOLINESS+MISSION+(ARCC-IYUMBU)/@-6.2070453,35.8403981,17.63z/data=!4m6!3m5!1s0x184dfd00040c3531:0x93c36d897a4603cb!8m2!3d-6.2069061!4d35.8399447!16s%2Fg%2F11xnw669yl"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm text-primary-foreground/80 transition hover:text-gold"
          >
            PHM-ARCC, Iyumbu Area, Dodoma<br/>Tanzania, East Africa
            <span className="mt-1 block text-xs text-gold">View on Google Maps →</span>
          </a>
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
