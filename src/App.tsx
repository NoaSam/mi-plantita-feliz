import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import AuthProvider from "@/contexts/AuthContext";
import AppLayout from "@/layouts/AppLayout";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import Index from "./pages/Index";
import History from "./pages/History";
import PlantDetail from "./pages/PlantDetail";
import SettingsPage from "./pages/Settings";
import MapPage from "./pages/MapPage";
import RegarPage from "./pages/RegarPage";
import RecoverPasswordPage from "./pages/auth/RecoverPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import CookiePolicy from "./pages/legal/CookiePolicy";
import LegalNotice from "./pages/legal/LegalNotice";
import TermsOfService from "./pages/legal/TermsOfService";
import HistoryRelocationNotice from "@/components/HistoryRelocationNotice";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

/**
 * Listens for AuthContext's `mp:pending-classification-resolved` CustomEvent
 * (Plan 03 contract) and navigates to the just-classified plant's detail page.
 * Decoupling AuthContext from react-router via a DOM event keeps the auth
 * layer framework-agnostic. Mounts inside <BrowserRouter> so useNavigate works.
 */
function PendingClassificationListener() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ plant_search_id: string; action: string }>).detail;
      if (detail?.plant_search_id) {
        navigate(`/planta/${detail.plant_search_id}`, { replace: true });
      }
    };
    window.addEventListener("mp:pending-classification-resolved", handler);
    return () => window.removeEventListener("mp:pending-classification-resolved", handler);
  }, [navigate]);
  return null;
}

const App = () => (
  <AuthProvider>
    <TooltipProvider>
      <Toaster richColors closeButton position="top-center" />
      <BrowserRouter>
        <ScrollToTop />
        <PendingClassificationListener />
        <Routes>
          <Route path="/" element={<AppLayout><Index /></AppLayout>} />
          {/* D-03: /mis-plantas redirige a /ajustes/mis-plantas (backwards compat para bookmarks).
              Bug fix (2026-06-15): el toast de relocate vivía a nivel app y disparaba en
              cualquier ruta. Ahora el handler hace el redirect + fires el toast solo cuando
              la usuaria llega vía /mis-plantas. */}
          <Route path="/mis-plantas" element={<HistoryRelocationNotice />} />
          <Route path="/ajustes/mis-plantas" element={<AppLayout><History /></AppLayout>} />
          <Route path="/planta/:id" element={<AppLayout><PlantDetail /></AppLayout>} />
          <Route path="/ajustes" element={<AppLayout><SettingsPage /></AppLayout>} />
          <Route path="/mapa" element={<AppLayout fullBleed><MapPage /></AppLayout>} />
          {/* Phase 3 (D-02): /regar — layout normal (no fullBleed); lista vertical scroll. */}
          <Route path="/regar" element={<AppLayout><RegarPage /></AppLayout>} />
          {/* /login y /signup mantienen el redirect a /mis-plantas que ahora redirige a /ajustes/mis-plantas (chain funciona). */}
          <Route path="/login" element={<Navigate to="/mis-plantas" replace />} />
          <Route path="/signup" element={<Navigate to="/mis-plantas" replace />} />
          {/* Sub-fase 03.2 — recuperación y cambio de contraseña (rutas públicas). */}
          <Route path="/auth/recuperar" element={<RecoverPasswordPage />} />
          <Route path="/auth/reset" element={<ResetPasswordPage />} />
          {/* Legal pages — accessible without login */}
          <Route path="/privacidad" element={<PrivacyPolicy />} />
          <Route path="/cookies" element={<CookiePolicy />} />
          <Route path="/aviso-legal" element={<LegalNotice />} />
          <Route path="/terminos" element={<TermsOfService />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <CookieConsentBanner />
      </BrowserRouter>
    </TooltipProvider>
  </AuthProvider>
);

export default App;
