import { useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatPrecio } from "@/lib/horarios";
import { Bus, CheckCircle2, CreditCard, Loader2, Lock, MapPin, Armchair } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  const idVehiculo = location.state?.idVehiculo || 1; // 1 = Buseta, 2 = Taxi

  const [card, setCard] = useState({ nombre: "", numero: "", expiracion: "", cvv: "" });
  const [procesando, setProcesando] = useState(false);
  const [pagado, setPagado] = useState(false);

  // Estados para el mapa interactivo de asientos
  const [asientosOcupados, setAsientosOcupados] = useState<number[]>([]);
  const [asientoSeleccionado, setAsientoSeleccionado] = useState<number | null>(null);
  const [cargandoAsientos, setCargandoAsientos] = useState(false);

  // Formateador inteligente de la fecha de hoy para el resumen
  const fechaLegible = useMemo(() => {
    return format(new Date(), "EEEE, d 'de' MMMM", { locale: es });
  }, []);

  // 🛰️ EFECTO: Cargar asientos ocupados desde Supabase en tiempo real
  useEffect(() => {
    if (!viajeId || idVehiculo !== 1) return;

    const cargarAsientosReservados = async () => {
      setCargandoAsientos(true);
      try {
        const { data, error } = await supabase
          .from("tbl_tiquete" as any)
          .select("num_asiento") // Asegúrate de que tu tabla tenga esta columna o cámbiala por la exacta
          .eq("id_viaje", viajeId);

        if (error) throw error;

        if (data) {
          // Extraemos los números de asientos y filtramos los valores nulos o indefinidos
          const ocupados = data
            .map((t: any) => Number(t.num_asiento))
            .filter((num: number) => !isNaN(num) && num > 0);
          setAsientosOcupados(ocupados);
        }
      } catch (error) {
        console.error("Error obteniendo asientos ocupados:", error);
        toast.error("No se pudo verificar el mapa de asientos en tiempo real.");
      } finally {
        setCargandoAsientos(false);
      }
    };

    cargarAsientosReservados();
  }, [viajeId, idVehiculo]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  const handlePagar = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🛡️ CONTROL ANTIDOBLE CLIC: Frena cualquier reenvío accidental
    if (procesando || pagado) return;

    // 🛡️ CONTROL DE MAPA: Si es buseta, exigir obligatoriamente la selección de un asiento
    if (idVehiculo === 1 && !asientoSeleccionado) {
      toast.error("Por favor, selecciona un asiento en el mapa interactivo de la buseta.");
      return;
    }

    const parsed = cardSchema.safeParse({ ...card, numero: card.numero.replace(/\s+/g, "") });
    if (!parsed.success) { 
      toast.error(parsed.error.errors[0].message); 
      return; 
    }

    if (!viajeId) {
      toast.error("No se encontró una referencia de viaje válida.");
      return;
    }

    setProcesando(true);
    
    try {
      // Simulación de respuesta bancaria segura
      await new Promise((r) => setTimeout(r, 1800));

      // 1. CONTROL DE INVENTARIO: Consultar disponibilidad actual
      const { data: viajeActual, error: errorFetch } = await supabase
        .from("tbl_viaje" as any)
        .select("asientos_disponibles")
        .eq("id", viajeId)
        .single() as any;

      if (errorFetch || !viajeActual) {
        throw new Error("No se pudo verificar la disponibilidad del viaje.");
      }

      const cuposDisponibles = viajeActual.asientos_disponibles;

      if (cuposDisponibles <= 0) {
        throw new Error("¡Lo sentimos! Este viaje acaba de completarse y no quedan cupos.");
      }

      // 2. DESCUENTO: Restar 1 de los asientos disponibles de forma segura
      const { error: errorUpdate } = await supabase
        .from("tbl_viaje" as any)
        .update({ asientos_disponibles: cuposDisponibles - 1 } as any)
        .eq("id", viajeId);

      if (errorUpdate) throw new Error("Error al actualizar los asientos del vehículo.");

      // 3. REGISTRO: Crear el tiquete oficial incluyendo el número de asiento seleccionado
      const { error: errorTiquete } = await supabase
        .from("tbl_tiquete" as any)
        .insert({
          id_viaje: viajeId,
          email_pasajero: user.email,
          asientos_comprados: 1,
          num_asiento: idVehiculo === 1 ? asientoSeleccionado : null // Guardamos el asiento si es buseta
        } as any);

      if (errorTiquete) {
        // Rollback: Devolvemos el cupo si el tiquete falla
        await supabase
          .from("tbl_viaje" as any)
          .update({ asientos_disponibles: cuposDisponibles } as any)
          .eq("id", viajeId);
          
        throw new Error("No se pudo registrar tu tiquete oficial en el sistema.");
      }

      setPagado(true);
      toast.success("Pago aprobado", {
        description: `Tu tiquete fue confirmado con éxito. Asiento asignado: ${idVehiculo === 1 ? `#${asientoSeleccionado}` : "General (Taxi)"}`,
      });

    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo procesar el pago");
    } finally {
      setProcesando(false);
    }
  };

  const formatNumero = (v: string) =>
    v.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();

  // Función interna para determinar estilos dinámicos de cada asiento
  const renderAsientoBotón = (numero: number) => {
    const estaOcupado = asientosOcupados.includes(numero);
    const estaSeleccionado = asientoSeleccionado === numero;

    let claseEstilo = "border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700"; // Disponible (Gris)
    if (estaOcupado) {
      claseEstilo = "border-amber-400 bg-amber-400 text-white cursor-not-allowed"; // Ocupado (Amarillo)
    } else if (estaSeleccionado) {
      claseEstilo = "border-emerald-500 bg-emerald-500 text-white shadow-md transform scale-105 transition-all"; // Seleccionado (Verde)
    }

    return (
      <button
        key={`asiento-${numero}`}
        type="button"
        disabled={estaOcupado}
        onClick={() => setAsientoSeleccionado(numero)}
        className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 font-bold text-sm h-12 w-12 transition-all ${claseEstilo}`}
        title={estaOcupado ? `Asiento ${numero} ocupado` : `Seleccionar asiento ${numero}`}
      >
        <Armchair className="h-4 w-4 mb-0.5" />
        {numero}
      </button>
    );
  };

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
            
            <div className="space-y-6">
              {/* 🚌 MAPA INTERACTIVO DE ASIENTOS (Solo se muestra para la Buseta) */}
              {idVehiculo === 1 && (
                <div className="p-6 rounded-2xl bg-card border shadow-soft">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-lg font-bold">
                      <Bus className="h-5 w-5 text-primary" /> Distribución de Asientos (Buseta)
                    </div>
                    {asientoSeleccionado && (
                      <span className="text-sm font-semibold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                        Asiento elegido: #{asientoSeleccionado}
                      </span>
                    )}
                  </div>

                  {cargandoAsientos ? (
                    <div className="flex justify-center items-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                      <span className="text-sm text-muted-foreground">Cargando disponibilidad...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row items-center justify-center gap-8 bg-slate-50/50 p-6 rounded-xl border border-dashed">
                      
                      {/* Cabina Simulada de la Buseta */}
                      <div className="w-52 border-2 border-slate-300 rounded-3xl bg-white p-4 shadow-inner relative">
                        {/* Parabrisas delantero */}
                        <div className="w-full h-3 bg-slate-300 rounded-t-xl mb-4 text-center text-[8px] font-bold text-slate-500 tracking-widest">
                          FRENTE
                        </div>

                        {/* Fila del Conductor (Fila Delantera) */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                          {/* Asiento del Conductor (Bloqueado Fijo) */}
                          <div className="flex flex-col items-center justify-center p-2 rounded-xl border-2 border-rose-300 bg-rose-100 text-rose-600 font-bold text-xs h-12 w-12 cursor-not-allowed">
                            <Armchair className="h-4 w-4" />
                            Cond.
                          </div>
                          {/* Espacio vacío central */}
                          <div></div>
                          {/* Asiento libre amarillo no disponible según requerimiento visual original */}
                          <div className="flex flex-col items-center justify-center p-2 rounded-xl border-2 border-amber-200 bg-amber-50 text-amber-400 font-bold text-[9px] h-12 w-12 cursor-not-allowed leading-tight text-center">
                            No Disp
                          </div>
                        </div>

                        {/* Distribución Oficial de Asientos con Pasillo Central (Grid de 3 columnas) */}
                        <div className="grid grid-cols-3 gap-3">
                          {/* Fila 1 */}
                          {renderAsientoBotón(1)}
                          <div className="w-12 h-12 flex items-center justify-center text-[10px] text-slate-300 font-mono tracking-widest uppercase rotate-90">Pasillo</div>
                          {renderAsientoBotón(2)}

                          {/* Fila 2 */}
                          {renderAsientoBotón(3)}
                          <div></div>
                          {renderAsientoBotón(4)}

                          {/* Fila 3 */}
                          {renderAsientoBotón(5)}
                          <div></div>
                          {renderAsientoBotón(6)}

                          {/* Fila Posterior Completa (Asientos de atrás) */}
                          {renderAsientoBotón(7)}
                          <div className="flex justify-center shrink-0">
                            {/* Opcional: Si deseas que el asiento 8 quede centrado al fondo, o usarlo de forma compacta */}
                          </div>
                          {renderAsientoBotón(8)}
                        </div>
                      </div>

                      {/* Nomenclatura e Indicadores de Color */}
                      <div className="space-y-3 text-sm self-center md:self-start">
                        <p className="font-bold text-slate-700">Estados del mapa:</p>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-slate-100 border-2 border-slate-300"></div>
                          <span>Disponible / Libre</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-emerald-500 border-2 border-emerald-600"></div>
                          <span>Tu selección actual</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-amber-400 border-2 border-amber-500"></div>
                          <span>Ocupado por otro pasajero</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-rose-100 border-2 border-rose-300"></div>
                          <span>Conductor de la cooperativa</span>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )}

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
                  {procesando ?
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Procesando pago…</> : <>Pagar {formatPrecio(precioFinal)}</>}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Esta es una pasarela simulada para fines demostrativos. No se realiza ningún cobro real a tu cuenta bancaria.
                </p>
              </form>
            </div>

            {/* Resumen del Viaje */}
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
                <span className="capitalize font-semibold">
                  {idVehiculo === 1 ? "Servicio Buseta" : "Servicio Taxi"}
                </span>
              </div>

              {idVehiculo === 1 && asientoSeleccionado && (
                <div className="mt-3 text-sm font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center gap-2">
                  <Armchair className="h-4 w-4" />
                  <span>Asiento Reservado: <strong>#{asientoSeleccionado}</strong></span>
                </div>
              )}
              
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