import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { AuthFrame, Field } from "./login";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Cadastro — NovaSphere" },
      { name: "description", content: "Crie uma conta NovaSphere." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const { register } = useStore();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await register(email, pw);
      toast.success("Conta criada com sucesso");
      nav({ to: "/" });
    } catch (err: any) {
      toast.error(err?.message ?? "Falha no cadastro — servidor indisponível");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame title="Cadastro" caption="Crie sua identidade NovaSphere.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="E-mail" value={email} onChange={setEmail} type="email" placeholder="voce@nova.sphere" />
        <Field label="Senha" value={pw} onChange={setPw} type="password" placeholder="Mínimo de 6 caracteres" />
        <button
          disabled={busy}
          className="snap-btn h-11 rounded-full bg-foreground text-background text-xs uppercase tracking-[0.22em] font-medium disabled:opacity-60"
        >
          {busy ? "Criando…" : "Criar conta"}
        </button>
        <p className="text-xs text-center text-muted-foreground">
          Já possui conta?{" "}
          <Link to="/login" className="underline underline-offset-4 hover:text-foreground">Entrar</Link>
        </p>
      </form>
    </AuthFrame>
  );
}