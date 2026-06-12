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

const cardSchema = z.object({
  nombre: z.string().trim().min(2, "Nombre del titular requerido").max(60),
  numero: z.string().trim().regex(/^\d{13,19}$/, "Número de tarjeta inválido"),
  expiracion: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Fecha MM/AA inválida"),
  cvv: z.string().regex(/^\d{3,4}$/, "CVV inválido"),
});

interface Pasajero {
  nombre: string;
  apellido: string;
  tipoDocumento: string;
  documento: string;
  fechaNacimiento: string;
  isAsientoExtra: boolean;
  adultoResponsableIdx: string;
}

const Pago = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  // 🔄 MODIFICADO: Captura de estados dinámicos del flujo multipasajero
  const viajeId = location.state?.viajeId || null;
  const idVehiculo = location.state?.idVehiculo || 2; 
  const cantidadPasajes = location.state?.cantidadPasajes || 1;
  const pasajeros = (location.state?.pasajeros || []) as Pasajero[];
  const precioFinal = location.state?.totalPagar || location.state?.precio || 35000;

  const [card, setCard] = useState({ nombre: "", numero: "", expiracion: "", cvv: "" });
  const [procesando, setProcesando] = useState(false);
  const [pagado, setPagado] = useState(false);

  const [asientosOcupados, setAsientosOcupados] = useState<number[]>([]);
  // 🔄 MODIFICADO: Ahora controlamos un arreglo de asientos seleccionados
  const [asientosSeleccionados, setAsientosSeleccionados] = useState<number[]>([]);
  const [cargandoAsientos, setCargandoAsientos] = useState(false);

  const fechaLegible = useMemo(() => format(new Date(), "EEEE, d 'de' MMMM", { locale: es }), []);

  useEffect(() => {
    if (!viajeId || idVehiculo !== 2) return;

    const cargarAsientosReservados = async () => {
      setCargandoAsientos(true);
      try {
        const { data, error } = await supabase
          .from("tbl_tiquete" as any)
          .select("num_asiento")
          .eq("id_viaje", viajeId);

        if (error) throw error;
        if (data) {
          const ocupados = data.map((t: any) => Number(t.num_asiento)).filter((num) => !isNaN(num) && num > 0);
          setAsientosOcupados(ocupados);
        }
      } catch (error) {
        console.error("Error obteniendo asientos:", error);
      } finally {
        setCargandoAsientos(false);
      }
    };
    cargarAsientosReservados();
  }, [viajeId, idVehiculo]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  // 🔄 MODIFICADO: Manejar lógica de selección múltiple según la cantidad de pasajes
  const handleToggleAsiento = (numero: number) => {
    setAsientosSeleccionados((prev) => {
      if (prev.includes(numero)) {
        return prev.filter((a) => a !== numero);
      }
      if (prev.length >= cantidadPasajes) {
        toast.error(`Ya has seleccionado los ${cantidadPasajes} asientos correspondientes a tus pasajes.`);
        return prev;
      }
      return [...prev, numero].sort((a, b) => a - b);
    });
  };

  // 🔄 CORRECCIÓN PROFUNDA: Adaptado para registrar múltiples pasajes iterativamente enlazando tbl_pasajero
  const handlePagar = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (procesando || pagado) return;
    setProcesando(true);

    // Validación del mapa de puestos
    if (idVehiculo === 2 && asientosSeleccionados.length !== cantidadPasajes) {
      toast.error(`Por favor, selecciona exactamente ${cantidadPasajes} asientos en el mapa de la buseta.`);
      setProcesando(false);
      return;
    }

    const parsed = cardSchema.safeParse({ ...card, numero: card.numero.replace(/\s+/g, "") });
    if (!parsed.success) { 
      toast.error(parsed.error.errors[0].message); 
      setProcesando(false);
      return; 
    }
    
    if (!viajeId) { 
      toast.error("Referencia de viaje inválida."); 
      setProcesando(false);
      return; 
    }

    try {
      // 1. Validamos disponibilidad general
      const { data: viajeActual, error: errorFetch } = await supabase
        .from("tbl_viaje" as any)
        .select("asientos_disponibles")
        .eq("id", viajeId)
        .single() as any;

      if (errorFetch || !viajeActual) throw new Error("No se pudo verificar la disponibilidad del viaje.");
      if (viajeActual.asientos_disponibles < cantidadPasajes) {
        throw new Error(`¡Lo sentimos! Este viaje solo cuenta con ${viajeActual.asientos_disponibles} cupos disponibles.`);
      }

      // 2. Inserción en bucle para registrar los tiquetes y sus respectivos pasajeros en la nueva tabla
      const totalTiquetes = pasajeros.length > 0 ? pasajeros.length : cantidadPasajes;
      
      for (let i = 0; i < totalTiquetes; i++) {
        const pasajeroActual = pasajeros[i];

        // A. Insertamos el tiquete y solicitamos el ID de forma segura para TypeScript
        const respuestaTiquete = await supabase
          .from("tbl_tiquete" as any)
          .insert({
            id_viaje: viajeId,
            email_pasajero: user.email,
            asientos_comprados: 1,
            num_asiento: idVehiculo === 2 ? asientosSeleccionados[i] : null
          } as any)
          .select("id")
          .single() as any; 

        const nuevoTiquete = respuestaTiquete.data;
        const errorTiquete = respuestaTiquete.error;

        if (errorTiquete || !nuevoTiquete) {
          throw new Error("Error al guardar los tiquetes oficiales en el sistema.");
        }

        // B. Si hay datos detallados del formulario, los guardamos en tbl_pasajero enlazados al id_tiquete
        if (pasajeroActual) {
          const { error: errorPasajero } = await supabase
            .from("tbl_pasajero" as any)
            .insert({
              id_tiquete: nuevoTiquete.id,
              nombre: pasajeroActual.nombre,
              apellido: pasajeroActual.apellido,
              tipo_documento: pasajeroActual.tipoDocumento,
              documento: pasajeroActual.documento,
              fecha_nacimiento: pasajeroActual.fechaNacimiento || null,
              is_asiento_extra: pasajeroActual.isAsientoExtra || false,
              adulto_responsable_idx: pasajeroActual.adultoResponsableIdx !== "" ? pasajeroActual.adultoResponsableIdx : null
            } as any);

          if (errorPasajero) {
            console.error("Error guardando pasajero:", errorPasajero);
            throw new Error(`Error al registrar el manifiesto del Pasajero #${i + 1}.`);
          }
        }
      }

      // 3. Éxito total en la transacción
      setPagado(true);
      toast.success(`¡Pago aprobado y tus ${cantidadPasajes} tiquetes fueron reservados con éxito!`);
    } catch (err: any) {
      console.error("Error en el proceso de pago:", err);
      toast.error(err?.message || "Ocurrió un problema inesperado en la transacción.");
      setProcesando(false);
    }
  };

  const renderAsientoBoton = (numero: number) => {
    const estaOcupado = asientosOcupados.includes(numero);
    // 🔄 MODIFICADO: Verifica si el número de puesto se encuentra dentro del arreglo
    const estaSeleccionado = asientosSeleccionados.includes(numero);

    let estilo = "border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700";
    if (estaOcupado) estilo = "border-amber-400 bg-amber-400 text-white cursor-not-allowed";
    else if (estaSeleccionado) estilo = "border-emerald-500 bg-emerald-50 text-emerald-700 font-extrabold scale-105 shadow-md";

    return (
      <button
        key={`asiento-${numero}`}
        type="button"
        disabled={estaOcupado}
        // 🔄 MODIFICADO: Ejecuta la lógica multiselección
        onClick={() => handleToggleAsiento(numero)}
        className={`flex flex-col items-center justify-center rounded-xl border-2 font-bold text-xs h-11 w-11 transition-all ${estilo}`}
      >
        <Armchair className="h-3 w-3 mb-0.5" />
        {numero}
      </button>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-12">
        <h1 className="text-4xl font-extrabold">Pasarela de pago</h1>
        <p className="text-muted-foreground mt-2 flex items-center gap-2"><Lock className="h-4 w-4" /> Conexión segura · COTRACIBOL</p>

        {pagado ? (
          <div className="mt-10 max-w-xl mx-auto p-8 rounded-2xl bg-card border text-center shadow-lg">
            <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto" />
            <h2 className="text-3xl font-extrabold mt-4">¡Pago aprobado!</h2>
            <p className="text-muted-foreground mt-2">Tus tiquetes se registraron correctamente en la base de datos.</p>
            <div className="mt-6 flex gap-3 justify-center">
              <Button onClick={() => nav("/mis-tiquetes")}>Ver mis tiquetes</Button>
              <Button variant="outline" onClick={() => nav("/viajes")}>Comprar otro</Button>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_360px] gap-8 mt-8">
            <div className="space-y-6">
              {idVehiculo === 2 && (
                <div className="p-6 rounded-2xl bg-card border shadow-sm">
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><Bus className="text-primary" /> Croquis Real de la Buseta</h3>
                  
                  {cargandoAsientos ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
                      <Loader2 className="animate-spin h-4 w-4 text-primary" /> Actualizando estado de los asientos...
                    </div>
                  ) : (
                    <div className="flex flex-col md:flex-row items-center justify-center gap-8 bg-slate-50 p-6 rounded-xl border border-dashed">
                      <div className="w-56 border-2 border-slate-300 rounded-3xl bg-white p-4 shadow-inner">
                        <div className="w-full text-center text-[9px] font-bold text-slate-400 tracking-widest mb-4">FRENTE</div>
                        
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-rose-200 bg-rose-50 text-rose-500 text-[9px] h-11 w-11 font-bold cursor-not-allowed">Cond.</div>
                          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-amber-200 bg-amber-50 text-amber-500 text-[8px] h-11 w-11 text-center font-bold cursor-not-allowed leading-none">No Disp</div>
                          {renderAsientoBoton(1)}
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {renderAsientoBoton(2)}
                          {renderAsientoBoton(3)}
                          <div></div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {renderAsientoBoton(4)}
                          {renderAsientoBoton(5)}
                          <div></div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          {renderAsientoBoton(6)}
                          {renderAsientoBoton(7)}
                          {renderAsientoBoton(8)}
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-slate-100 border rounded"></div><span>Disponible</span></div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-emerald-500 rounded"></div><span>Tu selección</span></div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 bg-amber-400 rounded"></div><span>Ocupado</span></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handlePagar} className="p-6 rounded-2xl bg-card border shadow-sm space-y-5">
                <div className="flex items-center gap-2 text-lg font-bold"><CreditCard className="text-primary" /> Pasarela Bancaria</div>
                <div>
                  <label className="text-sm font-medium block mb-1">Nombre del titular</label>
                  <Input value={card.nombre} onChange={(e) => setCard({ ...card, nombre: e.target.value })} placeholder="Como aparece en la tarjeta" disabled={procesando} />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Número de tarjeta</label>
                  <Input value={card.numero} onChange={(e) => setCard({ ...card, numero: e.target.value.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim() })} placeholder="1234 5678 9012 3456" disabled={procesando} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">Vencimiento</label>
                    <Input value={card.expiracion} onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                      if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
                      setCard({ ...card, expiracion: v });
                    }} placeholder="MM/AA" maxLength={5} disabled={procesando} />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">CVV</label>
                    <Input type="password" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 3) })} placeholder="123" maxLength={3} disabled={procesando} />
                  </div>
                </div>
                <Button type="submit" disabled={procesando} className="w-full h-11 font-bold">
                  {procesando ? (
                    <span className="flex items-center gap-2 justify-center"><Loader2 className="animate-spin h-4 w-4" /> Procesando Transacción...</span>
                  ) : (
                    `Pagar ${formatPrecio(precioFinal)}`
                  )}
                </Button>
              </form>
            </div>

            <aside className="p-6 rounded-2xl bg-slate-50 border h-fit lg:sticky lg:top-24">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Resumen de Reserva</p>
              <div className="mt-4 flex items-center gap-2 text-sm font-semibold">
                <MapPin className="text-primary h-4 w-4" /> Ruta Cooperativa COTRACIBOL
              </div>
              <p className="mt-2 text-lg font-bold capitalize">{fechaLegible}</p>
              
              <div className="mt-2 text-xs font-semibold px-2 py-1 bg-slate-200 text-slate-800 rounded w-fit capitalize">
                {idVehiculo === 2 ? "Servicio Buseta" : "Servicio Taxi"}
              </div>

              {/* 🔄 MODIFICADO: Renderizado para soportar múltiples sillas seleccionadas */}
              {idVehiculo === 2 && asientosSeleccionados.length > 0 && (
                <div className="mt-3 text-xs bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-2 rounded-lg font-mono">
                  Asientos Seleccionados: <strong>{asientosSeleccionados.map(a => `#${a}`).join(", ")}</strong>
                </div>
              )}
              <hr className="my-4" />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Monto Total ({cantidadPasajes} pasajes)</span>
                <span className="text-2xl font-black text-slate-900">{formatPrecio(precioFinal)}</span>
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