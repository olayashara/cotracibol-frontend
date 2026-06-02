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
import { CalendarIcon, Bus, Car, Loader2, MapPin } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CAPACIDAD_BUSETA, CAPACIDAD_TAXI, HORARIOS_BUSETA, HORARIOS_TAXI,
  PRECIO_BUSETA, PRECIO_TAXI, formatHora, formatPrecio,
} from "@/lib/horarios";
import { viajesService } from "@/services";

type Tipo = "taxi" | "buseta";
const CIUDADES = ["Medellín", "Ciudad Bolívar"] as const;
type Ciudad = (typeof CIUDADES)[number];

const Viajes = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [origen, setOrigen] = useState<Ciudad>("Medellín");
  const destino = useMemo<Ciudad>(() => (origen === "Medellín" ? "Ciudad Bolívar" : "Medellín"), [origen]);
  const [date, setDate] = useState<Date>(new Date());
  const [tipo, setTipo] = useState<Tipo>("buseta");
  const [cuposPorHora, setCuposPorHora] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [comprando, setComprando] = useState<string | null>(null);

  const fechaStr = useMemo(() => format(date, "yyyy-MM-dd"), [date]);
  const horarios = tipo === "buseta" ? HORARIOS_BUSETA : HORARIOS_TAXI;
  const capacidad = tipo === "buseta" ? CAPACIDAD_BUSETA : CAPACIDAD_TAXI;
  const precio = tipo === "buseta" ? PRECIO_BUSETA : PRECIO_TAXI;

  const refrescarCupos = async () => {
    const data = await viajesService.listarPorFechaYTipo(fechaStr, tipo, origen, destino);
    const map: Record<string, number> = {};
    (data ?? []).forEach((v) => { map[v.hora.slice(0, 5)] = v.cupos_disponibles; });
    setCuposPorHora(map);
  };

  // --- NUEVO EFECTO: Guardián de seguridad para validar el perfil ---
  useEffect(() => {
    const verificarPerfilObligatorio = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (currentUser) {
          // Consultamos de forma segura usando un bypass genérico de TypeScript
          const queryBase = supabase.from("persona" as any) as any;
          const { data: perfiles, error } = await queryBase
            .select("num_documento")
            .eq("id", currentUser.id);

          if (error) throw error;

          const perfilUsuario = perfiles && perfiles.length > 0 ? perfiles[0] : null;

          // Si el registro existe pero no posee número de documento, va al flujo de onboarding
          if (!perfilUsuario || !perfilUsuario.num_documento) {
            console.log("Perfil incompleto detectado. Redirigiendo a /completar-perfil");
            nav("/completar-perfil");
          }
        }
      } catch (error) {
        console.error("Error validando el perfil de usuario:", error);
      }
    };

    verificarPerfilObligatorio();
  }, [nav]);
  // -----------------------------------------------------------------

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        const data = await viajesService.listarPorFechaYTipo(fechaStr, tipo, origen, destino);
        if (cancel) return;
        const map: Record<string, number> = {};
        (data ?? []).forEach((v) => { map[v.hora.slice(0, 5)] = v.cupos_disponibles; });
        setCuposPorHora(map);
      } catch {
        if (!cancel) setCuposPorHora({});
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [fechaStr, tipo, origen, destino]);

  const handleComprar = (hora: string) => {
    if (!user) { nav("/auth"); return; }
    nav("/pago", {
      state: {
        fecha: fechaStr,
        hora,
        tipo,
        origen,
        destino,
        precio,
      },
    });
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
                  <TabsTrigger value="buseta"><Bus className="h-4 w-4 mr-1" /> Buseta</TabsTrigger>
                  <TabsTrigger value="taxi"><Car className="h-4 w-4 mr-1" /> Taxi</TabsTrigger>
                </TabsList>
                <TabsContent value="buseta" className="mt-3 text-sm text-muted-foreground">
                  8 cupos · {formatPrecio(PRECIO_BUSETA)} · 3 salidas diarias
                </TabsContent>
                <TabsContent value="taxi" className="mt-3 text-sm text-muted-foreground">
                  4 cupos · {formatPrecio(PRECIO_TAXI)} · cada hora 6 a.m.–6 p.m.
                </TabsContent>
              </Tabs>
            </div>
          </aside>

          <section>
            {loading ? (
              <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-primary" /></div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {horarios.map((h) => {
                  const cupos = cuposPorHora[h] ?? capacidad;
                  const lleno = cupos <= 0;
                  return (
                    <article key={h}
                      className={cn(
                        "p-5 rounded-2xl border bg-gradient-card transition-smooth",
                        lleno ? "opacity-50" : "hover:shadow-elegant hover:-translate-y-0.5"
                      )}>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">Salida</p>
                          <p className="text-3xl font-extrabold mt-1">{formatHora(h)}</p>
                        </div>
                        <div className={cn("text-xs font-bold px-2.5 py-1 rounded-full",
                          lleno ? "bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground")}>
                          {lleno ? "Lleno" : `${cupos}/${capacidad} cupos`}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-lg font-bold text-primary">{formatPrecio(precio)}</p>
                        <Button
                          size="sm"
                          disabled={lleno || comprando === h}
                          onClick={() => handleComprar(h)}
                          className="bg-primary hover:bg-primary/90"
                        >
                          {comprando === h ? <Loader2 className="h-4 w-4 animate-spin" /> : "Comprar"}
                        </Button>
                      </div>
                    </article>
                  );
                })}
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