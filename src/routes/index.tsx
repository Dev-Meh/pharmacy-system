import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, HeartHandshake, Sparkles, Users } from "lucide-react";
import { useState, useEffect } from "react";
import hero from "@/assets/worship-hero.jpg";
import choir from "@/assets/choir.jpg";
import bible from "@/assets/bible.jpg";
import community from "@/assets/community.jpg";
import outdoorWorship from "@/assets/outdoor-worship.jpg";
import pastorPreaching from "@/assets/pastor-preaching.jpg";
import prayerCircle from "@/assets/prayer-circle.jpg";
import baptism from "@/assets/baptism.jpg";

const HERO_IMAGES = [
  { src: hero, alt: "African congregation worshipping with raised hands inside a sunlit church" },
  { src: outdoorWorship, alt: "Outdoor African worship gathering at golden hour with raised hands" },
  { src: choir, alt: "Joyful African church choir in traditional robes singing praises" },
  { src: pastorPreaching, alt: "African pastor preaching passionately on stage to congregation" },
  { src: community, alt: "African church community gathered together in fellowship" },
  { src: prayerCircle, alt: "African children and families praying together in a sunlit church" },
  { src: baptism, alt: "Baptism ceremony at a river at golden hour surrounded by congregation" },
  { src: bible, alt: "Open Bible with warm golden light representing God's word" },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PHM-ARCC Iyumbu Church — A Place of Faith, Hope and Worship" },
      { name: "description", content: "Welcome to PHM-ARCC Iyumbu Church. Join us in worship, prayer and Christian fellowship." },
      { property: "og:title", content: "PHM-ARCC Iyumbu Church" },
      { property: "og:description", content: "A Place of Faith, Hope and Worship." },
    ],
  }),
  component: Home,
});

function HeroSlideshow() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative h-screen min-h-[640px] w-full overflow-hidden">
      {/* Background images with crossfade */}
      <div className="absolute inset-0">
        {HERO_IMAGES.map(({ src, alt }, i) => (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out ${
              i === current ? "opacity-100" : "opacity-0"
            }`}
          >
            <img
              src={src}
              alt={alt}
              className="h-full w-full object-cover animate-slow-zoom"
              width={1920}
              height={1280}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent" />
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-20 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {HERO_IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === current ? "w-8 bg-gold" : "w-1.5 bg-white/40 hover:bg-white/60"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-6 text-center text-white">
        <span className="animate-float-up rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] backdrop-blur">
          ✦ PHM-ARCC Iyumbu Church ✦
        </span>
        <h1 className="mt-6 animate-float-up font-display text-4xl leading-[1.1] sm:text-5xl md:text-6xl lg:text-7xl" style={{ animationDelay: "0.15s" }}>
          Welcome to a Place of <span className="text-gold italic">Faith, Hope</span> and Worship
        </h1>
        <p className="mt-6 max-w-2xl animate-float-up text-base text-white/85 sm:text-lg" style={{ animationDelay: "0.3s" }}>
          “Trust in the Lord with all your heart, and lean not on your own understanding;<br className="hidden md:block" /> in all your ways acknowledge Him, and He shall direct your paths.” — Proverbs 3:5–6
        </p>
        <div className="mt-10 flex animate-float-up flex-wrap items-center justify-center gap-3" style={{ animationDelay: "0.45s" }}>
          <Link to="/our-events" className="group inline-flex items-center gap-2 rounded-full bg-gradient-gold px-7 py-3.5 text-sm font-semibold text-primary shadow-warm transition hover:scale-[1.03]">
            Join Us in Worship
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link to="/about" className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/5 px-7 py-3.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/15">
            Our Story
          </Link>
        </div>
      </div>

      {/* scroll cue */}
      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-white/70">
        <div className="mx-auto h-10 w-6 rounded-full border-2 border-white/40 p-1">
          <div className="mx-auto h-2 w-1 animate-bounce rounded-full bg-white/80" />
        </div>
      </div>
    </section>
  );
}

function Home() {
  return (
    <>
      <HeroSlideshow />

      {/* PILLARS */}
      <section className="bg-background px-6 py-24 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-earth">Our calling</p>
            <h2 className="mt-3 font-display text-4xl text-primary md:text-5xl">Built on faith. Bound by love.</h2>
            <p className="mt-4 text-muted-foreground">
              We are a vibrant African congregation rooted in scripture, devoted to prayer and committed to the people of Iyumbu.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { icon: Sparkles, title: "Spiritual Growth", body: "Bible study, discipleship and Spirit-led teaching every week." },
              { icon: Users, title: "Loving Community", body: "A welcoming family across generations, tribes and tongues." },
              { icon: HeartHandshake, title: "Outreach & Mercy", body: "Serving widows, orphans and our neighbours in Iyumbu." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="group rounded-2xl border border-border bg-card p-8 shadow-soft transition hover:-translate-y-1 hover:shadow-warm">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-gold text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-2xl text-primary">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SPLIT */}
      <section className="bg-secondary/40 px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-3xl shadow-warm">
            <img src={choir} alt="Joyful African church choir in traditional robes" className="h-full w-full object-cover" loading="lazy" width={1400} height={1000} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-earth">Sundays at PHM-ARCC</p>
            <h2 className="mt-3 font-display text-4xl text-primary md:text-5xl">Come and worship with us.</h2>
            <p className="mt-5 text-muted-foreground">
              From the rising of the sun to its going down, the name of the Lord is to be praised. Whether you are visiting Iyumbu or searching for a spiritual home, our doors — and our hearts — are open.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-gold" /> Sunday Worship Service · 9:00 AM</li>
              <li className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-gold" /> Midweek Prayer · Wednesday 6:00 PM</li>
              <li className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-gold" /> Youth Fellowship · Friday 5:00 PM</li>
            </ul>
            <Link to="/our-events" className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
              See all events <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* VERSE BANNER */}
      <section className="relative overflow-hidden px-6 py-24 lg:px-10">
        <div className="absolute inset-0">
          <img src={bible} alt="" className="h-full w-full object-cover" loading="lazy" width={1400} height={1000} />
          <div className="absolute inset-0 bg-primary/80" />
        </div>
        <div className="relative mx-auto max-w-3xl text-center text-white">
          <p className="font-display text-3xl italic leading-snug md:text-4xl">
            “I can do all things through Christ who strengthens me.”
          </p>
          <p className="mt-4 text-sm uppercase tracking-[0.25em] text-gold">— Philippians 4:13</p>
        </div>
      </section>
    </>
  );
}
