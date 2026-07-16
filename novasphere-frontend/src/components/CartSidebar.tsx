import { useStore } from "@/lib/store";
import { DotBadge, NovaCart } from "./icons/NovaIcons";
import { Link } from "@tanstack/react-router";
import { Minus, Plus, X } from "lucide-react";

export function CartSidebar() {
  const { cartOpen, closeCart, cart, products, setQty, removeItem } = useStore();
  const cartItems = cart?.items ?? [];

  return (
    <>
      <div
        aria-hidden
        onClick={closeCart}
        className={`fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm transition-opacity duration-200 ${
          cartOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        aria-label="Cart"
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-background border-l border-border shadow-2xl
          transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]
          ${cartOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-3">
            <NovaCart size={22} />
            <div className="flex flex-col leading-tight">
              <span className="font-display font-bold text-sm">Your cart</span>
              <span className="font-dot text-[11px] text-muted-foreground tracking-widest uppercase">
                session / open
              </span>
            </div>
          </div>
          <button
            onClick={closeCart}
            className="h-9 w-9 grid place-items-center rounded-full border border-border snap-btn hover:bg-muted"
            aria-label="Close cart"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3 overflow-y-auto h-[calc(100%-9rem-4rem)]">
          {cartItems.length === 0 && (
            <div className="grid-frame corner-ticks p-6 text-center">
              <span className="led-dot mx-auto mb-3" />
              <p className="font-dot text-lg">CART EMPTY</p>
              <p className="text-xs text-muted-foreground mt-1">Add units from the catalog.</p>
            </div>
          )}
          {cartItems.map((it) => {
            const p = it.product ?? products.find((x) => x.id === it.product_id);
            if (!p) return null;
            return (
              <div key={it.product_id} className="grid-frame p-3 flex gap-3 items-center">
                <div className="h-14 w-14 shrink-0 border border-border bg-muted grid place-items-center font-dot text-[10px] uppercase text-muted-foreground">
                  {p.category?.slice(0, 3) ?? "N/A"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  <p className="font-dot text-sm">${p.price}</p>
                </div>
                <div className="flex items-center gap-1 border border-border rounded-full px-1 py-0.5">
                  <button
                    onClick={() => setQty(it.product_id, it.quantity - 1)}
                    className="h-7 w-7 grid place-items-center rounded-full snap-btn hover:bg-muted"
                    aria-label="Decrease"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="font-dot text-sm w-6 text-center">{it.quantity}</span>
                  <button
                    onClick={() => setQty(it.product_id, it.quantity + 1)}
                    className="h-7 w-7 grid place-items-center rounded-full snap-btn hover:bg-muted"
                    aria-label="Increase"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(it.product_id)}
                  className="text-muted-foreground hover:text-nova-red snap-btn"
                  aria-label="Remove"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-background p-5">
          <div className="flex items-baseline justify-between mb-3">
            <DotBadge>Total</DotBadge>
            <span className="font-dot text-3xl">
              ${typeof cart?.total === 'number' ? cart.total.toFixed(2) : '0.00'}
            </span>
          </div>
          <Link
            to="/checkout"
            onClick={closeCart}
            className={`snap-btn block text-center h-11 leading-[44px] rounded-full text-xs uppercase tracking-[0.22em] font-medium
              ${cartItems.length === 0
                ? "bg-muted text-muted-foreground pointer-events-none"
                : "bg-foreground text-background hover:bg-nova-red"}`}
          >
            Proceed to checkout
          </Link>
        </div>
      </aside>
    </>
  );
}