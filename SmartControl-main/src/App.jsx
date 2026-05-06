import React, { Suspense } from "react";
import { BrowserRouter as Router, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/SupabaseAuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "@/components/ui/toaster";
import AppRoutes from "@/routes/routes";
import LoadingScreen from "@/components/LoadingScreen"; // 👈 importa o loading

const routerBaseName =
  import.meta.env.BASE_URL && import.meta.env.BASE_URL !== '/'
    ? import.meta.env.BASE_URL.replace(/\/$/, '')
    : undefined;

function PasswordRecoveryRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(location.hash.replace(/^#/, ''));
    const isRecoveryFlow =
      searchParams.get('reset_password') === 'true' ||
      searchParams.get('type') === 'recovery' ||
      searchParams.has('code') ||
      searchParams.has('access_token') ||
      hashParams.get('type') === 'recovery' ||
      hashParams.has('access_token');
    const isLoginPage = location.pathname.endsWith('/login');

    if (isRecoveryFlow && !isLoginPage) {
      searchParams.set('reset_password', 'true');
      navigate(`/login?${searchParams.toString()}${location.hash}`, { replace: true });
    }
  }, [location.hash, location.pathname, location.search, navigate]);

  return null;
}

function App() {
  return (
    <ThemeProvider>
      <Router basename={routerBaseName}>
        <AuthProvider>
          <PasswordRecoveryRedirect />
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
