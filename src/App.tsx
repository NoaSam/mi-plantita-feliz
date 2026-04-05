import { BrowserRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import AuthProvider from "@/contexts/AuthContext";
import AppLayout from "@/layouts/AppLayout";
import Index from "./pages/Index";
import History from "./pages/History";
import SettingsPage from "./pages/Settings";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

const App = () => (
  <AuthProvider>
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout><Index /></AppLayout>} />
          <Route path="/mis-plantas" element={<AppLayout><History /></AppLayout>} />
          <Route path="/ajustes" element={<AppLayout><SettingsPage /></AppLayout>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </AuthProvider>
);

export default App;
