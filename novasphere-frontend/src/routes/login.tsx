import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { DotBadge, NovaLogo } from "@/components/icons/NovaIcons";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — NovaSphere" },
      { name: "description", content: "Entre na sua conta NovaSphere." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login } = useStore();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, pw);
      toast.success("Login efetuado com sucesso");
      nav({ to: "/" });
    } catch (err: any) {
      toast.error(err?.message ?? "Falha no login — servidor indisponível");
    } finally {
      setBusy(false);
    }
  }

  return <AuthFrame title="Entrar" caption="Autentique-se para sincronizar sua sessão.">
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="E-mail" value={email} onChange={setEmail} type="email" placeholder="voce@nova.sphere" />
      <Field label="Senha" value={pw} onChange={setPw} type="password" placeholder="••••••••" />
      <button
        disabled={busy}
        className="snap-btn h-11 rounded-full bg-foreground text-background text-xs uppercase tracking-[0.22em] font-medium disabled:opacity-60"
      >
        {busy ? "Conectando…" : "Entrar"}
      </button>
      <p className="text-xs text-center text-muted-foreground">
        Sem conta?{" "}
        <Link to="/register" className="underline underline-offset-4 hover:text-foreground">Cadastre-se</Link>
      </p>
    </form>
  </AuthFrame>;
}

export function AuthFrame({ title, caption, children }: { title: string; caption: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <div className="grid-frame corner-ticks p-8 relative">
        <div className="absolute top-4 right-6 flex items-center gap-2">
          <span className="led-dot" />
          <DotBadge>Seguro</DotBadge>
        </div>
        <NovaLogo size={44} className="mx-auto mb-4" />
        <h1 className="text-center font-display text-2xl font-semibold">{title}</h1>
        <p className="text-center text-xs text-muted-foreground mt-1">{caption}</p>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label, value, onChange, type = "text", placeholder,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-dot text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <input
        required
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 px-4 rounded-full border border-border bg-card focus:outline-none focus:border-foreground focus:ring-2 focus:ring-foreground/10 text-sm"
      />
    </label>
  );
}