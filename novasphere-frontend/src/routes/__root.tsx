import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { StoreProvider } from "../lib/store";
import { Header } from "../components/Header";
import { CartSidebar } from "../components/CartSidebar";
import { NovaLogo } from "../components/icons/NovaIcons";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <NovaLogo size={64} className="mx-auto mb-6" />
        <h1 className="font-dot text-6xl">404</h1>
        <p className="mt-2 text-sm text-muted-foreground uppercase tracking-widest">
          Signal not found
        </p>
        <Link
          to="/"
          className="mt-6 inline-block h-10 leading-10 px-5 rounded-full bg-foreground text-background text-xs uppercase tracking-[0.22em] snap-btn"
        >
          Return to catalog
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <span className="led-dot mx-auto mb-4" />
        <h1 className="font-display text-xl font-semibold">System interruption</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page didn't load. Try again.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="h-10 px-5 rounded-full bg-foreground text-background text-xs uppercase tracking-[0.22em] snap-btn"
          >
            Retry
          </button>
          <a href="/" className="h-10 leading-10 px-5 rounded-full border border-border text-xs uppercase tracking-[0.22em] snap-btn">
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "NovaSphere — Retro-Future Electronics" },
      { name: "description", content: "NovaSphere sells curated retro-futuristic electronics: Walkmans, calculators, cameras and more. Industrial design, transparent interfaces, clinical precision." },
      { property: "og:title", content: "NovaSphere — Retro-Future Electronics" },
      { property: "og:description", content: "Curated retro-futuristic electronics with an industrial, transparent interface." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=VT323&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            <Outlet />
          </main>
          <footer className="border-t border-border">
            <div className="mx-auto max-w-7xl px-5 py-8 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <NovaLogo size={28} />
                <span className="font-dot text-xs uppercase tracking-widest text-muted-foreground">
                  NovaSphere / v1.0 / signal ok
                </span>
              </div>
              <p className="font-dot text-xs uppercase tracking-widest text-muted-foreground">
                © {new Date().getFullYear()} — Assembled with clinical care
              </p>
            </div>
          </footer>
          <CartSidebar />
          <Toaster position="bottom-right" toastOptions={{ style: { fontFamily: "var(--font-sans)" } }} />
        </div>
      </StoreProvider>
    </QueryClientProvider>
  );
}
