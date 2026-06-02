import { useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { tiquetesService, viajesService, type TipoVehiculo } from "@/services";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatHora, formatPrecio } from "@/lib/horarios";
import { Bus, Car, CheckCircle2, CreditCard, Loader2, Lock, MapPin } from "lucide-react";
import { z } from "zod";

interface PagoState {
  fecha: string;
  hora: string;
  tipo: TipoVehiculo;
  origen: string;
  destino: string;
  precio: number;
}

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
  const state = location.state as PagoState | null;

  const [card, setCard] = useState({ nombre: "", numero: "", expiracion: "", cvv: "" });
  const [procesando, setProcesando] = useState(false);
  const [pagado, setPagado] = useState(false);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (!state) return <Navigate to="/viajes" replace />;

  const fechaLegible = useMemo(
    () => format(new Date(state.fecha + "T00:00:00"), "EEEE, d 'de' MMMM", { locale: es }),
    [state.fecha],
  );

  const handlePagar = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = cardSchema.safeParse({ ...card, numero: card.numero.replace(/\s+/g, "") });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }

    setProcesando(true);
    try {
      // Simulación: pequeña espera para representar pasarela de pagos
      await new Promise((r) => setTimeout(r, 1500));

      const viaje = await viajesService.obtenerOCrear(
        state.fecha, `${state.hora}:00`, state.tipo, state.origen, state.destino,
      );
      if (!viaje?.id) throw new Error("No se pudo crear el viaje");

      await tiquetesService.comprar(viaje.id, user.id);

      setPagado(true);
      toast.success("Pago aprobado", {
        description: "Tu tiquete fue confirmado. Enviamos la confirmación a tu correo.",
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
          <Lock className="h-4 w-4" /> Conexión segura · pago simulado
        </p>

        {pagado ? (
          <div className="mt-10 max-w-xl mx-auto p-8 rounded-2xl bg-gradient-card border shadow-elegant text-center">
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
            <h2 className="text-3xl font-extrabold mt-4">¡Pago aprobado!</h2>
            <p className="text-muted-foreground mt-2">
              Tu tiquete fue confirmado y enviamos la confirmación a tu correo electrónico.
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
            {/* Formulario de pago */}
            <form onSubmit={handlePagar} className="p-6 rounded-2xl bg-card border shadow-soft space-y-5">
              <div className="flex items-center gap-2 text-lg font-bold">
                <CreditCard className="h-5 w-5 text-primary" /> Datos de la tarjeta
              </div>
              <div>
                <Label>Nombre del titular</Label>
                <Input value={card.nombre} onChange={(e) => setCard({ ...card, nombre: e.target.value })} placeholder="Como aparece en la tarjeta" />
              </div>
              <div>
                <Label>Número de tarjeta</Label>
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
                  <Label>Vencimiento</Label>
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
                  <Label>CVV</Label>
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
              <Button type="submit" disabled={procesando} className="w-full bg-primary hover:bg-primary/90 h-11 text-base">
                {procesando ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Procesando pago…</> : <>Pagar {formatPrecio(state.precio)}</>}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Esta es una pasarela simulada para fines demostrativos. No se realiza ningún cobro real.
              </p>
            </form>

            {/* Resumen */}
            <aside className="p-6 rounded-2xl bg-gradient-card border shadow-soft h-fit lg:sticky lg:top-24">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumen del viaje</p>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-semibold">{state.origen}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-semibold">{state.destino}</span>
              </div>
              <p className="mt-3 text-lg font-bold capitalize">{fechaLegible}</p>
              <p className="text-2xl font-extrabold text-primary">{formatHora(state.hora)}</p>
              <div className="mt-3 inline-flex items-center gap-2 text-sm bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full">
                {state.tipo === "taxi" ? <Car className="h-4 w-4" /> : <Bus className="h-4 w-4" />}
                <span className="capitalize font-semibold">{state.tipo}</span>
              </div>
              <hr className="my-5 border-border" />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total a pagar</span>
                <span className="text-2xl font-extrabold">{formatPrecio(state.precio)}</span>
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
