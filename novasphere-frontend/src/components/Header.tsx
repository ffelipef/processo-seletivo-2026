import { Link, useRouterState } from "@tanstack/react-router";
import { NovaLogo, NovaCart, NovaSearch, DotBadge } from "./icons/NovaIcons";
import { useStore } from "@/lib/store";

export function Header() {
  const { cart, openCart, auth, logout } = useStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const count = cart.items.reduce((n, it) => n + it.quantity, 0);

  const link = (to: string, label: string) => {
    const active = pathname === to;
    return (
      <Link
        to={to}
        className={`px-2 py-1 text-xs uppercase tracking-[0.18em] font-medium snap-btn ${
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 glass">
      <div className="mx-auto max-w-7xl px-5 h-16 flex items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-3 snap-btn">
          <NovaLogo size={36} className="text-foreground" />
          <div className="flex flex-col leading-tight">
            <span className="font-display font-bold tracking-tight text-[15px]">NovaSphere</span>
            <span className="font-dot text-[11px] text-muted-foreground tracking-widest uppercase">
              retro / futures
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {link("/", "Catalog")}
          {link("/checkout", "Checkout")}
          {!auth.token ? link("/login", "Sign in") : (
            <button
              onClick={logout}
              className="px-2 py-1 text-xs uppercase tracking-[0.18em] font-medium text-muted-foreground hover:text-foreground snap-btn"
            >
              Sign out
            </button>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <button
            aria-label="Search"
            className="h-10 w-10 grid place-items-center rounded-full border border-border bg-card snap-btn hover:bg-muted"
          >
            <NovaSearch size={20} className="text-foreground" />
          </button>

          <button
            onClick={openCart}
            className="relative h-10 pl-3 pr-4 rounded-full border border-foreground bg-foreground text-background flex items-center gap-2 snap-btn hover:bg-transparent hover:text-foreground"
          >
            <NovaCart size={20} />
            <DotBadge>Cart</DotBadge>
            {count > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-nova-red text-clinical text-[10px] font-mono grid place-items-center border border-background">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
