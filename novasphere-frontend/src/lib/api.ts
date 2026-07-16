// Centralized API client for NovaSphere.
// Talks to a FastAPI backend at http://localhost:8000, falls back to local
// mock data for the catalog so the preview stays usable without the backend.

export const API_BASE =
  (typeof window !== "undefined" && (window as any).__NOVA_API__) ||
  "http://localhost:8000";

const TOKEN_KEY = "nova.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(t: string | null) {
  if (typeof window === "undefined") return;
  if (t) window.localStorage.setItem(TOKEN_KEY, t);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export type ApiError = { status: number; message: string };

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      
      // 🚀 Tratamento de validação do FastAPI (Pydantic 422)
      // Se j.detail for um array de erros, formatamos para string limpa
      if (Array.isArray(j.detail)) {
        msg = j.detail.map((err: any) => {
          const field = err.loc ? err.loc.filter((l: any) => l !== "body").join(".") : "";
          return field ? `${field}: ${err.msg}` : err.msg;
        }).join(" | ");
      } else if (typeof j.detail === "string") {
        msg = j.detail;
      } else {
        msg = j.message || msg;
      }
    } catch {}
    
    const err: ApiError = { status: res.status, message: msg };
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ── Types ────────────────────────────────────────────────────────────────
export type Product = {
  id: string;
  name: string;
  tagline: string;
  price: number;
  stock: number;
  category: string;
  year: number;
  image?: string;
};

export type CartItem = { product_id: string; quantity: number; product?: Product };
export type Cart = { items: CartItem[]; total: number };
export type AuthResponse = { access_token: string; token_type: string; email?: string };



// ── Mock catalog (fallback when backend is offline) ──────────────────────
export const MOCK_PRODUCTS: Product[] = [
  { id: "wkm-01", name: "Walkman Cassette WM-7", tagline: "Portable magnetic tape unit", price: 189, stock: 12, category: "Audio", year: 1984 },
  { id: "cam-02", name: "Compact Film Camera K3", tagline: "35mm rangefinder", price: 245, stock: 6, category: "Optics", year: 1978 },
  { id: "cal-03", name: "LCD Calculator C-88", tagline: "8-digit solar / dual power", price: 42, stock: 34, category: "Compute", year: 1988 },
  { id: "rad-04", name: "Shortwave Radio SR-90", tagline: "AM / FM / SW multi-band", price: 128, stock: 9, category: "Signal", year: 1990 },
  { id: "wch-05", name: "Digital Watch DW-22", tagline: "Chrono + backlight", price: 76, stock: 21, category: "Time", year: 1986 },
  { id: "gam-06", name: "Handheld Console HC-1", tagline: "Monochrome LCD, 4 games", price: 158, stock: 4, category: "Play", year: 1991 },
  { id: "hph-07", name: "Studio Headphones H-40", tagline: "Closed back, 40mm driver", price: 210, stock: 15, category: "Audio", year: 1982 },
  { id: "tel-08", name: "Rotary Telephone T-500", tagline: "Pulse dial, hardwired", price: 95, stock: 8, category: "Comms", year: 1972 },
];
export type CheckoutResult = {
  message: string;
  order_id: string;
  status: string;
  total_price: number;
};

export type CouponPreview = {
  valid: boolean;
  subtotal: number;
  discount_amount: number;
  total_price: number;
};

// ── Endpoints ────────────────────────────────────────────────────────────
export const api = {
  register: (email: string, password: string) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name: email.split("@")[0] }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  catalog: async (): Promise<Product[]> => {
    try {
      const data = await request<any>("/products");
      if (data && typeof data === "object" && "items" in data) {
        return Array.isArray(data.items) ? data.items : [];
      }
      return Array.isArray(data) ? data : [];
    } catch {
      return MOCK_PRODUCTS;
    }
  },

  getCart: () => request<Cart>("/cart"),

  addToCart: (product_id: string, quantity: number) =>
    request<Cart>("/cart/items", {
      method: "POST",
      body: JSON.stringify({ product_id, quantity }),
    }),

  checkout: (couponCode?: string) =>
    request<CheckoutResult>("/orders/checkout", {
      method: "POST",
      body: JSON.stringify({ coupon_code: couponCode ?? null }),
    }),

  validateCoupon: (couponCode: string) =>
    request<CouponPreview>("/orders/coupons/validate", {
      method: "POST",
      body: JSON.stringify({ coupon_code: couponCode }),
    }),
};
