import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { DotBadge } from "@/components/icons/NovaIcons";
import { toast } from "sonner";
import { checkoutOrder } from '../services/api'; // Importar a função de API diretamente

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
  const { cart, products, auth, clearCart } = useStore(); // Adicionado clearCart do store
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  async function onCheckout() {
    if (cart.items.length === 0) {
      toast.error("Seu carrinho está vazio!");
      return;
    }
    setBusy(true);
    try {
      // Chama a API de checkout diretamente
      const res = await checkoutOrder();
      
      toast.success(`Pedido #${res.order_id.substring(0, 8)} criado com status PENDENTE.`);
      
      // Redireciona para a rota de sucesso com o orderId
      nav({ to: "/success", search: { orderId: res.order_id } }); // Alterado para orderId
      
      // Não limpa o carrinho aqui, a limpeza ocorrerá na página de sucesso se o pagamento for aprovado.

    } catch (err: any) {
      console.error("Erro no checkout:", err);
      const errorMessage = err.response?.data?.detail || err?.message || "Checkout failed";
      toast.error(errorMessage);
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
        {/* Line items */}
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
                        <p className="text-xs text-muted-foreground">{p.tagline}</p>
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

        {/* Summary */}
        <aside className="grid-frame corner-ticks p-6 h-fit sticky top-24">
          <DotBadge>Summary</DotBadge>
          <div className="mt-4 space-y-2 text-sm">
            <Row label="Subtotal" value={`$${cart.total.toFixed(2)}`} />
            <Row label="Shipping" value="Included" />
            <Row label="Tax" value="Calculated at fulfilment" />
          </div>
          <div className="border-t border-border mt-4 pt-4 flex items-baseline justify-between">
            <span className="font-dot text-xs uppercase tracking-widest text-muted-foreground">Total</span>
            <span className="font-dot text-3xl">${cart.total.toFixed(2)}</span>
          </div>
          <button
            disabled={busy || cart.items.length === 0}
            onClick={onCheckout}
            className="snap-btn mt-6 w-full h-11 rounded-full bg-foreground text-background text-xs uppercase tracking-[0.22em] font-medium hover:bg-nova-red disabled:opacity-50 disabled:pointer-events-none"
          >
            {busy ? "Processing…" : "Confirm order"}
          </button>
          {!auth.token && (
            <p className="mt-3 text-[11px] text-center text-muted-foreground">
              <Link to="/login" className="underline">Sign in</Link> to sync your order history.
            </p>
          )}
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
