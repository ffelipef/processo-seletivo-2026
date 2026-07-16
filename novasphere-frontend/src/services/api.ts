export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

// --- Gerenciamento de Token ---
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nova.token");
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("nova.token", token);
  } else {
    localStorage.removeItem("nova.token");
  }
}

export interface ApiError {
  status: number;
  message: string;
}

// --- Wrapper Genérico de Fetch ---
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
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

// --- Tipagem de Domínio (Schemas) ---

// 🚀 Adicionado 'shipped' e 'delivered' à máquina de estados
export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'failed' | 'canceled';

export interface Token {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  image_url: string;
  is_retro: boolean;
}

export interface CartItemResponse {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  product_name: string;
  product_image: string;
  subtotal: number;
  product?: Product; // Útil para persistência local no store
}

export interface CartResponse {
  items: CartItemResponse[];
  total: number;
}

// Aliases para compatibilidade com o store.ts
export type CartItem = CartItemResponse;
export type Cart = CartResponse;

export interface CheckoutResponse {
  message: string;
  order_id: string;
  status: OrderStatus;
  total_price: number;
}

export interface OrderItemResponse {
  id: string;
  product_id: string | null;
  price_at_purchase: number;
  quantity: number;
  subtotal: number;
  product_name?: string;
  product_image?: string;
}

export interface OrderResponse {
  id: string;
  user_id: string;
  total_price: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  items: OrderItemResponse[];
}

export interface PaymentSimulationResponse {
  message: string;
  order_id: string;
  new_status: OrderStatus;
}

// Mock fallback caso o backend esteja indisponível
export const MOCK_PRODUCTS: Product[] = [];

// --- Objeto de API Unificado ---
export const api = {
  // Autenticação
  login: (email: string, password: string) => 
    request<Token>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
    
  register: (email: string, password: string) => 
    request<UserResponse>('/auth/register', {
      method: 'POST',
      // Deriva o nome do email antes do @ para simplificar, se não for passado explicitamente
      body: JSON.stringify({ name: email.split('@')[0], email, password }), 
    }),

  // Catálogo
  catalog: () => request<Product[]>('/products'),

  // Carrinho
  getCart: () => request<CartResponse>('/cart'),
  
  addToCart: (product_id: string, quantity: number) => 
    request<CartItemResponse>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ product_id, quantity }),
    }),
    
  updateCartItemQuantity: (itemId: string, quantity: number) => 
    request<CartItemResponse>(`/cart/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    }),
    
  removeCartItem: (itemId: string) => 
    request<void>(`/cart/items/${itemId}`, {
      method: 'DELETE',
    }),

  // Checkout
  checkout: (couponCode?: string) => 
    request<CheckoutResponse>('/orders/checkout', {
      method: 'POST',
      body: JSON.stringify(couponCode ? { coupon_code: couponCode } : {}),
    }),

  // Pedidos e Máquina de Estados
  getOrder: (id: string) => 
    request<OrderResponse>(`/orders/${id}`),

  cancelOrder: (id: string) => 
    request<OrderResponse>(`/orders/${id}/cancel`, { 
      method: "POST" 
    }),

  simulatePayment: (id: string, status: 'success' | 'fail') => 
    request<PaymentSimulationResponse>(`/orders/${id}/simulate-payment`, {
      method: "POST",
      body: JSON.stringify({ status }),
    }),

  updateOrderStatusAdmin: (id: string, newStatus: OrderStatus) => 
    // Usando query params baseados no comportamento do seu log do FastAPI anterior
    request<OrderResponse>(`/orders/${id}/status?new_status=${newStatus}`, { 
      method: "PATCH" 
    })
};