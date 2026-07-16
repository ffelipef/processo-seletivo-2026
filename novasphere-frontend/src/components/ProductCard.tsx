import { useStore } from "@/lib/store";
import type { Product } from "@/lib/api";
import { DotBadge } from "./icons/NovaIcons";

// Deterministic dot-pattern preview per product (retro CRT vibe).
function ProductGlyph({ seed, name }: { seed: string; name: string }) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const rand = () => ((h = (h * 1664525 + 1013904223) >>> 0) / 0xffffffff);
  const cells = 12;
  const dots: { x: number; y: number; r: number; red?: boolean }[] = [];
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const dx = x - (cells - 1) / 2;
      const dy = y - (cells - 1) / 2;
      const d = Math.sqrt(dx * dx + dy * dy);
      const bias = 1 - d / (cells / 1.4);
      if (rand() < bias * 0.55) {
        const red = rand() < 0.02;
        dots.push({ x, y, r: 0.22 + rand() * 0.18, red });
      }
    }
  }
  return (
    <svg viewBox={`-1 -1 ${cells + 1} ${cells + 1}`} className="w-full h-full">
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={d.r}
          fill={d.red ? "var(--nova-red)" : "currentColor"}
          opacity={d.red ? 1 : 0.82}
        />
      ))}
      <text
        x={cells / 2 - 0.5}
        y={cells - 0.4}
        textAnchor="middle"
        fontSize="0.9"
        fontFamily="var(--font-dot)"
        fill="currentColor"
        opacity="0.5"
      >
        {name.slice(0, 12).toUpperCase()}
      </text>
    </svg>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useStore();
  const low = product.stock <= 6;
  return (
    <article className="group grid-frame corner-ticks p-4 flex flex-col gap-4 hover:bg-card transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${low ? "bg-nova-red" : "bg-foreground"}`} />
          <DotBadge>{product.category}</DotBadge>
        </div>
        <span className="font-dot text-[13px] text-muted-foreground">{product.year}</span>
      </div>

      <div className="aspect-square bg-muted/60 border border-border p-6 text-foreground scanline">
        <ProductGlyph seed={product.id} name={product.name} />
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="font-display text-[15px] font-semibold leading-tight">{product.name}</h3>
        <p className="text-xs text-muted-foreground">{product.tagline}</p>
      </div>

      <div className="flex items-end justify-between pt-1">
        <div className="flex flex-col">
          <span className="font-dot text-[11px] text-muted-foreground tracking-widest">PRICE</span>
          <span className="font-dot text-3xl leading-none">${product.price}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-dot text-[11px] text-muted-foreground tracking-widest">STOCK</span>
          <span className={`font-dot text-lg leading-none ${low ? "text-nova-red" : ""}`}>
            {product.stock.toString().padStart(3, "0")}
          </span>
        </div>
      </div>

      <button
        onClick={() => addToCart(product)}
        className="snap-btn mt-1 h-10 rounded-full border border-foreground bg-foreground text-background text-xs uppercase tracking-[0.22em] font-medium hover:bg-transparent hover:text-foreground"
      >
        Add to cart
      </button>
    </article>
  );
}
