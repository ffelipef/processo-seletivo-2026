import axios from 'axios';

// Configuração base do Axios. Assuma que a URL base é definida via variável de ambiente ou um arquivo de config
// Exemplo: process.env.VITE_API_BASE_URL no Vite ou .env
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'; // Ajuste conforme seu backend
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para adicionar o token JWT
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token'); // Assumindo que o token é armazenado no localStorage
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// --- Tipos para o Frontend (Replicando schemas do backend para consistência) ---
// Estes tipos podem ser movidos para um arquivo 'types/api.ts' se o projeto crescer

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'canceled';

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
    const response = await api.get('/cart');
    return response.data;
};

export const addItemToCart = async (item: CartItemAdd): Promise<CartItemResponse> => {
    const response = await api.post('/cart/items', item);
    return response.data;
};

export const updateCartItemQuantity = async (itemId: string, quantity: number): Promise<CartItemResponse> => {
    const response = await api.put(`/cart/items/${itemId}`, { quantity });
    return response.data;
};

export const removeCartItem = async (itemId: string): Promise<void> => {
    await api.delete(`/cart/items/${itemId}`);
};

// Orders
export const checkoutOrder = async (): Promise<CheckoutResponse> => {
    const response = await api.post('/orders/checkout');
    return response.data;
};

export const getOrderDetails = async (orderId: string): Promise<OrderResponse> => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
};

export const simulatePayment = async (orderId: string, status: 'success' | 'fail'): Promise<PaymentSimulationResponse> => {
    const response = await api.post(`/orders/${orderId}/simulate-payment`, { status });
    return response.data;
};

// Autenticação (Exemplo - ajuste conforme seu AuthService)
export const loginUser = async (credentials: any): Promise<{ access_token: string }> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
};

export const registerUser = async (userData: any): Promise<any> => {
    const response = await api.post('/auth/register', userData);
    return response.data;
};

// Outras funções de API (Catálogo, Admin, etc.) seriam adicionadas aqui.
