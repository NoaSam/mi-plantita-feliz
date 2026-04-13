import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import AuthProvider from "@/contexts/AuthContext";
import AppLayout from "@/layouts/AppLayout";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import Index from "./pages/Index";
import History from "./pages/History";
import SettingsPage from "./pages/Settings";
import NotFound from "./pages/NotFound";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import CookiePolicy from "./pages/legal/CookiePolicy";
import LegalNotice from "./pages/legal/LegalNotice";
import TermsOfService from "./pages/legal/TermsOfService";

const App = () => (
  <AuthProvider>
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout><Index /></AppLayout>} />
          <Route path="/mis-plantas" element={<AppLayout><History /></AppLayout>} />
          <Route path="/ajustes" element={<AppLayout><SettingsPage /></AppLayout>} />
          <Route path="/login" element={<Navigate to="/mis-plantas" replace />} />
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
