import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { ProductCard } from "@/components/ProductCard";
import { DotBadge, NovaLogo } from "@/components/icons/NovaIcons";

export const Route = createFileRoute("/")({
  component: CatalogPage,
});

function CatalogPage() {
  const { products, productsLoading } = useStore();
  const [filter, setFilter] = useState<string>("All");

  const categories = useMemo(() => {
    const s = new Set(products.map((p) => p.category));
    return ["All", ...Array.from(s)];
  }, [products]);

  const visible = filter === "All" ? products : products.filter((p) => p.category === filter);

  return (
    <div className="mx-auto max-w-7xl px-5">
      {/* Hero */}
      <section className="pt-14 pb-10 grid-frame corner-ticks mt-8 p-8 md:p-14 relative overflow-hidden">
        <div className="absolute top-4 right-6 flex items-center gap-2">
          <span className="led-dot" />
          <DotBadge>Live · Signal 01</DotBadge>
        </div>

        <div className="grid md:grid-cols-[1fr_auto] items-center gap-8">
          <div>
            <DotBadge>Series 004 / Retro-Future</DotBadge>
            <h1 className="mt-4 font-display text-5xl md:text-7xl font-bold tracking-tight leading-[0.95]">
              Objects <br />
              from a <span className="text-nova-red">softer</span> future.
            </h1>
            <p className="mt-5 max-w-lg text-sm md:text-base text-muted-foreground">
              NovaSphere is a curated catalog of industrial-grade retro electronics —
              tape units, calculators, rangefinders — restored, indexed, and shipped.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <a href="#catalog" className="snap-btn h-11 px-6 rounded-full bg-foreground text-background text-xs uppercase tracking-[0.22em] font-medium grid place-items-center">
                Browse catalog
              </a>
              <span className="font-dot text-xs text-muted-foreground uppercase tracking-widest">
                {products.length} units in stock
              </span>
            </div>
          </div>

          <div className="hidden md:flex flex-col items-center justify-center p-6 rounded-full glass w-64 h-64 relative">
            <NovaLogo size={140} className="text-foreground" />
            <span className="absolute bottom-6 font-dot text-[11px] uppercase tracking-widest text-muted-foreground">
              NS · Glyph
            </span>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section id="catalog" className="mt-14 flex items-center justify-between gap-4">
        <div>
          <DotBadge>Catalog</DotBadge>
          <h2 className="font-display text-2xl font-semibold mt-1">Units in circulation</h2>
        </div>
        <div className="flex flex-wrap gap-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`snap-btn h-8 px-3 rounded-full text-[11px] uppercase tracking-[0.2em] border ${
                filter === c
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      {/* Grid */}
      <section className="mt-6 mb-20 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {productsLoading && Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="grid-frame corner-ticks p-4 aspect-[3/4] animate-pulse" />
        ))}
        {visible.map((p) => <ProductCard key={p.id} product={p} />)}
      </section>
    </div>
  );
}
