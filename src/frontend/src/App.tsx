import { Toaster } from "@/components/ui/sonner";
import { InternetIdentityProvider } from "@caffeineai/core-infrastructure";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CrossGameAlert } from "./components/CrossGameAlert";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import Admin from "./pages/Admin";
import Game from "./pages/Game";
import JoinByToken from "./pages/JoinByToken";
import Lobby from "./pages/Lobby";
import Login, { LoginModal } from "./pages/Login";
import Stats from "./pages/Stats";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 2, staleTime: 1000 } },
});

// ─── Loading splash ─────────────────────────────────────────────────────────
const TILES = ["W", "O", "R", "D", "U", "E", "L"];

function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [flipped, setFlipped] = useState<boolean[]>(TILES.map(() => false));
  const [done, setDone] = useState(false);

  useEffect(() => {
    TILES.forEach((_, i) => {
      setTimeout(() => {
        setFlipped((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, i * 180);
    });
    const totalDelay = TILES.length * 180 + 600;
    const timer = setTimeout(() => {
      setDone(true);
      setTimeout(onDone, 400);
    }, totalDelay);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-400 ${
        done ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-label="Loading Worduel"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-8">
        <div className="flex gap-2">
          {TILES.map((letter, i) => (
            <div
              key={letter}
              className={`w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center rounded-md border-2 font-display font-black text-xl sm:text-2xl select-none transition-all duration-300 ${
                flipped[i]
                  ? i % 3 === 0
                    ? "tile-correct border-[oklch(0.55_0.18_142)] bg-[oklch(0.55_0.18_142)]"
                    : i % 3 === 1
                      ? "tile-present border-[oklch(0.65_0.15_66)] bg-[oklch(0.65_0.15_66)]"
                      : "bg-muted border-muted-foreground/30 text-foreground"
                  : "bg-card border-border/60 text-foreground"
              }`}
              style={{
                transform: flipped[i] ? "rotateX(0deg)" : "rotateX(90deg)",
                transitionDelay: `${i * 0.05}s`,
              }}
            >
              {letter}
            </div>
          ))}
        </div>
        <div className="text-center space-y-2">
          <p className="font-body text-muted-foreground text-sm animate-pulse">
            Multiplayer Word Game
          </p>
        </div>
        <LoadingSpinner size="sm" />
      </div>
    </div>
  );
}

function AuthModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-background/95 backdrop-blur-sm px-4"
      data-ocid="auth_modal.dialog"
      aria-modal="true"
      aria-label="Sign in or create account"
    >
      <div className="w-full max-w-md">
        <LoginModal onClose={onClose} />
      </div>
    </div>
  );
}

// ─── RootLayout ────────────────────────────────────────────────────────────
//
// ARCHITECTURE CONTRACT — READ BEFORE MODIFYING:
//
// RootLayout is the component for the root TanStack Router route.
// It renders INSIDE <RouterProvider>, meaning:
//   - All TanStack Router hooks (useRouterState, useNavigate, etc.) are SAFE here.
//   - CrossGameAlert (which calls useRouterState) MUST live here, never above.
//
// InternetIdentityProvider and AuthProvider are mounted HERE (inside router)
// so they can never call router hooks before RouterProvider is ready.
// This is the permanent fix for the "Cannot read properties of null (__store)" crash.
//
// DO NOT move InternetIdentityProvider or AuthProvider above RouterProvider.
// DO NOT move CrossGameAlert above RouterProvider.
//
function RootLayout() {
  return (
    <InternetIdentityProvider>
      <AuthProvider>
        <RootApp />
      </AuthProvider>
    </InternetIdentityProvider>
  );
}

function RootApp() {
  const { user } = useAuth();
  const [loadingDone, setLoadingDone] = useState(false);
  const [modalDismissed, setModalDismissed] = useState(false);
  const showModal = loadingDone && !user && !modalDismissed;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Loading splash overlay — pure visual, never blocks RouterProvider */}
      {!loadingDone && <LoadingScreen onDone={() => setLoadingDone(true)} />}

      {/* Auth modal for unauthenticated users after splash */}
      {showModal && <AuthModal onClose={() => setModalDismissed(true)} />}

      {/*
       * CrossGameAlert calls useRouterState() internally.
       * It is SAFE here because RootApp is inside RouterProvider.
       * NEVER move this above <RouterProvider>.
       */}
      {user && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-xl">
          <CrossGameAlert />
        </div>
      )}

      {/* Toaster: always mounted, inside router context */}
      <Toaster
        position="top-center"
        toastOptions={{ className: "font-body text-sm" }}
      />

      {/* Page outlet */}
      <Outlet />
    </div>
  );
}

// ─── Routes ──────────────────────────────────────────────────────────────────
const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/lobby" });
  },
});
const lobbyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/lobby",
  component: Lobby,
});
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Login,
});
const gameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/game/$gameId",
  component: Game,
});
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: Admin,
});
const statsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/stats",
  component: Stats,
});
const joinByTokenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/game/join/$joinToken",
  component: JoinByToken,
});

const router = createRouter({
  routeTree: rootRoute.addChildren([
    indexRoute,
    lobbyRoute,
    loginRoute,
    joinByTokenRoute,
    gameRoute,
    adminRoute,
    statsRoute,
  ]),
  defaultErrorComponent: ({ error }) => (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="text-4xl">⚠️</div>
      <p className="font-display font-bold text-foreground text-xl">
        Something went wrong
      </p>
      <p className="text-muted-foreground font-body text-sm max-w-xs">
        {error instanceof Error ? error.message : String(error)}
      </p>
      <button
        type="button"
        className="btn-primary"
        onClick={() => window.location.reload()}
      >
        Refresh
      </button>
    </div>
  ),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// ─── App entry point ─────────────────────────────────────────────────────────
//
// Final provider hierarchy (outermost → innermost):
//   QueryClientProvider        — React Query cache (no router deps)
//     RouterProvider           — TanStack router context mounts FIRST
//       RootLayout             — root route component (inside router ✓)
//         InternetIdentityProvider  — ICP identity (inside router ✓)
//           AuthProvider            — session/user state (inside router ✓)
//             CrossGameAlert        — useRouterState() safe here ✓
//             Toaster               — inside router ✓
//             Outlet                — page components ✓
//
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
