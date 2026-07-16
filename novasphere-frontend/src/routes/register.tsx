import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { toast } from "sonner";
import { AuthFrame, Field } from "./login";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register — NovaSphere" },
      { name: "description", content: "Create a NovaSphere account." },
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
      toast.success("Account created");
      nav({ to: "/" });
    } catch (err: any) {
      toast.error(err?.message ?? "Register failed — backend unavailable");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame title="Register" caption="Provision a NovaSphere identity.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="you@nova.sphere" />
        <Field label="Password" value={pw} onChange={setPw} type="password" placeholder="Minimum 6 characters" />
        <button
          disabled={busy}
          className="snap-btn h-11 rounded-full bg-foreground text-background text-xs uppercase tracking-[0.22em] font-medium disabled:opacity-60"
        >
          {busy ? "Provisioning…" : "Create account"}
        </button>
        <p className="text-xs text-center text-muted-foreground">
          Already registered?{" "}
          <Link to="/login" className="underline underline-offset-4 hover:text-foreground">Sign in</Link>
        </p>
      </form>
    </AuthFrame>
  );
}
