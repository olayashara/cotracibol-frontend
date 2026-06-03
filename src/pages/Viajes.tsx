import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Loader2, MapPin } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatHora, formatPrecio } from "@/lib/horarios";

type Tipo = "taxi" | "buseta";
const CIUDADES = ["Medellín", "Ciudad Bolívar"] as const;
type Ciudad = (typeof CIUDADES)[number];

interface ViajeBD {
  id: number;
  id_ruta: number;
  id_vehiculo: number;
  hora_salida: string;
  asientos_disponibles: number;
  precio: number;
  id_estado: number;
}

const Viajes = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  
  // Estado de origen (Por defecto Medellín)
  const [origen, setOrigen] = useState<Ciudad>("Medellín");
  const destino = useMemo<Ciudad>(() => (origen === "Medellín" ? "Ciudad Bolívar" : "Medellín"), [origen]);
  const [date, setDate] = useState<Date>(new Date());
  const [tipo, setTipo] = useState<Tipo>("buseta");
  
  const [viajesFiltrados, setViajesFiltrados] = useState<ViajeBD[]>([]);
  const [loading, setLoading] = useState(false);

  const fechaStr = useMemo(() => format(date, "yyyy-MM-dd"), [date]);
  
  // 🚖 Asignación de capacidades físicas reales: ID 1 es Taxi (4 cupos), ID 2 es Buseta (8 cupos)
  const capacidadMax = tipo === "taxi" ? 4 : 8; 

  // Mapear la ruta seleccionada con los IDs reales de tbl_ruta en Supabase
  const idRutaSeleccionada = useMemo(() => {
    // Si el origen es Medellín rumbo a Ciudad Bolívar => ID 2
    // Si el origen es Ciudad Bolívar rumbo a Medellín => ID 1
    return origen === "Medellín" ? 2 : 1;
  }, [origen]);

  useEffect(() => {
    const verificarYCrearPerfil = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser && currentUser.email) {
          const queryBase = supabase.from("tbl_persona" as any) as any;
          const { data: perfiles } = await queryBase.select("num_documento").eq("email", currentUser.email);

          if (!perfiles || perfiles.length === 0) {
            await queryBase.insert({
              nombre: currentUser.user_metadata?.full_name || currentUser.user_metadata?.given_name || "Usuario",
              apellidos: currentUser.user_metadata?.family_name || "",
              email: currentUser.email,
              id_rol: 1, 
              id_estado: 1
            });
            nav("/completar-perfil");
            return;
          }
          if (!perfiles[0]?.num_documento) {
            nav("/completar-perfil");
          }
        }
      } catch (error) {
        console.error("Error en el guardián de seguridad:", error);
      }
    };
    verificarYCrearPerfil();
  }, [nav]);

  useEffect(() => {
    const consultarViajesDisponibles = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("tbl_viaje" as any).select("*").eq("id_estado", 1);
        if (error) throw error;

        const listaViajes: ViajeBD[] = (data as any) || [];
        const filtrados = listaViajes.filter((v) => {
          const fechaLocalViaje = new Date(v.hora_salida);
          const anio = fechaLocalViaje.getFullYear();
          const mes = String(fechaLocalViaje.getMonth() + 1).padStart(2, "0");
          const dia = String(fechaLocalViaje.getDate()).padStart(2, "0");
          const fechaViajeFormateada = `${anio}-${mes}-${dia}`;
          
          // 🔄 NUEVO FILTRO COMPLETO:
          // 1. Validar Tipo Vehículo (1: Taxi, 2: Buseta)
          const coincideVehiculo = tipo === "taxi" ? v.id_vehiculo === 1 : v.id_vehiculo === 2;
          // 2. Validar Fecha exacta
          const coincideFecha = fechaViajeFormateada === fechaStr;
          // 3. Validar Ruta correspondiente (Evita que salgan en la ruta inversa)
          const coincideRuta = v.id_ruta === idRutaSeleccionada;

          return coincideFecha && coincideVehiculo && coincideRuta;
        });

        setViajesFiltrados(filtrados);
      } catch (error: any) {
        console.error("Error cargando viajes:", error);
        toast.error("No se pudieron cargar los viajes.");
      } finally {
        setLoading(false);
      }
    };
    consultarViajesDisponibles();
  }, [fechaStr, tipo, idRutaSeleccionada]); // Agregado idRutaSeleccionada como dependencia estable

  const handleIrAlPago = (viajeId: number, asientosDisponibles: number, precio: number) => {
    if (!user) { nav("/auth"); return; }
    if (asientosDisponibles <= 0) {
      toast.error("Este viaje se encuentra lleno.");
      return;
    }
    nav("/pago", { state: { viajeId, precio, idVehiculo: tipo === "taxi" ? 1 : 2 } });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-12">
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold">Viajes disponibles</h1>
          <p className="text-muted-foreground mt-2">Selecciona los parámetros de tu viaje.</p>
        </header>

        <div className="grid lg:grid-cols-[320px_1fr] gap-8">
          <aside className="space-y-6 lg:sticky lg:top-24 self-start">
            <div className="p-5 rounded-2xl bg-card border border-border shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Ruta</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Origen</label>
                  <Select value={origen} onValueChange={(v) => setOrigen(v as Ciudad)}>
                    <SelectTrigger className="w-full">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Selecciona origen" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {CIUDADES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Destino</label>
                  <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                    <MapPin className="mr-2 h-4 w-4" />
                    <span>{destino}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Fecha</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-medium">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "EEEE, d 'de' MMMM", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="start">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))} locale={es} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tipo de vehículo</p>
              <Tabs value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="buseta">Buseta</TabsTrigger>
                  <TabsTrigger value="taxi">Taxi</TabsTrigger>
                </TabsList>
                <TabsContent value="buseta" className="mt-3 text-sm text-muted-foreground">Capacidad: 8 cupos.</TabsContent>
                <TabsContent value="taxi" className="mt-3 text-sm text-muted-foreground">Capacidad: 4 cupos.</TabsContent>
              </Tabs>
            </div>
          </aside>

          <section>
            {loading ? (
              <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-primary" /></div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {viajesFiltrados.length === 0 ? (
                  <p className="text-muted-foreground col-span-full text-center py-10 bg-slate-50 border border-dashed rounded-2xl">
                    No se encontraron viajes programados para esta ruta y vehículo en la fecha seleccionada.
                  </p>
                ) : (
                  viajesFiltrados.map((viaje) => {
                    const lleno = viaje.asientos_disponibles <= 0;
                    const horaFormateada = viaje.hora_salida.split("T")[1]?.slice(0, 5) || "00:00";
                    return (
                      <article key={viaje.id} className={cn("p-5 rounded-2xl border bg-gradient-card transition-all", lleno && "opacity-50" )}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">Salida</p>
                            <p className="text-3xl font-extrabold mt-1">{formatHora(horaFormateada)}</p>
                          </div>
                          <div className={cn("text-xs font-bold px-2.5 py-1 rounded-full", lleno ? "bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground")}>
                            {lleno ? "Lleno" : `${viaje.asientos_disponibles}/${capacidadMax} cupos`}
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <p className="text-lg font-bold text-primary">{formatPrecio(viaje.precio)}</p>
                          <Button size="sm" disabled={lleno} onClick={() => handleIrAlPago(viaje.id, viaje.asientos_disponibles, viaje.precio)} className="bg-primary hover:bg-primary/90">
                            Comprar
                          </Button>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Viajes;