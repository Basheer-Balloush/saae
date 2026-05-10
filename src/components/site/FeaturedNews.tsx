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

  const sideCards = [
    { key: "a", img: IMG.a, cat: cats.partnership, title: items.a.title, date: items.a.date },
    { key: "b", img: IMG.b, cat: cats.community, title: items.b.title, date: items.b.date },
    { key: "c", img: IMG.c, cat: cats.event, title: items.c.title, date: items.c.date },
  ];
  const recent = [
    { key: "d", img: IMG.d, cat: cats.research, title: items.d.title, date: items.d.date },
    { key: "e", img: IMG.e, cat: cats.community, title: items.e.title, date: items.e.date },
    { key: "f", img: IMG.f, cat: cats.education, title: items.f.title, date: items.f.date },
    { key: "g", img: IMG.g, cat: cats.research, title: items.g.title, date: items.g.date },
  ];

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
            <p className="text-caption text-primary">{t.news.eyebrow}</p>
            <h1 className="mt-4 text-display-2 text-foreground">
              {t.news.title}
            </h1>
            <p className="mt-5 max-w-xl text-body text-muted-foreground">{t.news.subtitle}</p>
          </div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Featured */}
          <motion.a
            href="#"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="group relative col-span-1 overflow-hidden rounded-2xl border border-border bg-card shadow-soft lg:col-span-3"
          >
            <div className="aspect-[16/11] overflow-hidden">
              <img
                src={IMG.featured}
                alt={items.featured.title}
                className="h-full w-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.04]"
                loading="lazy"
              />
            </div>
            <div className="p-7 lg:p-9">
              <div className="flex items-center gap-3 text-xs">
                <span className="rounded-full bg-accent px-3 py-1 font-semibold uppercase tracking-wider text-accent-foreground">
                  {cats.education}
                </span>
                <span className="text-muted-foreground">{items.featured.date}</span>
              </div>
              <h2 className="mt-5 text-h1 text-foreground">
                {items.featured.title}
              </h2>
              <p className="mt-4 max-w-2xl text-body text-muted-foreground">{items.featured.excerpt}</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                {t.news.readMore}
                <ArrowUpRight className={dir === "rtl" ? "h-4 w-4 -scale-x-100" : "h-4 w-4"} />
              </span>
            </div>
          </motion.a>

          {/* Side cards */}
          <div className="col-span-1 flex flex-col gap-6 lg:col-span-2">
            {sideCards.map((c, i) => (
              <motion.a
                key={c.key}
                href="#"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.55, delay: i * 0.08 }}
                className="group flex flex-1 gap-4 rounded-xl border border-border bg-card p-3 shadow-soft transition-shadow hover:shadow-lift"
              >
                <div className="h-28 w-28 flex-none overflow-hidden rounded-lg sm:h-32 sm:w-32">
                  <img src={c.img} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-between py-1">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-secondary">{c.cat}</span>
                    <h3 className="mt-1.5 line-clamp-3 text-[15px] font-bold leading-snug text-foreground group-hover:text-primary">
                      {c.title}
                    </h3>
                  </div>
                  <span className="text-xs text-muted-foreground">{c.date}</span>
                </div>
              </motion.a>
            ))}
          </div>
        </div>

        {/* Recent grid */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
          {recent.map((c, i) => (
            <motion.a
              key={c.key}
              href="#"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.05 }}
              className="group overflow-hidden rounded-xl border border-border bg-card shadow-soft transition-shadow hover:shadow-lift"
            >
              <div className="aspect-[16/10] overflow-hidden">
                <img src={c.img} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" loading="lazy" />
              </div>
              <div className="p-5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-secondary">{c.cat}</span>
                <h3 className="mt-2 line-clamp-3 text-[15px] font-bold leading-snug text-foreground group-hover:text-primary">
                  {c.title}
                </h3>
                <p className="mt-3 text-xs text-muted-foreground">{c.date}</p>
              </div>
            </motion.a>
          ))}
        </div>

        <div className="mt-14 flex justify-center">
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-full border border-primary px-7 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            {t.news.viewAll}
            <ArrowRight className={dir === "rtl" ? "h-4 w-4 -scale-x-100" : "h-4 w-4"} />
          </a>
        </div>
      </div>
    </section>
  );
}
