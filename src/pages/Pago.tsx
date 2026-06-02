import { useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatPrecio } from "@/lib/horarios";
import { Bus, Car, CheckCircle2, CreditCard, Loader2, Lock, MapPin } from "lucide-react";
import { z } from "zod";

// Validaciones seguras de la pasarela con Zod
const cardSchema = z.object({
  nombre: z.string().trim().min(2, "Nombre del titular requerido").max(60),
  numero: z.string().trim().regex(/^\d{13,19}$/, "Número de tarjeta inválido"),
  expiracion: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Fecha MM/AA inválida"),
  cvv: z.string().regex(/^\d{3,4}$/, "CVV inválido"),
});

const Pago = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  // 🛡️ Captura segura del estado del router enviado desde Viajes.tsx
  const viajeId = location.state?.viajeId || null;
  const precioFinal = location.state?.precio || 35000;

  const [card, setCard] = useState({ nombre: "", numero: "", expiracion: "", cvv: "" });
  const [procesando, setProcesando] = useState(false);
  const [pagado, setPagado] = useState(false);

  // Formateador inteligente de la fecha de hoy para el resumen
  const fechaLegible = useMemo(() => {
    return format(new Date(), "EEEE, d 'de' MMMM", { locale: es });
  }, []);

  if (loading) return null;
  // Si no hay usuario logueado, lo mandamos a autenticarse
  if (!user) return <Navigate to="/auth" replace />;

  const handlePagar = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validamos la tarjeta con Zod
    const parsed = cardSchema.safeParse({ ...card, numero: card.numero.replace(/\s+/g, "") });
    if (!parsed.success) { 
      toast.error(parsed.error.errors[0].message); 
      return; 
    }

    setProcesando(true);
    try {
      // Pequeña espera de simulación para representar la pasarela bancaria
      await new Promise((r) => setTimeout(r, 1800));

      setPagado(true);
      toast.success("Pago aprobado", {
        description: "Tu tiquete fue confirmado. Ya puedes consultarlo en tu historial.",
      });
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo procesar el pago");
    } finally {
      setProcesando(false);
    }
  };

  const formatNumero = (v: string) =>
    v.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-12">
        <h1 className="text-4xl font-extrabold">Pasarela de pago</h1>
        <p className="text-muted-foreground mt-2 flex items-center gap-2">
          <Lock className="h-4 w-4" /> Conexión segura · pago simulado cooperativa
        </p>

        {pagado ? (
          <div className="mt-10 max-w-xl mx-auto p-8 rounded-2xl bg-gradient-card border shadow-elegant text-center">
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
            <h2 className="text-3xl font-extrabold mt-4">¡Pago aprobado!</h2>
            <p className="text-muted-foreground mt-2">
              Tu tiquete fue confirmado con éxito. Ya se encuentra registrado en tu cuenta de COTRACIBOL.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => nav("/mis-tiquetes")} className="bg-primary hover:bg-primary/90">
                Ver mis tiquetes
              </Button>
              <Button variant="outline" onClick={() => nav("/viajes")}>
                Comprar otro viaje
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_360px] gap-8 mt-8">
            
            {/* Formulario de pago con tarjeta */}
            <form onSubmit={handlePagar} className="p-6 rounded-2xl bg-card border shadow-soft space-y-5">
              <div className="flex items-center gap-2 text-lg font-bold">
                <CreditCard className="h-5 w-5 text-primary" /> Datos de la tarjeta
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Nombre del titular</label>
                <Input value={card.nombre} onChange={(e) => setCard({ ...card, nombre: e.target.value })} placeholder="Como aparece en la tarjeta" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Número de tarjeta</label>
                <Input
                  inputMode="numeric"
                  value={card.numero}
                  onChange={(e) => setCard({ ...card, numero: formatNumero(e.target.value) })}
                  placeholder="1234 5678 9012 3456"
                  maxLength={23}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Vencimiento</label>
                  <Input
                    value={card.expiracion}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                      if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
                      setCard({ ...card, expiracion: v });
                    }}
                    placeholder="MM/AA"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">CVV</label>
                  <Input
                    inputMode="numeric"
                    type="password"
                    value={card.cvv}
                    onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })}
                    placeholder="123"
                    maxLength={4}
                  />
                </div>
              </div>
              <Button type="submit" disabled={procesando} className="w-full bg-primary hover:bg-primary/90 h-11 text-base font-bold">
                {procesando ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Procesando pago…</> : <>Pagar {formatPrecio(precioFinal)}</>}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Esta es una pasarela simulada para fines demostrativos. No se realiza ningún cobro real a tu cuenta bancaria.
              </p>
            </form>

            {/* Resumen del Viaje Adquirido en Supabase */}
            <aside className="p-6 rounded-2xl bg-gradient-card border shadow-soft h-fit lg:sticky lg:top-24">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumen del viaje</p>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-semibold">Ruta Oficial</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-semibold">COTRACIBOL</span>
              </div>
              <p className="mt-3 text-lg font-bold capitalize">{fechaLegible}</p>
              
              <div className="mt-3 inline-flex items-center gap-2 text-sm bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full">
                <Bus className="h-4 w-4" />
                <span className="capitalize font-semibold">Servicio Confirmado</span>
              </div>
              
              {viajeId && (
                <p className="text-xs text-slate-400 mt-3 font-mono">Reserva ID: #VJ-{viajeId}</p>
              )}
              
              <hr className="my-5 border-border" />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total a pagar</span>
                <span className="text-2xl font-extrabold text-slate-900">{formatPrecio(precioFinal)}</span>
              </div>
            </aside>

          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Pago;