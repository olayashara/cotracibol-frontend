import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Bus, Car, Ticket, Loader2 } from "lucide-react";
import { formatHora, formatPrecio } from "@/lib/horarios";
import { supabase } from "@/integrations/supabase/client";

interface TiqueteCruzado {
  id: number;
  numero_asiento: number;
  precio: number;
  viaje?: {
    origen: string;
    destino: string;
    fecha: string;
    hora: string;
    tipo: "buseta" | "taxi";
  };
}

const MisTiquetes = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<TiqueteCruzado[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);

  useEffect(() => {
    const consultarTiquetesReal = async () => {
      if (!user?.email) return;
      setCargando(true);

      try {
        // 1. Consultar tiquetes asignados al correo del pasajero
        const { data: tiquetesData, error: tiquetesError } = await supabase
          .from("tbl_tiquete" as any)
          .select("*")
          .eq("email_pasajero", user.email);

        if (tiquetesError) throw tiquetesError;

        if (!tiquetesData || tiquetesData.length === 0) {
          setItems([]);
          return;
        }

        // 2. Traer los viajes disponibles de la base de datos
        const { data: viajesData, error: viajesError } = await supabase
          .from("tbl_viaje" as any)
          .select("*");

        if (viajesError) throw viajesError;

        // Forzamos el tipado de las listas como any[] para neutralizar los errores de TypeScript en el mapeo
        const listaTiquetes = tiquetesData as any[];
        const listaViajes = viajesData as any[];

        // 3. Cruzar la información simulando el modelo de datos anterior
        const formateados: TiqueteCruzado[] = listaTiquetes.map((t) => {
          const v = listaViajes.find((viaje) => viaje.id === t.id_viaje);
          
          // Dividimos la cadena del timestamp de forma segura (ej: '2026-06-02T10:00:00')
          const fechaSalida = v?.hora_salida ? v.hora_salida.split("T")[0] : "2026-06-02";
          const horaSalida = v?.hora_salida ? v.hora_salida.split("T")[1]?.slice(0, 5) : "00:00";

          return {
            id: t.id,
            numero_asiento: t.asientos_comprados || 1,
            precio: v?.precio || 40000,
            viaje: {
              origen: v?.id_ruta === 2 ? "Ciudad Bolívar" : "Medellín",
              destino: v?.id_ruta === 2 ? "Medellín" : "Ciudad Bolívar",
              fecha: fechaSalida,
              hora: horaSalida,
              tipo: v?.id_vehiculo === 2 ? "taxi" : "buseta",
            }
          };
        });

        setItems(formateados);
      } catch (error) {
        console.error("Error al obtener tiquetes de Supabase:", error);
      } finally {
        setCargando(false);
      }
    };

    consultarTiquetesReal();
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-12">
        <h1 className="text-4xl font-extrabold">Mis tiquetes</h1>
        <p className="text-muted-foreground mt-2">Historial de viajes comprados.</p>

        {cargando ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="animate-spin text-primary h-8 w-8" />
          </div>
        ) : (
          <div className="mt-8 grid md:grid-cols-2 gap-4">
            {items.length === 0 && (
              <div className="md:col-span-2 p-12 text-center rounded-2xl border border-dashed">
                <Ticket className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-muted-foreground">Aún no has comprado tiquetes.</p>
              </div>
            )}
            
            {items.map((t) => (
              <article key={t.id} className="p-5 rounded-2xl bg-gradient-card border shadow-soft">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {t.viaje?.origen} → {t.viaje?.destino}
                    </p>
                    <p className="text-2xl font-extrabold mt-1">
                      {t.viaje?.fecha && format(new Date(t.viaje.fecha + "T00:00:00"), "d MMM yyyy", { locale: es })}
                    </p>
                    <p className="text-lg font-semibold text-primary">
                      {formatHora((t.viaje?.hora ?? "00:00").slice(0, 5))}
                    </p>
                  </div>
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    {t.viaje?.tipo === "taxi" ? <Car className="h-5 w-5" /> : <Bus className="h-5 w-5" />}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Cantidad cupos: <b className="text-foreground">{t.numero_asiento}</b>
                  </span>
                  <span className="font-bold">{formatPrecio(Number(t.precio))}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default MisTiquetes;