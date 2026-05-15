import React, { Suspense } from "react";
import { BrowserRouter as Router, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/SupabaseAuthContext";
import { useAuth } from "@/contexts/SupabaseAuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "@/components/ui/toaster";
import AppRoutes, { preloadPrivateRoutes } from "@/routes/routes";
import { getAuthParams, isAuthCallbackPath } from "@/lib/authRedirect";
import LoadingScreen from "@/components/LoadingScreen"; // 👈 importa o loading

const routerBaseName =
  import.meta.env.BASE_URL && import.meta.env.BASE_URL !== '/'
    ? import.meta.env.BASE_URL.replace(/\/$/, '')
    : undefined;

function AuthActionRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const authParams = getAuthParams({ search: location.search, hash: location.hash });
    const isRecoveryFlow =
      searchParams.get('reset_password') === 'true' ||
      authParams.type === 'recovery';
    const isLoginPage = location.pathname.endsWith('/login');
    const isCallbackPage = isAuthCallbackPath(location.pathname);

    if (isRecoveryFlow && !isLoginPage) {
      searchParams.set('reset_password', 'true');
      navigate(`/login?${searchParams.toString()}${location.hash}`, { replace: true });
      return;
    }

    if (authParams.hasAuthSignal && !isRecoveryFlow && !isCallbackPage) {
      navigate(`/auth/callback${location.search}${location.hash}`, { replace: true });
    }
  }, [location.hash, location.pathname, location.search, navigate]);

  return null;
}

function PrivateRoutePrefetcher() {
  const { user, session, loading } = useAuth();
  const didPrefetchRef = React.useRef(false);

  React.useEffect(() => {
    if (didPrefetchRef.current || loading || !user || !session) return;
    didPrefetchRef.current = true;

    const prefetch = () => preloadPrivateRoutes();
    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(prefetch, { timeout: 1200 });
      return () => window.cancelIdleCallback?.(idleId);
    }

    const timeoutId = window.setTimeout(prefetch, 250);
    return () => window.clearTimeout(timeoutId);
  }, [loading, session, user]);

  return null;
}

function App() {
  return (
    <ThemeProvider>
      <Router basename={routerBaseName}>
        <AuthProvider>
          <AuthActionRedirect />
          <PrivateRoutePrefetcher />
          <Suspense fallback={<LoadingScreen />}>
            <AppRoutes />
          </Suspense>
          <Toaster />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
