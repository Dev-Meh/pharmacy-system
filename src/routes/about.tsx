import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Cross, Globe2, Heart } from "lucide-react";
import community from "@/assets/community.jpg";
import choir from "@/assets/choir.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — PHM-ARCC Iyumbu Church" },
      { name: "description", content: "Our mission, vision and the values that shape PHM-ARCC Iyumbu Church." },
      { property: "og:title", content: "About PHM-ARCC Iyumbu Church" },
      { property: "og:description", content: "Faith, community and outreach in Iyumbu." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <>
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-secondary/60 via-background to-background" />
        <div className="mx-auto max-w-5xl px-6 text-center lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-earth">About Our Church</p>
          <h1 className="mt-4 font-display text-5xl text-primary md:text-6xl">A family rooted in Christ, growing together.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-muted-foreground">
            PHM-ARCC Iyumbu Church is a Spirit-filled African congregation devoted to worship, the Word and works of love. We exist to lead souls to Jesus and to walk together in everyday faith.
          </p>
        </div>
      </section>

      <section className="px-6 pb-20 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2">
          <div className="overflow-hidden rounded-3xl shadow-warm">
            <img src={community} alt="African pastor praying with community under acacia tree at sunset" className="h-full w-full object-cover" loading="lazy" width={1600} height={1100} />
          </div>
          <div className="space-y-8">
            <div>
              <h2 className="font-display text-3xl text-primary">Our Mission</h2>
              <p className="mt-3 text-muted-foreground">
                To proclaim the Gospel of Jesus Christ with boldness and compassion — discipling believers and serving the Iyumbu community through prayer, teaching and acts of mercy.
              </p>
            </div>
            <div>
              <h2 className="font-display text-3xl text-primary">Our Vision</h2>
              <p className="mt-3 text-muted-foreground">
                A thriving, Christ-centred community where every person discovers their God-given purpose and reflects His light across Africa and beyond.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-secondary/40 px-6 py-20 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-earth">What we value</p>
            <h2 className="mt-3 font-display text-4xl text-primary">Our core values</h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BookOpen, title: "Scripture", body: "The Bible is our compass for life and worship." },
              { icon: Cross, title: "Christ-Centred", body: "Jesus is the source of our hope and salvation." },
              { icon: Heart, title: "Unity & Love", body: "We are one family, one body, one Spirit." },
              { icon: Globe2, title: "Outreach", body: "Carrying God’s love to our neighbours." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl bg-card p-7 shadow-soft">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-gold text-primary"><Icon className="h-5 w-5" /></div>
                <h3 className="mt-4 font-display text-xl text-primary">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-24 lg:px-10">
        <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-earth">Spiritual growth</p>
            <h2 className="mt-3 font-display text-4xl text-primary">Programs that nurture the soul.</h2>
            <p className="mt-4 text-muted-foreground">
              From children’s ministry to women’s and men’s fellowships, every program is shaped to help you grow deeper in Christ and stronger in community.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm">
              {["Discipleship & Bible Study", "Children & Youth Ministry", "Choir & Worship Team", "Community Outreach & Mercy Works"].map((x) => (
                <li key={x} className="flex items-center gap-3"><span className="h-2 w-2 rounded-full bg-gold" />{x}</li>
              ))}
            </ul>
          </div>
          <div className="overflow-hidden rounded-3xl shadow-warm">
            <img src={choir} alt="Church choir worshipping" className="h-full w-full object-cover" loading="lazy" width={1400} height={1000} />
          </div>
        </div>
      </section>
    </>
  );
}
