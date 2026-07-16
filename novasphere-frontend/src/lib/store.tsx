import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getToken, setToken, type Cart, type CartItem, type Product, MOCK_PRODUCTS } from "./api";

type AuthState = { email: string | null; token: string | null };

type StoreCtx = {
  auth: AuthState;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;

  products: Product[];
  productsLoading: boolean;

  cart: Cart;
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (p: Product, qty?: number) => Promise<void>;
  setQty: (product_id: string, qty: number) => void;
  removeItem: (product_id: string) => void;
  clearCart: () => void;
  // 🚀 CORREÇÃO AQUI: A interface agora aceita o cupom opcional
  checkout: (couponCode?: string) => Promise<{ order_id: string; total: number }>;
};

const Ctx = createContext<StoreCtx | null>(null);

function calcTotal(items: CartItem[], products: Product[]) {
  return items.reduce((sum, it) => {
    const p = it.product ?? products.find((x) => x.id === it.product_id);
    return sum + (p ? p.price * it.quantity : 0);
  }, 0);
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ email: null, token: null });
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [productsLoading, setProductsLoading] = useState(true);
  const [cart, setCart] = useState<Cart>({ items: [], total: 0 });
  const [cartOpen, setCartOpen] = useState(false);

  // Hydrate token + email + local cart on mount
  useEffect(() => {
    const token = getToken();
    const email = typeof window !== "undefined" ? localStorage.getItem("nova.email") : null;
    
    if (token) {
      setAuth({ email, token });
      try {
        // Só restaura o carrinho local se houver um usuário autenticado ativo
        const raw = typeof window !== "undefined" ? localStorage.getItem("nova.cart") : null;
        if (raw) {
          const items: CartItem[] = JSON.parse(raw);
          setCart({ items, total: 0 });
        }
      } catch {}
    }
  }, []);

  // Load catalog
  useEffect(() => {
    let alive = true;
    api.catalog().then((list) => {
      if (!alive) return;

      // BLINDAGEM MÁXIMA: Garante que o estado seja estritamente um Array
      if (Array.isArray(list)) {
        setProducts(list);
      } else {
        console.warn("A API retornou dados em um formato inesperado:", list);
        setProducts([]);
      }
      
      setProductsLoading(false);
    }).catch(() => {
      if (!alive) return;
      setProducts(MOCK_PRODUCTS); // Fallback para os mocks se a API falhar
      setProductsLoading(false);
    });
    return () => { alive = false; };
  }, []);

  // Try to pull server cart if authenticated
  useEffect(() => {
    if (!auth.token) return;
    api.getCart().then((c) => setCart(c)).catch(() => {});
  }, [auth.token]);

  // Recompute totals + persist local cart
  useEffect(() => {
    const total = calcTotal(cart.items, products);
    if (total !== cart.total) setCart((c) => ({ ...c, total }));
    if (typeof window !== "undefined" && auth.token) {
      // Só persiste o carrinho no localStorage se estiver logado
      localStorage.setItem("nova.cart", JSON.stringify(cart.items));
    }
  }, [cart.items, products, auth.token]); // eslint-disable-line

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.login(email, password);
    setToken(r.access_token);
    if (typeof window !== "undefined") localStorage.setItem("nova.email", email);
    setAuth({ email, token: r.access_token });
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const r = await api.register(email, password);
    setToken(r.access_token);
    if (typeof window !== "undefined") localStorage.setItem("nova.email", email);
    setAuth({ email, token: r.access_token });
  }, []);

  // Limpa o token, e-mail, estado do carrinho e o localStorage correspondente
  const logout = useCallback(() => {
    setToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("nova.email");
      localStorage.removeItem("nova.cart");
    }
    setCart({ items: [], total: 0 }); // Esvazia o carrinho visualmente
    setAuth({ email: null, token: null });
  }, []);

  const addToCart = useCallback(async (p: Product, qty = 1) => {
    // Impede adicionar itens se não estiver logado
    if (!auth.token) {
      alert("Please log in to add items to your cart.");
      return;
    }

    setCart((c) => {
      const existing = c.items.find((it) => it.product_id === p.id);
      const items = existing
        ? c.items.map((it) => it.product_id === p.id ? { ...it, quantity: it.quantity + qty } : it)
        : [...c.items, { product_id: p.id, quantity: qty, product: p }];
      return { items, total: c.total };
    });
    setCartOpen(true);
    try { await api.addToCart(p.id, qty); } catch {}
  }, [auth.token]);

  const setQty = useCallback((product_id: string, qty: number) => {
    if (!auth.token) return;

    setCart((c) => ({
      ...c,
      items: qty <= 0
        ? c.items.filter((it) => it.product_id !== product_id)
        : c.items.map((it) => it.product_id === product_id ? { ...it, quantity: qty } : it),
    }));
  }, [auth.token]);

  const removeItem = useCallback((product_id: string) => {
    if (!auth.token) return;

    setCart((c) => ({ ...c, items: c.items.filter((it) => it.product_id !== product_id) }));
  }, [auth.token]);

  const clearCart = useCallback(() => {
    setCart({ items: [], total: 0 });
    if (typeof window !== "undefined") {
      localStorage.removeItem("nova.cart");
    }
  }, []);

  const refreshProducts = useCallback(async () => {
    const list = await api.catalog(); // Busca direto da fonte
    setProducts(list);
}, []);

  // 🚀 CORREÇÃO AQUI: Recebe o couponCode e repassa para api.checkout
  const checkout = useCallback(async (couponCode?: string) => {
    // Sem token, o checkout não prossegue sob nenhuma hipótese
    if (!auth.token) {
      throw new Error("You must be logged in to checkout.");
    }
    
    // Repassa a variável em vez de chamar vazio
    const r = await api.checkout(couponCode);
    clearCart();
    await refreshProducts();
    return r;
  }, [auth.token, clearCart, refreshProducts]);

  const value = useMemo<StoreCtx>(() => ({
    auth, login, register, logout,
    products, productsLoading,
    cart, cartOpen,
    openCart: () => setCartOpen(true),
    closeCart: () => setCartOpen(false),
    addToCart, setQty, removeItem, clearCart, checkout, refreshProducts,
  }), [auth, login, register, logout, products, productsLoading, cart, cartOpen, addToCart, setQty, removeItem, clearCart, checkout, refreshProducts]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used within StoreProvider");
  return v;
}