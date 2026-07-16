import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { DotBadge } from "@/components/icons/NovaIcons";
import { useEffect, useState } from "react";
import { api, OrderResponse, OrderStatus, PaymentSimulationResponse, type ApiError } from '../services/api';
import { useStore } from '@/lib/store';
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';

const searchSchema = z.object({
  orderId: z.string().uuid(),
});

export const Route = createFileRoute("/success")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Status do Pedido — NovaSphere" },
      { name: "description", content: "Acompanhe o status do seu pedido." },
    ],
  }),
  component: SuccessPage,
});

function SuccessPage() {
  const { orderId } = Route.useSearch();
  const navigate = useNavigate();
  
  // 🚀 CORREÇÃO: Puxando o refreshProducts da store para atualizar o catálogo imediatamente
  const { clearCart, auth, refreshProducts } = useStore(); 

  // Verifica se o usuário atual é admin para liberar os controles
  const isAdmin = auth?.is_admin || auth?.user?.is_admin === true;

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        toast.error("ID do pedido não encontrado na URL.");
        navigate({ to: '/' });
        return;
      }

      try {
        const fetchedOrder = await api.getOrder(orderId);
        setOrder(fetchedOrder);
      } catch (error) {
        console.error("Erro ao buscar detalhes do pedido:", error);
        const errorMessage = (error as ApiError)?.message || "Não foi possível carregar os detalhes do pedido.";
        toast.error(errorMessage);
        navigate({ to: '/' });
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, navigate]);

  // Ação do Cliente: Cancelar Pedido
  const handleCancelOrder = async () => {
    if (!orderId) return;
    if (!confirm("Tem certeza que deseja cancelar este pedido? O processo não pode ser desfeito.")) return;

    setIsCanceling(true);
    try {
      const updatedOrder = await api.cancelOrder(orderId);
      setOrder(updatedOrder);
      
      // 🚀 CORREÇÃO: Força o frontend a buscar os dados sem cache do backend
      await refreshProducts(); 
      
      toast.success("Pedido cancelado. O estoque foi devolvido com sucesso.");
    } catch (error) {
      toast.error((error as ApiError)?.message || "Erro ao tentar cancelar o pedido.");
    } finally {
      setIsCanceling(false);
    }
  };

  // Ação exclusiva do Admin: Confirmação de Pagamento
  const handlePaymentAdmin = async (simulatedResult: 'success' | 'fail') => {
    if (!orderId) return;
    setIsUpdatingStatus(true);
    try {
      const response: PaymentSimulationResponse = await api.simulatePayment(orderId, simulatedResult);
      setOrder((prevOrder) => prevOrder ? { ...prevOrder, status: response.new_status, updated_at: new Date().toISOString() } : null);
      if (response.new_status === 'paid') {
        toast.success(`Pagamento confirmado! Pedido #${orderId.substring(0, 8)}.`);
        clearCart();
      } else {
        // 🚀 CORREÇÃO: Atualiza a vitrine se o admin falhar o pagamento (estoque volta)
        await refreshProducts();
        toast.error(`Pagamento recusado. Pedido cancelado.`);
      }
    } catch (error) {
      toast.error((error as ApiError)?.message || "Erro ao processar pagamento.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Ação exclusiva do Admin: Avanço de Status (Envio/Entrega)
  const handleUpdateStatusAdmin = async (newStatus: OrderStatus) => {
    if (!orderId) return;
    setIsUpdatingStatus(true);
    try {
      const updatedOrder = await api.updateOrderStatusAdmin(orderId, newStatus);
      setOrder(updatedOrder);
      toast.success(`Status atualizado para: ${newStatus.toUpperCase()}`);
    } catch (error) {
      toast.error((error as ApiError)?.message || "Erro ao atualizar. Sem permissão de Admin?");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.16))] p-4 text-white">
        <Loader2 className="h-10 w-10 animate-spin text-nova-red" />
        <p className="mt-4 text-lg font-dot">Buscando sinal do pedido...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <h1 className="font-display text-3xl font-semibold text-nova-red">Pedido Não Encontrado</h1>
        <p className="mt-2 text-muted-foreground">O sinal deste pedido foi perdido ou você não tem acesso.</p>
        <Link to="/" className="snap-btn mt-6 inline-block">Retornar ao Catálogo</Link>
      </div>
    );
  }

  const isFailedOrCancelled = order.status === 'failed' || order.status === 'canceled';
  const canBeCanceledByUser = order.status === 'pending' || order.status === 'paid';

  const getStatusDisplay = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'Aguardando Pagamento';
      case 'paid': return 'Pagamento Aprovado';
      case 'shipped': return 'Pedido Enviado';
      case 'delivered': return 'Pedido Entregue';
      case 'failed': return 'Pagamento Falhou';
      case 'canceled': return 'Pedido Cancelado';
      default: return 'Status Desconhecido';
    }
  };

  const getStatusColorClass = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'text-yellow-500';
      case 'paid': return 'text-green-500';
      case 'shipped': return 'text-blue-500';
      case 'delivered': return 'text-emerald-400';
      case 'failed':
      case 'canceled': return 'text-nova-red';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="mx-auto max-w-lg px-5 py-16">
      <div className="grid-frame corner-ticks p-8 relative bg-card">
        <div className="absolute -top-2 left-0 right-0 h-4" style={{ background: "radial-gradient(circle at 8px 8px, var(--background) 4px, transparent 5px) repeat-x", backgroundSize: "16px 16px" }} />

        <div className="text-center">
          <h1 className={`mt-6 font-display text-3xl font-semibold ${getStatusColorClass(order.status)}`}>
            {getStatusDisplay(order.status)}
          </h1>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className={`led-dot ${order.status === 'pending' ? 'animate-pulse' : ''}`} />
            <DotBadge>Rastreio: {order.id.substring(0, 8)}</DotBadge>
          </div>
        </div>

        <div className="mt-8 border-t border-dashed border-border pt-6 space-y-2 text-sm">
          <Row label="Total" value={`$${Number(order.total_price).toFixed(2)}`} />
          <Row label="Data" value={new Date(order.created_at).toLocaleString()} />
          <Row label="Atualização" value={new Date(order.updated_at).toLocaleString()} />
        </div>

        {/* PROGRESSÃO VISUAL PARA TODOS OS USUÁRIOS */}
        <div className="mt-8 border-t border-dashed border-border pt-6">
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Progresso na Esteira</h3>
          <div className="flex justify-between items-center text-[10px] font-dot tracking-wider">
            <span className={order.status === 'pending' ? 'text-yellow-500' : 'text-foreground'}>[ 1. PENDENTE ]</span>
            <span className={order.status === 'paid' ? 'text-green-500' : (order.status === 'shipped' || order.status === 'delivered' ? 'text-foreground' : 'text-muted-foreground opacity-30')}>[ 2. PAGO ]</span>
            <span className={order.status === 'shipped' ? 'text-blue-500' : (order.status === 'delivered' ? 'text-foreground' : 'text-muted-foreground opacity-30')}>[ 3. ENVIADO ]</span>
            <span className={order.status === 'delivered' ? 'text-emerald-400' : 'text-muted-foreground opacity-30'}>[ 4. ENTREGUE ]</span>
          </div>
          {isFailedOrCancelled && (
            <p className="text-center text-nova-red mt-4 text-xs uppercase tracking-widest animate-pulse">ESTEIRA INTERROMPIDA</p>
          )}
        </div>

        {/* AÇÃO DO CLIENTE: CANCELAR PEDIDO */}
        {!isAdmin && canBeCanceledByUser && (
          <div className="mt-6 flex justify-center">
             <button 
                onClick={handleCancelOrder} 
                disabled={isCanceling} 
                className="text-xs text-muted-foreground hover:text-nova-red transition-colors underline underline-offset-4 disabled:opacity-50"
              >
                {isCanceling ? 'Cancelando...' : 'Deseja cancelar este pedido?'}
              </button>
          </div>
        )}

        {/* PAINEL DE CONTROLE EXCLUSIVO DO ADMIN */}
        {isAdmin && !isFailedOrCancelled && order.status !== 'delivered' && (
          <div className="mt-8 border-t border-border pt-6 bg-muted/10 -mx-8 px-8 pb-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="led-dot bg-nova-red" />
              <h3 className="font-display text-sm font-semibold text-nova-red uppercase tracking-widest">Override de Admin</h3>
            </div>
            
            <div className="flex flex-col gap-3">
              {order.status === 'pending' && (
                <>
                  <button onClick={() => handlePaymentAdmin('success')} disabled={isUpdatingStatus} className="snap-btn bg-green-600 hover:bg-green-700 disabled:opacity-50 h-10 w-full text-xs">
                    Confirmar Pagamento
                  </button>
                  <button onClick={() => handlePaymentAdmin('fail')} disabled={isUpdatingStatus} className="snap-btn border border-nova-red text-nova-red hover:bg-nova-red hover:text-white disabled:opacity-50 h-10 w-full text-xs">
                    Recusar Pagamento
                  </button>
                </>
              )}
              {order.status === 'paid' && (
                <button onClick={() => handleUpdateStatusAdmin('shipped' as OrderStatus)} disabled={isUpdatingStatus} className="snap-btn bg-blue-600 hover:bg-blue-700 disabled:opacity-50 h-10 w-full text-xs">
                  Avançar para ENVIADO
                </button>
              )}
              {order.status === 'shipped' && (
                <button onClick={() => handleUpdateStatusAdmin('delivered' as OrderStatus)} disabled={isUpdatingStatus} className="snap-btn bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 h-10 w-full text-xs">
                  Avançar para ENTREGUE
                </button>
              )}
            </div>
          </div>
        )}

        <Link to="/" className="snap-btn mt-8 block text-center h-11 leading-[44px] rounded-full border border-foreground text-xs uppercase tracking-[0.22em] font-medium hover:bg-foreground hover:text-background">
          {isFailedOrCancelled ? 'Novo Pedido' : 'Retornar ao Catálogo'}
        </Link>

        <div className="absolute -bottom-2 left-0 right-0 h-4" style={{ background: "radial-gradient(circle at 8px 8px, var(--background) 4px, transparent 5px) repeat-x", backgroundSize: "16px 16px" }} />
      </div>
    </div>
  );
}

function Row({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono-tight ${className}`}>{value}</span>
    </div>
  );
}