import type { SVGProps } from "react";

/** Grid of dots forming a stylized circular matrix — NovaSphere logo. */
export function NovaLogo({ size = 40, ...props }: { size?: number } & SVGProps<SVGSVGElement>) {
  // 7x7 dot grid clipped to circle; dots that fall inside the ring are shown
  const N = 7;
  const cell = 1;
  const dots: { cx: number; cy: number; r: number; accent?: boolean }[] = [];
  const cx0 = (N - 1) / 2;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = x - cx0;
      const dy = y - cx0;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= 3.2) {
        dots.push({
          cx: x * cell,
          cy: y * cell,
          r: d < 0.6 ? 0.34 : d < 2.2 ? 0.28 : 0.22,
          accent: dx === 2 && dy === -2, // small red LED at top-right
        });
      }
    }
  }
  return (
    <svg
      viewBox={`-0.6 -0.6 ${(N - 1) + 1.2} ${(N - 1) + 1.2}`}
      width={size}
      height={size}
      aria-label="NovaSphere"
      {...props}
    >
      <circle cx={cx0} cy={cx0} r={3.5} fill="none" stroke="currentColor" strokeWidth="0.06" opacity="0.35" />
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.cx}
          cy={d.cy}
          r={d.r}
          fill={d.accent ? "var(--nova-red)" : "currentColor"}
        />
      ))}
    </svg>
  );
}

/** Cart icon: diagonal line of dots into a horizontal wheel row. */
export function NovaCart({ size = 22, ...props }: { size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden {...props}>
      {/* handle: diagonal line of dots */}
      {[0, 1, 2, 3].map((i) => (
        <circle key={`h${i}`} cx={3 + i * 1.6} cy={4 + i * 1.6} r="0.75" fill="currentColor" />
      ))}
      {/* basket row: horizontal dots */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <circle key={`b${i}`} cx={7 + i * 1.6} cy={13} r="0.9" fill="currentColor" />
      ))}
      {/* wheels */}
      <circle cx="10" cy="19" r="1.5" fill="none" stroke="currentColor" strokeWidth="0.9" />
      <circle cx="17" cy="19" r="1.5" fill="none" stroke="currentColor" strokeWidth="0.9" />
      <circle cx="10" cy="19" r="0.4" fill="currentColor" />
      <circle cx="17" cy="19" r="0.4" fill="currentColor" />
    </svg>
  );
}

/** Search icon: magnifying glass built from nested circles. */
export function NovaSearch({ size = 22, ...props }: { size?: number } & SVGProps<SVGSVGElement>) {
  const cx = 10, cy = 10;
  // ring of small circles
  const ring = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    return { x: cx + Math.cos(a) * 5.5, y: cy + Math.sin(a) * 5.5 };
  });
  // handle dots
  const handle = [0, 1, 2, 3, 4].map((i) => ({
    x: cx + 4.2 + i * 1.4,
    y: cy + 4.2 + i * 1.4,
  }));
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden {...props}>
      <circle cx={cx} cy={cy} r="4" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
      {ring.map((p, i) => (
        <circle key={`r${i}`} cx={p.x} cy={p.y} r="0.75" fill="currentColor" />
      ))}
      {handle.map((p, i) => (
        <circle key={`h${i}`} cx={p.x} cy={p.y} r="0.7" fill="currentColor" />
      ))}
    </svg>
  );
}

/** Dot-matrix text renderer used for tiny badges (renders provided string in tight mono). */
export function DotBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-dot text-[13px] leading-none tracking-widest uppercase">
      {children}
    </span>
  );
}
