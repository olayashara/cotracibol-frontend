import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { Bus, Car, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatHora } from "@/lib/horarios";
import { vehiculosService, viajesService, type Vehiculo, type Viaje } from "@/services";

const Conductor = () => {
  const { user } = useAuth();
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [viajes, setViajes] = useState<Viaje[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const vs = await vehiculosService.porConductor(user.id);
        setVehiculos(vs ?? []);
        const ids = (vs ?? []).map((v) => v.id);
        if (ids.length === 0) { setViajes([]); return; }
        const vjs = await viajesService.porVehiculos(ids);
        setViajes(vjs ?? []);
      } catch {
        setVehiculos([]);
        setViajes([]);
      }
    })();
  }, [user]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-12">
        <h1 className="text-4xl font-extrabold">Panel del conductor</h1>
        <p className="text-muted-foreground mt-2">Tus vehículos y los viajes programados.</p>

        <h2 className="text-xl font-bold mt-10 mb-3">Mis vehículos</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {vehiculos.length === 0 && (
            <p className="text-muted-foreground md:col-span-3">No tienes vehículos asignados aún.</p>
          )}
          {vehiculos.map((v) => (
            <div key={v.id} className="p-5 rounded-2xl bg-gradient-card border shadow-soft">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  {v.tipo === "taxi" ? <Car /> : <Bus />}
                </div>
                <span className="text-xs font-bold uppercase">{v.tipo}</span>
              </div>
              <p className="mt-4 text-2xl font-extrabold">{v.placa}</p>
              <p className="text-sm text-muted-foreground">Capacidad: {v.capacidad}</p>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-bold mt-12 mb-3">Próximos viajes</h2>
        <div className="rounded-2xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Fecha</th><th className="p-3">Hora</th><th className="p-3">Tipo</th>
                <th className="p-3 text-right">Tiquetes vendidos</th>
              </tr>
            </thead>
            <tbody>
              {viajes.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Sin viajes programados.</td></tr>
              )}
              {viajes.map((v) => {
                const vendidos = v.capacidad_total - v.cupos_disponibles;
                return (
                  <tr key={v.id} className="border-t">
                    <td className="p-3">{format(new Date(v.fecha + "T00:00:00"), "d MMM yyyy", { locale: es })}</td>
                    <td className="p-3 font-semibold">{formatHora(v.hora.slice(0,5))}</td>
                    <td className="p-3 capitalize">{v.tipo}</td>
                    <td className="p-3 text-right">
                      <span className="inline-flex items-center gap-1 font-bold">
                        <Users className="h-4 w-4 text-primary" />
                        {vendidos} / {v.capacidad_total}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Conductor;
