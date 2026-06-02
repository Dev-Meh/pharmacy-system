import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Mail, MapPin, Phone, Send, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — PHM-ARCC Iyumbu Church" },
      { name: "description", content: "Reach PHM-ARCC Iyumbu Church. Phone, email, address and map to our location in Iyumbu." },
      { property: "og:title", content: "Contact PHM-ARCC Iyumbu Church" },
      { property: "og:description", content: "We would love to hear from you." },
    ],
  }),
  component: Contact,
});

// Exact church location on Google Maps.
const MAPS_URL =
  "https://www.google.com/maps/place/PENTECOSTAL+HOLINESS+MISSION+(ARCC-IYUMBU)/@-6.2070453,35.8403981,17.63z/data=!4m6!3m5!1s0x184dfd00040c3531:0x93c36d897a4603cb!8m2!3d-6.2069061!4d35.8399447!16s%2Fg%2F11xnw669yl";
const MAPS_EMBED_URL =
  "https://www.google.com/maps?q=-6.2069061,35.8399447&z=16&output=embed";

function Contact() {
  const [sent, setSent] = useState(false);
  const onSubmit = (e: FormEvent) => { e.preventDefault(); setSent(true); };

  return (
    <>
      <section className="relative pt-32 pb-12">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-secondary/60 to-background" />
        <div className="mx-auto max-w-5xl px-6 text-center lg:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-earth">Get in touch</p>
          <h1 className="mt-4 font-display text-5xl text-primary md:text-6xl">We’d love to hear from you</h1>
          <p className="mx-auto mt-5 max-w-2xl text-muted-foreground">
            Whether you have a prayer request, a question, or simply want to visit — please reach out. Our doors are always open.
          </p>
        </div>
      </section>

      <section className="px-6 pb-20 lg:px-10">
        <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-5">
          {/* contact info */}
          <div className="md:col-span-2 space-y-4">
            {[
              { icon: Phone, label: "Phone", value: "0625 953 702", href: "tel:+255625953702", external: false, hint: undefined as string | undefined },
              { icon: Mail, label: "Email", value: "hello@phmarcc-iyumbu.org", href: undefined as string | undefined, external: false, hint: undefined as string | undefined },
              { icon: MapPin, label: "Location", value: "PHM-ARCC, Iyumbu, Dodoma, Tanzania", href: MAPS_URL, external: true, hint: "Open in Google Maps →" },
            ].map(({ icon: Icon, label, value, href, external, hint }) => {
              const Wrapper = href ? "a" : "div";
              return (
                <Wrapper
                  key={label}
                  {...(href ? { href } : {})}
                  {...(href && external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={`flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft ${href ? "transition hover:-translate-y-0.5 hover:shadow-warm" : ""}`}
                >
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-gold text-primary"><Icon className="h-5 w-5" /></div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
                    <div className="mt-0.5 text-foreground">{value}</div>
                    {hint && <div className="mt-0.5 text-xs font-medium text-earth">{hint}</div>}
                  </div>
                </Wrapper>
              );
            })}
          </div>

          {/* form */}
          <form onSubmit={onSubmit} className="md:col-span-3 rounded-3xl border border-border bg-card p-8 shadow-warm">
            <h2 className="font-display text-3xl text-primary">Send us a message</h2>
            <p className="mt-1 text-sm text-muted-foreground">We typically reply within 24 hours.</p>

            {sent ? (
              <div className="mt-8 flex items-center gap-3 rounded-xl bg-secondary/60 p-5 text-primary">
                <CheckCircle2 className="h-6 w-6 text-gold" />
                <div>
                  <div className="font-semibold">Thank you — your message is on its way!</div>
                  <div className="text-sm text-muted-foreground">May God bless you abundantly.</div>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                <Input label="Your name" required placeholder="John Mwakasege" />
                <Input label="Email address" type="email" required placeholder="you@example.com" />
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</label>
                  <textarea required rows={5} placeholder="Share a prayer request or question…" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-[color:var(--gold)]/25" />
                </div>
                <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-gradient-gold px-7 py-3 text-sm font-semibold text-primary shadow-soft transition hover:scale-[1.02]">
                  Send message <Send className="h-4 w-4" />
                </button>
              </div>
            )}
          </form>
        </div>
      </section>

      {/* map */}
      <section className="px-6 pb-24 lg:px-10">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl shadow-warm">
          <iframe
            title="PHM-ARCC Iyumbu Church location map"
            src={MAPS_EMBED_URL}
            className="h-[420px] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    </>
  );
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <input {...props} className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-gold focus:ring-2 focus:ring-[color:var(--gold)]/25" />
    </div>
  );
}
