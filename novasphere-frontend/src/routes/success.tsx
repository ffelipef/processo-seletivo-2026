import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { DotBadge, NovaLogo } from "@/components/icons/NovaIcons";

const searchSchema = z.object({
  order: z.string().optional(),
  total: z.coerce.number().optional(),
});

export const Route = createFileRoute("/success")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Order confirmed — NovaSphere" },
      { name: "description", content: "Your NovaSphere order has been received." },
    ],
  }),
  component: SuccessPage,
});

function SuccessPage() {
  const { order = "NS-000000", total = 0 } = Route.useSearch();
  const now = new Date();
  const stamp = now.toISOString().replace("T", " ").slice(0, 19);

  return (
    <div className="mx-auto max-w-lg px-5 py-16">
      <div className="grid-frame corner-ticks p-8 relative bg-card">
        {/* Perforated top */}
        <div
          className="absolute -top-2 left-0 right-0 h-4"
          style={{
            background:
              "radial-gradient(circle at 8px 8px, var(--background) 4px, transparent 5px) repeat-x",
            backgroundSize: "16px 16px",
          }}
        />
        <div className="text-center">
          <NovaLogo size={52} className="mx-auto" />
          <p className="mt-3 font-dot text-xs uppercase tracking-widest text-muted-foreground">
            NovaSphere · Receipt
          </p>
          <h1 className="mt-6 font-display text-3xl font-semibold">Order confirmed</h1>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="led-dot" />
            <DotBadge>Transmission complete</DotBadge>
          </div>
        </div>

        <div className="mt-8 border-t border-dashed border-border pt-6 space-y-2 text-sm">
          <Row label="Order ID" value={order} />
          <Row label="Timestamp" value={stamp} />
          <Row label="Method" value="Card · **** 4242" />
          <Row label="Status" value="Queued for dispatch" />
        </div>

        <div className="mt-6 border-t border-dashed border-border pt-6 flex items-baseline justify-between">
          <span className="font-dot text-xs uppercase tracking-widest text-muted-foreground">Total charged</span>
          <span className="font-dot text-4xl">${Number(total).toFixed(2)}</span>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          A confirmation has been transmitted. Track fulfilment from your account.
        </p>

        <Link
          to="/"
          className="snap-btn mt-6 block text-center h-11 leading-[44px] rounded-full border border-foreground text-xs uppercase tracking-[0.22em] font-medium hover:bg-foreground hover:text-background"
        >
          Continue browsing
        </Link>

        {/* Perforated bottom */}
        <div
          className="absolute -bottom-2 left-0 right-0 h-4"
          style={{
            background:
              "radial-gradient(circle at 8px 8px, var(--background) 4px, transparent 5px) repeat-x",
            backgroundSize: "16px 16px",
          }}
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono-tight">{value}</span>
    </div>
  );
}
