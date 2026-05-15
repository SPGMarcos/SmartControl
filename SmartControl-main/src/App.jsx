import React, { Suspense } from "react";
import { BrowserRouter as Router, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/SupabaseAuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "@/components/ui/toaster";
import AppRoutes from "@/routes/routes";
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

function App() {
  return (
    <ThemeProvider>
      <Router basename={routerBaseName}>
        <AuthProvider>
          <AuthActionRedirect />
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
