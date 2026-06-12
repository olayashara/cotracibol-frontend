import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { Protected } from "@/components/Protected";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Viajes from "./pages/Viajes.tsx";
import Pago from "./pages/Pago.tsx";
import MisTiquetes from "./pages/MisTiquetes.tsx";
import Notificaciones from "./pages/Notificaciones.tsx";
import Conductor from "./pages/Conductor.tsx";
import Admin from "./pages/Admin.tsx";
import CompletarPerfil from "./pages/CompletarPerfil.tsx";
import DatosPasajeros from "./pages/DatosPasajeros";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/viajes" element={<Viajes />} />
            <Route path="/pago" element={<Protected><Pago /></Protected>} />
            <Route path="/mis-tiquetes" element={<Protected><MisTiquetes /></Protected>} />
            <Route path="/notificaciones" element={<Protected><Notificaciones /></Protected>} />
            <Route path="/conductor" element={<Protected role="conductor"><Conductor /></Protected>} />
            <Route path="/admin" element={<Protected role="administrador"><Admin /></Protected>} />
            <Route path="/datos-pasajeros" element={<DatosPasajeros />} />
            <Route path="/completar-perfil" element={<CompletarPerfil />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
