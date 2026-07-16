import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { DotBadge } from "@/components/icons/NovaIcons";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — NovaSphere" },
      { name: "description", content: "Finalize your NovaSphere order." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { cart, products, auth, checkout } = useStore();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discountPreview, setDiscountPreview] = useState<number | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    const code = couponInput.toUpperCase();
    setCouponLoading(true);
    try {
      const preview = await api.validateCoupon(code);
      setAppliedCoupon(code);
      setDiscountPreview(preview.discount_amount);
      toast.success(`Cupom ${code} aplicado: -$${preview.discount_amount.toFixed(2)}`);
    } catch (err: any) {
      setAppliedCoupon(null);
      setDiscountPreview(null);
      toast.error(err.message || "Cupom inválido.");
    } finally {
      setCouponLoading(false);
    }
  };

  const estimatedTotal = cart.total - (discountPreview ?? 0);

  async function onCheckout() {
    if (cart.items.length === 0) {
      toast.error("Seu carrinho está vazio!");
      return;
    }
    setBusy(true);
    try {
      const res = await checkout(appliedCoupon || undefined);
      const discount = cart.total - res.total_price;

      if (discount > 0.01) {
        toast.success(
          `Pedido #${res.order_id.substring(0, 8)} criado. Desconto: -$${discount.toFixed(2)} · Total: $${res.total_price.toFixed(2)}`
        );
      } else {
        toast.success(`Pedido #${res.order_id.substring(0, 8)} criado com status PENDENTE.`);
      }

      nav({ to: "/success", search: { orderId: res.order_id } });
    } catch (err: any) {
      console.error("Erro no checkout:", err);
      toast.error(err.message || "Erro no checkout ou cupom inválido.");
      setAppliedCoupon(null);
      setDiscountPreview(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-12">
      <div className="flex items-center justify-between">
        <div>
          <DotBadge>Checkout / Terminal 01</DotBadge>
          <h1 className="font-display text-3xl font-semibold mt-1">Review & confirm</h1>
        </div>
        <span className="font-dot text-xs text-muted-foreground">
          {auth.email ? `AUTH: ${auth.email}` : "GUEST SESSION"}
        </span>
      </div>

      <div className="mt-8 grid md:grid-cols-[1fr_360px] gap-6">
        <div className="grid-frame corner-ticks p-6">
          {cart.items.length === 0 ? (
            <div className="text-center py-16">
              <span className="led-dot mx-auto mb-3" />
              <p className="font-dot text-xl">NO UNITS QUEUED</p>
              <Link to="/" className="text-xs underline underline-offset-4 mt-3 inline-block">
                Return to catalog
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="pb-2 font-dot text-[11px] tracking-widest text-muted-foreground uppercase">Unit</th>
                  <th className="pb-2 font-dot text-[11px] tracking-widest text-muted-foreground uppercase text-right">Qty</th>
                  <th className="pb-2 font-dot text-[11px] tracking-widest text-muted-foreground uppercase text-right">Line</th>
                </tr>
              </thead>
              <tbody>
                {cart.items.map((it) => {
                  const p = it.product ?? products.find((x) => x.id === it.product_id);
                  if (!p) return null;
                  return (
                    <tr key={it.product_id} className="border-b border-border/60">
                      <td className="py-3">
                        <p className="font-medium">{p.name}</p>
                      </td>
                      <td className="py-3 text-right font-dot">{it.quantity.toString().padStart(2, "0")}</td>
                      <td className="py-3 text-right font-dot">${(p.price * it.quantity).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <aside className="grid-frame corner-ticks p-6 h-fit sticky top-24">
          <DotBadge>Summary</DotBadge>
          <div className="mt-4 space-y-2 text-sm">
            <Row label="Subtotal" value={`$${cart.total.toFixed(2)}`} />
            <Row label="Shipping" value="Included" />
            {discountPreview !== null && (
              <Row label="Discount" value={`-$${discountPreview.toFixed(2)}`} />
            )}
          </div>

          <div className="mt-6 border-t border-border pt-4">
            <label className="text-xs uppercase tracking-widest text-muted-foreground mb-2 block">Discount Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="PROMO2026"
                className="w-full bg-transparent border border-border p-2 text-sm outline-none focus:border-nova-red"
              />
              <button
                onClick={handleApplyCoupon}
                disabled={couponLoading}
                className="px-3 border border-border hover:bg-white/10 text-xs uppercase transition-colors disabled:opacity-50"
              >
                {couponLoading ? "..." : "Apply"}
              </button>
            </div>
            {appliedCoupon && discountPreview !== null && (
              <p className="text-nova-red mt-2 text-[11px] uppercase tracking-wider">
                [{appliedCoupon}] -${discountPreview.toFixed(2)} applied
              </p>
            )}
          </div>

          <div className="border-t border-border mt-4 pt-4 flex items-baseline justify-between">
            <span className="font-dot text-xs uppercase tracking-widest text-muted-foreground">Est. Total</span>
            <span className="font-dot text-3xl">${estimatedTotal.toFixed(2)}</span>
          </div>

          <button
            disabled={busy || cart.items.length === 0}
            onClick={onCheckout}
            className="snap-btn mt-6 w-full h-11 rounded-full bg-foreground text-background text-xs uppercase tracking-[0.22em] font-medium hover:bg-nova-red disabled:opacity-50 disabled:pointer-events-none transition-colors"
          >
            {busy ? "Processing…" : "Confirm order"}
          </button>
        </aside>
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