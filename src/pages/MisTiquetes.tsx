import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Bus, Car, Ticket } from "lucide-react";
import { formatHora, formatPrecio } from "@/lib/horarios";
import { tiquetesService, type Tiquete } from "@/services";

const MisTiquetes = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Tiquete[]>([]);

  useEffect(() => {
    if (!user) return;
    tiquetesService.porPersona(user.id)
      .then((data) => setItems(data ?? []))
      .catch(() => setItems([]));
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-12">
        <h1 className="text-4xl font-extrabold">Mis tiquetes</h1>
        <p className="text-muted-foreground mt-2">Historial de viajes comprados.</p>

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
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{t.viaje?.origen} → {t.viaje?.destino}</p>
                  <p className="text-2xl font-extrabold mt-1">
                    {t.viaje?.fecha && format(new Date(t.viaje.fecha + "T00:00:00"), "d MMM yyyy", { locale: es })}
                  </p>
                  <p className="text-lg font-semibold text-primary">{formatHora((t.viaje?.hora ?? "00:00").slice(0,5))}</p>
                </div>
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  {t.viaje?.tipo === "taxi" ? <Car /> : <Bus />}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Asiento <b className="text-foreground">{t.numero_asiento}</b></span>
                <span className="font-bold">{formatPrecio(Number(t.precio))}</span>
              </div>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MisTiquetes;
