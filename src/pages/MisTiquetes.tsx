import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatPrecio, formatHora } from "@/lib/horarios";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Loader2, Ticket, MapPin, Calendar, Clock, Armchair, Bus, Car } from "lucide-react";

interface TiqueteMapeado {
  id: number;
  id_viaje: number;
  fecha_compra: string;
  num_asiento: number | null;
  asientos_comprados: number;
  hora_salida: string;
  precio: number;
  id_vehiculo: number;
  id_ruta: number;
}

const MisTiquetes = () => {
  const { user, loading: authLoading } = useAuth();
  const [tiquetes, setTiquetes] = useState<TiqueteMapeado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const cargarTiquetes = async () => {
      try {
        setLoading(true);
        
        // Consultamos tbl_tiquete trayendo los datos anidados de tbl_viaje
        const { data: tiquetesData, error: errorTiquetes } = await supabase
          .from("tbl_tiquete" as any)
          .select(`
            id,
            id_viaje,
            fecha_compra,
            num_asiento,
            asientos_comprados,
            tbl_viaje (
              hora_salida,
              precio,
              id_vehiculo,
              id_ruta
            )
          `)
          .eq("email_pasajero", user.email)
          .order("fecha_compra", { ascending: false });

        if (errorTiquetes) throw errorTiquetes;

        if (tiquetesData) {
          const mapeados: TiqueteMapeado[] = tiquetesData.map((t: any) => ({
            id: t.id,
            id_viaje: t.id_viaje,
            fecha_compra: t.fecha_compra,
            num_asiento: t.num_asiento,
            asientos_comprados: t.asientos_comprados,
            hora_salida: t.tbl_viaje?.hora_salida,
            precio: t.tbl_viaje?.precio,
            id_vehiculo: t.tbl_viaje?.id_vehiculo,
            id_ruta: t.tbl_viaje?.id_ruta,
          }));
          setTiquetes(mapeados);
        }
      } catch (error) {
        console.error("Error al cargar los tiquetes:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarTiquetes();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Navbar />
      <main className="flex-1 container py-12">
        <h1 className="text-4xl font-extrabold tracking-tight mb-8">Mis Tiquetes</h1>

        {tiquetes.length === 0 ? (
          <div className="text-center py-16 border border-dashed rounded-2xl bg-white max-w-xl mx-auto">
            <Ticket className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-bold">No tienes tiquetes activos</h3>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {tiquetes.map((tiquete) => {
              const fechaViaje = tiquete.hora_salida ? new Date(tiquete.hora_salida) : new Date();
              const horaFormateada = tiquete.hora_salida?.split("T")[1]?.slice(0, 5) || "00:00";

              return (
                <article key={tiquete.id} className="bg-white border rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
                  {/* Encabezado */}
                  <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                    <span className="text-xs font-mono font-bold text-slate-500">RESERVA: #CO-{tiquete.id}</span>
                    <span className="text-[11px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">Confirmado</span>
                  </div>

                  {/* Detalles operativos */}
                  <div className="p-5 space-y-4 flex-1">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">Fecha</span>
                          <span className="font-bold text-slate-700 text-xs capitalize">{format(fechaViaje, "eee, d 'de' MMM", { locale: es })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-slate-400" />
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold block">Hora Salida</span>
                          <span className="font-bold text-slate-700 text-xs">{formatHora(horaFormateada)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border">
                      <div className="flex items-center gap-2 font-bold text-slate-700">
                        {tiquete.id_vehiculo === 2 ? (
                          <>
                            <Bus className="h-4 w-4 text-amber-500" />
                            <span>Servicio Buseta</span>
                          </>
                        ) : (
                          <>
                            <Car className="h-4 w-4 text-blue-500" />
                            <span>Servicio Taxi Colectivo</span>
                          </>
                        )}
                      </div>
                      <span className="text-muted-foreground font-bold">{tiquete.asientos_comprados} Pasajero</span>
                    </div>

                    {/* 📌 SECCIÓN SOLICITADA: MOSTRAR EL NÚMERO DE ASIENTO COMPRADO */}
                    <div className="mt-2">
                      {tiquete.id_vehiculo === 2 ? (
                        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-900">
                          <Armchair className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                          <div>
                            <span className="text-[10px] text-emerald-700 uppercase font-extrabold tracking-wider block">Puesto Reservado</span>
                            <span className="text-sm font-black">Asiento Número #{tiquete.num_asiento}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-900">
                          <Armchair className="h-5 w-5 text-blue-600 flex-shrink-0" />
                          <div>
                            <span className="text-[10px] text-blue-700 uppercase font-extrabold tracking-wider block">Asignación de Puesto</span>
                            <span className="text-xs font-bold">Por orden de llegada en la terminal</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pie de tarjeta con precio */}
                  <div className="p-4 bg-slate-50/50 border-t flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Total Abonado</span>
                    <span className="text-lg font-black text-slate-900">{formatPrecio(tiquete.precio)}</span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default MisTiquetes;