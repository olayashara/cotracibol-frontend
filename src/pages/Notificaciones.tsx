import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { Bell, CheckCircle2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface NotificacionDinamica {
  id: string;
  titulo: string;
  mensaje: string;
  created_at: string;
  leida: boolean;
}

const Notificaciones = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificacionDinamica[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);

  const load = async () => {
    if (!user?.email) return;
    setCargando(true);
    try {
      // 1. Consultamos los tiquetes reales comprados por este usuario
      const { data: tiquetesData, error: tiquetesError } = await supabase
        .from("tbl_tiquete" as any)
        .select("*")
        .eq("email_pasajero", user.email);

      if (tiquetesError) throw tiquetesError;

      if (!tiquetesData || tiquetesData.length === 0) {
        setItems([]);
        return;
      }

      // 2. Traemos las rutas/viajes para poner nombres bonitos en la notificación
      const { data: viajesData } = await supabase
        .from("tbl_viaje" as any)
        .select("*");

      // Recuperamos qué notificaciones el usuario ya marcó como leídas de forma local
      const leidasLocales = JSON.parse(localStorage.getItem(`leidas_${user.email}`) || "[]");

      // 3. Transformamos cada tiquete en una notificación interactiva en tiempo real
      const listaTiquetes = tiquetesData as any[];
      const listaViajes = viajesData as any[];

      const notificacionesMapeadas: NotificacionDinamica[] = listaTiquetes.map((t) => {
        const v = listaViajes?.find((viaje) => viaje.id === t.id_viaje);
        const origen = v?.id_ruta === 2 ? "Ciudad Bolívar" : "Medellín";
        const destino = v?.id_ruta === 2 ? "Medellín" : "Ciudad Bolívar";
        
        return {
          id: String(t.id),
          titulo: "¡Compra de tiquete confirmada! 🎉",
          mensaje: `Tu reserva para el trayecto de ${origen} hacia ${destino} fue procesada con éxito. Capacidad reservada: ${t.asientos_comprados || 1} cupo(s).`,
          created_at: t.created_at || new Date().toISOString(),
          leida: leidasLocales.includes(String(t.id))
        };
      });

      // Ordenar para que las más nuevitas aparezcan arriba
      notificacionesMapeadas.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setItems(notificacionesMapeadas);

    } catch (error) {
      console.error("Error cargando notificaciones dinámicas:", error);
      setItems([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { 
    if (user) {
      load(); 
    }
  }, [user]);

  // Guarda en localStorage que el tiquete ya se leyó para que cambie de color visualmente
  const marcarLeida = (id: string) => {
    if (!user?.email) return;
    
    const leidasLocales = JSON.parse(localStorage.getItem(`leidas_${user.email}`) || "[]");
    if (!leidasLocales.includes(id)) {
      leidasLocales.push(id);
      localStorage.setItem(`leidas_${user.email}`, JSON.stringify(leidasLocales));
    }

    // Actualizamos el estado de la lista de forma reactiva en pantalla
    setItems((prevItems) =>
      prevItems.map((item) => (item.id === id ? { ...item, leida: true } : item))
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-12 max-w-3xl">
        <h1 className="text-4xl font-extrabold">Notificaciones</h1>
        <p className="text-muted-foreground mt-2">Alertas e historial de transacciones en Cotracibol.</p>

        {cargando ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="animate-spin text-primary h-8 w-8" />
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {items.length === 0 && (
              <div className="p-12 text-center rounded-2xl border border-dashed">
                <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-3 text-muted-foreground">No tienes notificaciones todavía.</p>
              </div>
            )}
            
            {items.map((n) => (
              <article 
                key={n.id}
                className={`p-5 rounded-2xl border flex gap-4 items-start transition-all ${
                  n.leida ? "bg-card opacity-75" : "bg-gradient-card shadow-soft border-primary/30"
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${n.leida ? "bg-muted text-muted-foreground" : "bg-secondary text-secondary-foreground"}`}>
                  <Bell className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900">{n.titulo}</h3>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{n.mensaje}</p>
                  <p className="text-xs text-muted-foreground/80 mt-2 font-medium">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                  </p>
                </div>
                {!n.leida && (
                  <Button size="sm" variant="ghost" onClick={() => marcarLeida(n.id)} className="text-primary hover:text-primary/80 shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
              </article>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Notificaciones;