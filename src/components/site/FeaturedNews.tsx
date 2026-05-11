import { motion } from "framer-motion";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { useLang } from "@/lib/i18n";

const IMG = {
  featured: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80",
  a: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=900&q=80",
  b: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80",
  c: "https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?auto=format&fit=crop&w=900&q=80",
  d: "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=900&q=80",
  e: "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=900&q=80",
  f: "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=900&q=80",
  g: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=900&q=80",
};

export function FeaturedNews() {
  const { t, dir } = useLang();
  const cats = t.news.categories;
  const items = t.news.items;

  const slides = [
    { key: "featured", img: IMG.featured, cat: cats.education, title: items.featured.title, date: items.featured.date },
    { key: "a", img: IMG.a, cat: cats.partnership, title: items.a.title, date: items.a.date },
    { key: "b", img: IMG.b, cat: cats.community, title: items.b.title, date: items.b.date },
    { key: "c", img: IMG.c, cat: cats.event, title: items.c.title, date: items.c.date },
    { key: "d", img: IMG.d, cat: cats.research, title: items.d.title, date: items.d.date },
    { key: "e", img: IMG.e, cat: cats.community, title: items.e.title, date: items.e.date },
    { key: "f", img: IMG.f, cat: cats.education, title: items.f.title, date: items.f.date },
    { key: "g", img: IMG.g, cat: cats.research, title: items.g.title, date: items.g.date },
  ];

  const row = [...slides, ...slides];

  return (
    <section id="news" className="relative pt-32 pb-24 lg:pt-40 lg:pb-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mb-12 flex flex-col gap-4 lg:mb-16 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="max-w-2xl">
            
            <h1 className="mt-4 text-display-2 text-foreground">{t.news.title}</h1>
            <p className="mt-5 max-w-xl text-body text-muted-foreground">{t.news.subtitle}</p>
          </div>
        </motion.div>
      </div>

      <div dir="ltr" className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
        <div className={`flex w-max gap-6 hover:[animation-play-state:paused] ${dir === "rtl" ? "animate-[news-marquee-rtl_60s_linear_infinite]" : "animate-[news-marquee_60s_linear_infinite]"}`}>
          {row.map((c, i) => (
            <a
              key={`${c.key}-${i}`}
              href="#"
              className="group flex w-[320px] flex-none flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-shadow hover:shadow-lift sm:w-[360px]"
            >
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={c.img}
                  alt={c.title}
                  className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.04]"
                  loading="lazy"
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center gap-3 text-xs">
                  <span className="rounded-full bg-accent px-3 py-1 font-semibold uppercase tracking-wider text-accent-foreground">
                    {c.cat}
                  </span>
                  <span className="text-muted-foreground">{c.date}</span>
                </div>
                <h3 className="mt-4 line-clamp-3 text-h3 text-foreground group-hover:text-primary">
                  {c.title}
                </h3>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  {t.news.readMore}
                  <ArrowUpRight className={dir === "rtl" ? "h-4 w-4 -scale-x-100" : "h-4 w-4"} />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-14 flex max-w-7xl justify-center px-6 lg:px-10">
        <a
          href="#"
          className="inline-flex items-center gap-2 rounded-full border border-primary px-7 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          {t.news.viewAll}
          <ArrowRight className={dir === "rtl" ? "h-4 w-4 -scale-x-100" : "h-4 w-4"} />
        </a>
      </div>

      <style>{`
        @keyframes news-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes news-marquee-rtl {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </section>
  );
}
