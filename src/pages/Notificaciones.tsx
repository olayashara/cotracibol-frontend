import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { Bell, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { notificacionesService, type Notificacion } from "@/services";

const Notificaciones = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Notificacion[]>([]);

  const load = async () => {
    if (!user) return;
    try {
      const data = await notificacionesService.porPersona(user.id);
      setItems(data ?? []);
    } catch {
      setItems([]);
    }
  };
  useEffect(() => { load(); }, [user]);

  const marcarLeida = async (id: string) => {
    try { await notificacionesService.marcarLeida(id); } catch { /* noop */ }
    load();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-12 max-w-3xl">
        <h1 className="text-4xl font-extrabold">Notificaciones</h1>
        <div className="mt-8 space-y-3">
          {items.length === 0 && (
            <div className="p-12 text-center rounded-2xl border border-dashed">
              <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-muted-foreground">No tienes notificaciones todavía.</p>
            </div>
          )}
          {items.map((n) => (
            <article key={n.id}
              className={`p-5 rounded-2xl border flex gap-4 items-start ${n.leida ? "bg-card" : "bg-gradient-card shadow-soft border-primary/30"}`}>
              <div className={`p-2 rounded-xl ${n.leida ? "bg-muted" : "bg-secondary text-secondary-foreground"}`}>
                <Bell className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">{n.titulo}</h3>
                <p className="text-sm text-muted-foreground mt-1">{n.mensaje}</p>
                <p className="text-xs text-muted-foreground/80 mt-2">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: es })}
                </p>
              </div>
              {!n.leida && (
                <Button size="sm" variant="ghost" onClick={() => marcarLeida(n.id)}>
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              )}
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Notificaciones;
