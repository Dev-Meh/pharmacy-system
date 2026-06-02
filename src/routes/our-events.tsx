import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Clock, MapPin } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/our-events")({
  head: () => ({
    meta: [
      { title: "Events — PHM-ARCC Iyumbu Church" },
      { name: "description", content: "Upcoming services, prayer meetings, youth programs and revivals at PHM-ARCC Iyumbu Church." },
      { property: "og:title", content: "Upcoming Events — PHM-ARCC Iyumbu" },
      { property: "og:description", content: "Join our weekly services and special gatherings." },
    ],
  }),
  component: Events,
});

type EventCard = {
  tag: string;
  title: string;
  date: string;
  time: string;
  place: string;
  desc: string;
  poster?: string | null;
};

// Django public events feed. Same origin in production; VITE_API_BASE in dev.
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || "";
const EVENTS_API = `${API_BASE}/events/api/public/`;

type ApiEvent = {
  id: number;
  title: string;
  description: string;
  tag: string;
  start: string | null;
  end: string | null;
  location: string;
  frequency: string;
  is_recurring: boolean;
  poster: string | null;
};

function formatDate(iso: string | null, recurring: boolean, freq: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (recurring) {
    if (freq === "weekly") return `Every ${d.toLocaleDateString("en-US", { weekday: "long" })}`;
    if (freq === "monthly") return "Monthly";
    if (freq === "yearly") return "Yearly";
  }
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function formatTime(startIso: string | null, endIso: string | null): string {
  if (!startIso) return "";
  const opt: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const s = new Date(startIso).toLocaleTimeString("en-US", opt);
  if (!endIso) return s;
  const e = new Date(endIso).toLocaleTimeString("en-US", opt);
  return `${s} – ${e}`;
}

function toCard(ev: ApiEvent): EventCard {
  return {
    tag: ev.tag || "Event",
    title: ev.title,
    date: formatDate(ev.start, ev.is_recurring, ev.frequency),
    time: formatTime(ev.start, ev.end),
    place: ev.location,
    desc: ev.description,
    poster: ev.poster,
  };
}

// Shown before live data loads, and as a fallback if the system has no events yet.
const FALLBACK_EVENTS: EventCard[] = [
  { tag: "Worship", title: "Sunday Worship Service", date: "Every Sunday", time: "9:00 AM – 12:00 PM", place: "Main Sanctuary", desc: "Spirit-filled praise, prayer and Word-based teaching for the whole family." },
  { tag: "Prayer", title: "Midweek Prayer Meeting", date: "Every Wednesday", time: "6:00 PM – 7:30 PM", place: "Prayer Hall", desc: "An intercessory gathering for the church, our community and the nation." },
  { tag: "Youth", title: "Youth Fellowship Night", date: "Every Friday", time: "5:00 PM – 7:00 PM", place: "Youth Centre", desc: "Worship, mentorship and fellowship for teenagers and young adults." },
];

function Events() {
  const [events, setEvents] = useState<EventCard[]>(FALLBACK_EVENTS);

  useEffect(() => {
    let active = true;
    fetch(EVENTS_API, { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { events: ApiEvent[] }) => {
        if (active && Array.isArray(data.events) && data.events.length > 0) {
          setEvents(data.events.map(toCard));
        }
      })
      .catch(() => {
        /* keep fallback events */
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <section className="relative pt-32 pb-16">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-secondary/60 to-background" />
        <div className="mx-auto max-w-5xl px-6 text-center lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-earth">Upcoming gatherings</p>
          <h1 className="mt-4 font-display text-5xl text-primary md:text-6xl">Events & Services</h1>
          <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">
            Mark your calendar and join us as we worship, pray and serve together throughout the year.
          </p>
        </div>
      </section>

      <section className="px-6 pb-24 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
          {events.map((e, i) => (
            <article key={`${e.title}-${i}`} className="group relative overflow-hidden rounded-3xl border border-border bg-card p-7 shadow-soft transition hover:-translate-y-1 hover:shadow-warm">
              <div className="absolute right-6 top-6">
                <span className="rounded-full bg-gradient-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">{e.tag}</span>
              </div>
              <h3 className="pr-20 font-display text-2xl text-primary">{e.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{e.desc}</p>

              {e.poster && (
                <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-muted/30">
                  <img src={e.poster} alt={`${e.title} poster`} className="mx-auto max-h-80 w-full object-contain" loading="lazy" />
                </div>
              )}

              <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
                {e.date && <div className="flex items-center gap-2.5 text-foreground/80"><Calendar className="h-4 w-4 text-gold" /> {e.date}</div>}
                {e.time && <div className="flex items-center gap-2.5 text-foreground/80"><Clock className="h-4 w-4 text-gold" /> {e.time}</div>}
                {e.place && <div className="flex items-center gap-2.5 text-foreground/80"><MapPin className="h-4 w-4 text-gold" /> {e.place}</div>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
