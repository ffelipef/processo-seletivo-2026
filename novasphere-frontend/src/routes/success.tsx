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
      { name: "description", content: "Veja o status do seu pedido na NovaSphere e simule o pagamento." },
    ],
  }),
  component: SuccessPage,
});

function SuccessPage() {
  const { orderId } = Route.useSearch();
  const navigate = useNavigate();
  const { clearCart } = useStore();

  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);

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

  const handleSimulatePayment = async (simulatedResult: 'success' | 'fail') => {
    if (!orderId) return;

    setIsSimulatingPayment(true);
    try {
      const response: PaymentSimulationResponse = await api.simulatePayment(orderId, simulatedResult);
      
      setOrder((prevOrder) => prevOrder ? { ...prevOrder, status: response.new_status, updated_at: new Date().toISOString() } : null);

      if (response.new_status === 'paid') {
        toast.success(`Pagamento Aprovado! Pedido #${orderId.substring(0, 8)}.`);
        clearCart();
      } else if (response.new_status === 'failed' || response.new_status === 'canceled') {
        toast.error(`Pagamento falhou. Pedido #${orderId.substring(0, 8)} foi cancelado e o estoque devolvido.`);
      }
    } catch (error) {
      console.error("Erro ao simular pagamento:", error);
      const errorMessage = (error as ApiError)?.message || "Ocorreu um erro na simulação de pagamento.";
      toast.error(errorMessage);
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-theme(spacing.16))] p-4 text-white">
        <Loader2 className="h-10 w-10 animate-spin text-nova-red" />
        <p className="mt-4 text-lg font-dot">Carregando detalhes do pedido...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-5 py-16 text-center">
        <h1 className="font-display text-3xl font-semibold text-nova-red">Pedido Não Encontrado</h1>
        <p className="mt-2 text-muted-foreground">Não foi possível carregar as informações do pedido.</p>
        <Link to="/" className="snap-btn mt-6 inline-block">
          Voltar para o Catálogo
        </Link>
      </div>
    );
  }

  const isPending = order.status === 'pending';
  const isPaid = order.status === 'paid';
  const isFailedOrCancelled = order.status === 'failed' || order.status === 'canceled';

  const getStatusDisplay = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'Aguardando Pagamento';
      case 'paid': return 'Pagamento Aprovado!';
      case 'failed': return 'Pagamento Falhou';
      case 'canceled': return 'Pedido Cancelado';
      default: return 'Status Desconhecido';
    }
  };

  const getStatusColorClass = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'text-yellow-500';
      case 'paid': return 'text-green-500';
      case 'failed':
      case 'canceled': return 'text-nova-red';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'paid': return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-green-500 mx-auto animate-bounce-custom" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
      case 'failed':
      case 'canceled': return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-nova-red mx-auto animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
      case 'pending':
      default: return <Loader2 className="h-24 w-24 text-yellow-500 mx-auto animate-spin" />;
    }
  };

  return (
    <div className="mx-auto max-w-lg px-5 py-16">
      <div className="grid-frame corner-ticks p-8 relative bg-card">
        {/* Perforated top */}
        <div
          className="absolute -top-2 left-0 right-0 h-4"
          style={{
            background: "radial-gradient(circle at 8px 8px, var(--background) 4px, transparent 5px) repeat-x",
            backgroundSize: "16px 16px",
          }}
        />

        <div className="text-center">
          {getStatusIcon(order.status)}
          <h1 className={`mt-6 font-display text-3xl font-semibold ${getStatusColorClass(order.status)}`}>
            {getStatusDisplay(order.status)}
          </h1>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span className="led-dot" />
            <DotBadge>Pedido ID: {order.id.substring(0, 8)}</DotBadge>
          </div>
        </div>

        <div className="mt-8 border-t border-dashed border-border pt-6 space-y-2 text-sm">
          <Row label="Total do Pedido" value={`$${Number(order.total_price).toFixed(2)}`} />
          <Row label="Data do Pedido" value={new Date(order.created_at).toLocaleString()} />
          <Row label="Última Atualização" value={new Date(order.updated_at).toLocaleString()} />
          <Row label="Status" value={getStatusDisplay(order.status)} className={getStatusColorClass(order.status)} />
        </div>

        {isPending && (
          <div className="mt-8 border-t border-dashed border-border pt-6 space-y-4">
            <h3 className="font-display text-xl font-semibold text-purple-400 text-center">Simular Pagamento</h3>
            <p className="text-center text-sm text-muted-foreground">Escolha o resultado da simulação para prosseguir:</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => handleSimulatePayment('success')}
                disabled={isSimulatingPayment}
                className="snap-btn bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSimulatingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin inline-block" /> : null}
                [ Pagamento Aprovado ]
              </button>
              <button
                onClick={() => handleSimulatePayment('fail')}
                disabled={isSimulatingPayment}
                className="snap-btn bg-nova-red hover:bg-red-700 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSimulatingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin inline-block" /> : null}
                [ Cancelar / Falha ]
              </button>
            </div>
            <p className="mt-3 text-[11px] text-center text-muted-foreground">
              Atenção: Esta é uma simulação. Em produção, este processo seria automático e seguro.
            </p>
          </div>
        )}

        <Link
          to="/"
          className="snap-btn mt-6 block text-center h-11 leading-[44px] rounded-full border border-foreground text-xs uppercase tracking-[0.22em] font-medium hover:bg-foreground hover:text-background"
        >
          {isFailedOrCancelled ? 'Reabrir Carrinho / Novo Pedido' : 'Continuar Comprando'}
        </Link>

        {/* Perforated bottom */}
        <div
          className="absolute -bottom-2 left-0 right-0 h-4"
          style={{
            background: "radial-gradient(circle at 8px 8px, var(--background) 4px, transparent 5px) repeat-x",
            backgroundSize: "16px 16px",
          }}
        />
      </div>
      
      {/* Confetes para PAID */}
      {isPaid && (
          <style dangerouslySetInnerHTML={{__html: `
              @keyframes fall {
                0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
                100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
              }
              .confetti {
                position: fixed;
                width: 8px;
                height: 8px;
                background-color: hsl(var(--nova-red));
                border-radius: 50%;
                animation: fall 3s ease-out forwards;
                opacity: 0;
                pointer-events: none;
                z-index: 9999;
              }
              .confetti:nth-child(2n) { background-color: yellow; }
              .confetti:nth-child(3n) { background-color: purple; }
              .confetti:nth-child(4n) { background-color: cyan; }
              ${Array.from({ length: 50 }).map((_, i) => `
                .confetti:nth-child(${i + 1}) {
                  left: ${Math.random() * 100}vw;
                  animation-delay: ${Math.random() * 2}s;
                  animation-duration: ${2 + Math.random() * 2}s;
                  transform: scale(${0.5 + Math.random()});
                }
              `).join('')}
          `}} />
      )}
      {isPaid && Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="confetti" style={{ animationDelay: `${Math.random() * 3}s` }}></div>
      ))}
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