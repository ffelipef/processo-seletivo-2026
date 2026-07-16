const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("nova.token");
}

export interface ApiError {
  status: number;
  message: string;
}

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

// --- Tipos para o Frontend (Replicando schemas do backend para consistência) ---
// Estes tipos podem ser movidos para um arquivo 'types/api.ts' se o projeto crescer

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'canceled';

// Auth Schemas
export interface Token {
    access_token: string;
    token_type: string;
}

export interface UserResponse {
    id: string; // UUID do backend
    name: string;
    email: string;
    is_admin: boolean;
    created_at: string; // ISO string
}

// Cart Schemas
export interface CartItemAdd {
    product_id: string;
    quantity: number;
}

export interface CartItemResponse {
    id: string;
    product_id: string;
    quantity: number;
    price: number;
    product_name: string;
    product_image: string;
    subtotal: number;
}

export interface CartResponse {
    items: CartItemResponse[];
    total: number;
}

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
    subtotal: number; // Propriedade calculada
    // Adicionar detalhes do produto para exibição no frontend, se o backend retornar
    product_name?: string;
    product_image?: string;
}

export interface OrderResponse {
    id: string;
    user_id: string;
    total_price: number;
    status: OrderStatus;
    created_at: string; // ISO string
    updated_at: string; // ISO string
    items: OrderItemResponse[];
}

export interface PaymentSimulationResponse {
    message: string;
    order_id: string;
    new_status: OrderStatus;
}


// --- Funções de API ---

// Cart
export const getMyCart = async (): Promise<CartResponse> => {
    return request<CartResponse>('/cart');
};

export const addItemToCart = async (item: CartItemAdd): Promise<CartItemResponse> => {
    return request<CartItemResponse>('/cart/items', {
        method: 'POST',
        body: JSON.stringify(item),
    });
};

export const updateCartItemQuantity = async (itemId: string, quantity: number): Promise<CartItemResponse> => {
    return request<CartItemResponse>(`/cart/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
    });
};

export const removeCartItem = async (itemId: string): Promise<void> => {
    return request<void>(`/cart/items/${itemId}`, {
        method: 'DELETE',
    });
};

// Orders
export const checkoutOrder = async (couponCode?: string): Promise<CheckoutResponse> => {
    return request<CheckoutResponse>('/orders/checkout', {
        method: 'POST',
        body: JSON.stringify(couponCode ? { coupon_code: couponCode } : {}),
    });
};

export const api = {
    getOrder: (id: string) => request<any>(`/orders/${id}`),

    simulatePayment: (id: string, status: 'success' | 'fail') =>
        request<any>(`/orders/${id}/simulate-payment`, {
            method: "POST",
            body: JSON.stringify({ status }),
        }),
};

// Autenticação
export const loginUser = async (credentials: any): Promise<Token> => {
    return request<Token>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
    });
};

export const registerUser = async (userData: any): Promise<UserResponse> => {
    return request<UserResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
};

// Outras funções de API (Catálogo, Admin, etc.) seriam adicionadas aqui.
