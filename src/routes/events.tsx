import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Clock, MapPin } from "lucide-react";

export const Route = createFileRoute("/events")({
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

const EVENTS = [
  { tag: "Worship", title: "Sunday Worship Service", date: "Every Sunday", time: "9:00 AM – 12:00 PM", place: "Main Sanctuary", desc: "Spirit-filled praise, prayer and Word-based teaching for the whole family." },
  { tag: "Prayer", title: "Midweek Prayer Meeting", date: "Every Wednesday", time: "6:00 PM – 7:30 PM", place: "Prayer Hall", desc: "An intercessory gathering for the church, our community and the nation." },
  { tag: "Youth", title: "Youth Fellowship Night", date: "Every Friday", time: "5:00 PM – 7:00 PM", place: "Youth Centre", desc: "Worship, mentorship and fellowship for teenagers and young adults." },
  { tag: "Revival", title: "Annual Revival Crusade", date: "October 18 – 20, 2026", time: "5:00 PM nightly", place: "Iyumbu Open Grounds", desc: "Three nights of revival preaching, healing and worship under the African sky." },
  { tag: "Outreach", title: "Community Outreach Day", date: "Saturday, July 11, 2026", time: "8:00 AM – 2:00 PM", place: "Iyumbu Village", desc: "Food distribution, free medical check-ups and Gospel sharing." },
  { tag: "Children", title: "Sunday School Special", date: "Sunday, August 2, 2026", time: "10:00 AM", place: "Children’s Hall", desc: "A morning of storytelling, songs and creative learning for our little ones." },
];

function Events() {
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
          {EVENTS.map((e) => (
            <article key={e.title} className="group relative overflow-hidden rounded-3xl border border-border bg-card p-7 shadow-soft transition hover:-translate-y-1 hover:shadow-warm">
              <div className="absolute right-6 top-6">
                <span className="rounded-full bg-gradient-gold px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">{e.tag}</span>
              </div>
              <h3 className="pr-20 font-display text-2xl text-primary">{e.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{e.desc}</p>

              <div className="mt-6 space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex items-center gap-2.5 text-foreground/80"><Calendar className="h-4 w-4 text-gold" /> {e.date}</div>
                <div className="flex items-center gap-2.5 text-foreground/80"><Clock className="h-4 w-4 text-gold" /> {e.time}</div>
                <div className="flex items-center gap-2.5 text-foreground/80"><MapPin className="h-4 w-4 text-gold" /> {e.place}</div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
