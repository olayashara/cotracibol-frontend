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

// Interfaz para estructurar los viajes dinámicos desde tbl_viaje
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

  const [origen, setOrigen] = useState<Ciudad>("Medellín");
  const destino = useMemo<Ciudad>(() => (origen === "Medellín" ? "Ciudad Bolívar" : "Medellín"), [origen]);
  const [date, setDate] = useState<Date>(new Date());
  const [tipo, setTipo] = useState<Tipo>("buseta");
  
  // Guardaremos los viajes recuperados de la base de datos aquí
  const [viajesFiltrados, setViajesFiltrados] = useState<ViajeBD[]>([]);
  const [loading, setLoading] = useState(false);
  const [comprandoId, setComprandoId] = useState<number | null>(null);

  const fechaStr = useMemo(() => format(date, "yyyy-MM-dd"), [date]);

  // Mapeo estático de las capacidades del vehículo
  const capacidadMax = tipo === "buseta" ? 15 : 4; 

  // --- 1. GUARDÍAN DE SEGURIDAD CORREGIDO POR EMAIL Y APELLIDOS EN PLURAL ---
  useEffect(() => {
    const verificarYCrearPerfil = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (currentUser && currentUser.email) {
          const queryBase = supabase.from("tbl_persona" as any) as any;
          
          // Buscamos por EMAIL en lugar de ID para evitar conflictos de tipo de dato
          const { data: perfiles } = await queryBase
            .select("num_documento")
            .eq("email", currentUser.email);

          const perfilUsuario = perfiles && perfiles.length > 0 ? perfiles[0] : null;

          // Si NO existe el registro con ese email, lo creamos asignando por defecto
          if (!perfiles || perfiles.length === 0) {
            console.log("El usuario no existe en tbl_persona. Creándolo por email...");
            await queryBase.insert({
              nombre: currentUser.user_metadata?.full_name || currentUser.user_metadata?.given_name || "Usuario",
              apellidos: currentUser.user_metadata?.family_name || "", // <-- Corregido a plural para Supabase
              email: currentUser.email,
              id_rol: 1, 
              id_estado: 1
            });
            nav("/completar-perfil");
            return;
          }

          // Si existe pero no tiene cédula, lo mandamos a completar datos
          if (!perfilUsuario || !perfilUsuario.num_documento) {
            console.log("Perfil incompleto detectado. Redirigiendo a /completar-perfil");
            nav("/completar-perfil");
          }
        }
      } catch (error) {
        console.error("Error en el guardián de seguridad:", error);
      }
    };

    verificarYCrearPerfil();
  }, [nav]);

  // --- 2. EFECTO PARA CARGAR LOS VIAJES REALES DESDE SUPABASE ---
  useEffect(() => {
    const consultarViajesDisponibles = async () => {
      setLoading(true);
      try {
        // Consultamos la tabla real de viajes activos (id_estado = 1)
        const { data, error } = await supabase
          .from("tbl_viaje" as any)
          .select("*")
          .eq("id_estado", 1);

        if (error) throw error;

        // SOLUCIÓN AL ERROR DE TYPESCRIPT: Forzamos el casteo con '(data as any)'
        const listaViajes: ViajeBD[] = (data as any) || [];

        // Filtramos localmente por la fecha seleccionada (formato YYYY-MM-DD)
        const filtrados = listaViajes.filter((v) => {
          const fechaViaje = v.hora_salida.split("T")[0];
          
          // Mapeamos el tipo de vehículo: id_vehiculo = 1 es Buseta, id_vehiculo = 2 es Taxi
          const coincideVehiculo = tipo === "buseta" ? v.id_vehiculo === 1 : v.id_vehiculo === 2;
          
          // Mapeamos tu id_ruta de prueba (Ruta #1: Medellín - Ciudad Bolívar o viceversa)
          const coincideRuta = v.id_ruta === 1; 

          return fechaViaje === fechaStr && coincideVehiculo && coincideRuta;
        });

        setViajesFiltrados(filtrados);
      } catch (error: any) {
        console.error("Error cargando viajes:", error);
        toast.error("No se pudieron cargar los viajes en tiempo real.");
        setViajesFiltrados([]);
      } finally {
        setLoading(false);
      }
    };

    consultarViajesDisponibles();
  }, [fechaStr, tipo, origen, destino]);

  // --- 3. LÓGICA DE COMPRA REAL INTEGRADA CON EL TRIGGER ---
  const handleComprarReal = async (viajeId: number, asientosDisponibles: number) => {
    if (!user) { 
      nav("/auth"); 
      return; 
    }

    if (asientosDisponibles <= 0) {
      toast.error("Este viaje se encuentra completamente lleno.");
      return;
    }

    try {
      setComprandoId(viajeId);

      const queryTiquete = supabase.from("tbl_tiquete" as any) as any;

      // Insertamos la compra en tbl_tiquete.
      // ¡Tu disparador automático restará de inmediato el puesto en tbl_viaje!
      const { error } = await queryTiquete.insert({
        id_viaje: viajeId,
        email_pasajero: user.email,
        asientos_comprados: 1 // Por defecto compra 1 asiento
      });

      if (error) throw error;

      toast.success("¡Tiquete adquirido con éxito! Buen viaje.");

      // Actualizamos los asientos libres en la pantalla en tiempo real sin recargar
      setViajesFiltrados((prev) =>
        prev.map((v) => (v.id === viajeId ? { ...v, asientos_disponibles: v.asientos_disponibles - 1 } : v))
      );

    } catch (error: any) {
      toast.error(error.message || "No se pudo completar la compra.");
    } finally {
      setComprandoId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-12">
        <header className="mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold">Viajes disponibles</h1>
          <p className="text-muted-foreground mt-2">Selecciona origen, destino, fecha, tipo de vehículo y la hora de salida.</p>
        </header>

        <div className="grid lg:grid-cols-[320px_1fr] gap-8">
          
          <aside className="space-y-6 lg:sticky lg:top-24 self-start">
            <div className="p-5 rounded-2xl bg-card border border-border shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Ruta</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Origen</label>
                  <Select value={origen} onValueChange={(v) => setOrigen(v as Ciudad)}>
                    <SelectTrigger className="w-full [&>span]:flex-1 [&>span]:text-left">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <SelectValue placeholder="Selecciona origen" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {CIUDADES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Destino</label>
                  <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                    <MapPin className="mr-2 h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{destino}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-5 rounded-2xl bg-card border border-border shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Fecha</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-medium")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "EEEE, d 'de' MMMM", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                    initialFocus
                    locale={es}
                    className={cn("p-3 pointer-events-auto")}
                  />
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
                <TabsContent value="buseta" className="mt-3 text-sm text-muted-foreground">
                  Capacidad: 15 cupos · Tarifas según trayecto oficial de la cooperativa.
                </TabsContent>
                <TabsContent value="taxi" className="mt-3 text-sm text-muted-foreground">
                  Capacidad: 4 cupos · Servicio rápido puerta a puerta.
                </TabsContent>
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
                    No se encontraron viajes programados en Supabase para los filtros seleccionados hoy.
                  </p>
                ) : (
                  viajesFiltrados.map((viaje) => {
                    const lleno = viaje.asientos_disponibles <= 0;
                    // Extraemos los caracteres de la hora del timestamp (ej: 10:00)
                    const horaFormateada = viaje.hora_salida.split("T")[1]?.slice(0, 5) || "00:00";

                    return (
                      <article key={viaje.id}
                        className={cn(
                          "p-5 rounded-2xl border bg-gradient-card transition-smooth",
                          lleno ? "opacity-50" : "hover:shadow-elegant hover:-translate-y-0.5"
                        )}>
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">Salida</p>
                            <p className="text-3xl font-extrabold mt-1">{formatHora(horaFormateada)}</p>
                          </div>
                          <div className={cn("text-xs font-bold px-2.5 py-1 rounded-full",
                            lleno ? "bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground")}>
                            {lleno ? "Lleno" : `${viaje.asientos_disponibles}/${capacidadMax} cupos`}
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <p className="text-lg font-bold text-primary">{formatPrecio(viaje.precio)}</p>
                          <Button
                            size="sm"
                            disabled={lleno || comprandoId === viaje.id}
                            onClick={() => handleComprarReal(viaje.id, viaje.asientos_disponibles)}
                            className="bg-primary hover:bg-primary/90"
                          >
                            {comprandoId === viaje.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Comprar"}
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