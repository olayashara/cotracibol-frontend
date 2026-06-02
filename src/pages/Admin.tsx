import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatHora, formatPrecio } from "@/lib/horarios";
import {
  conductoresService, tiquetesService, vehiculosService, viajesService,
  type ConductorResumen, type Tiquete, type Vehiculo, type Viaje,
} from "@/services";
import { Bus, Car, Users } from "lucide-react";

const Admin = () => {
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [tiquetes, setTiquetes] = useState<Tiquete[]>([]);
  const [conductores, setConductores] = useState<ConductorResumen[]>([]);

  useEffect(() => {
    viajesService.listar({ limit: 200 }).then(setViajes).catch(() => setViajes([]));
    vehiculosService.listar().then(setVehiculos).catch(() => setVehiculos([]));
    tiquetesService.listar({ limit: 200 }).then(setTiquetes).catch(() => setTiquetes([]));
    conductoresService.listar().then(setConductores).catch(() => setConductores([]));
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-12">
        <h1 className="text-4xl font-extrabold">Administración</h1>
        <p className="text-muted-foreground mt-2">Vista general de operaciones.</p>

        <div className="grid sm:grid-cols-4 gap-4 mt-8">
          <Stat label="Viajes registrados" value={viajes.length} />
          <Stat label="Vehículos" value={vehiculos.length} />
          <Stat label="Tiquetes vendidos" value={tiquetes.length} />
          <Stat label="Conductores" value={conductores.length} />
        </div>

        <Tabs defaultValue="conductores" className="mt-10">
          <TabsList>
            <TabsTrigger value="conductores">Conductores</TabsTrigger>
            <TabsTrigger value="viajes">Viajes</TabsTrigger>
            <TabsTrigger value="vehiculos">Vehículos</TabsTrigger>
            <TabsTrigger value="tiquetes">Tiquetes</TabsTrigger>
          </TabsList>

          <TabsContent value="conductores" className="mt-4 space-y-6">
            {conductores.length === 0 && (
              <div className="p-8 rounded-2xl border border-dashed text-center text-muted-foreground">
                No hay conductores registrados o el backend aún no expone este recurso.
              </div>
            )}
            {conductores.map((c) => (
              <article key={c.persona.id} className="rounded-2xl border bg-card shadow-soft overflow-hidden">
                <header className="p-5 bg-gradient-card border-b">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Conductor</p>
                      <h3 className="text-xl font-extrabold">{c.persona.nombre} {c.persona.apellido}</h3>
                      <p className="text-sm text-muted-foreground">{c.persona.email}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {c.vehiculos.map((v) => (
                        <span key={v.id} className="inline-flex items-center gap-1.5 text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                          {v.tipo === "taxi" ? <Car className="h-3.5 w-3.5" /> : <Bus className="h-3.5 w-3.5" />}
                          {v.placa} · {v.capacidad}
                        </span>
                      ))}
                    </div>
                  </div>
                </header>
                <Table headers={["Fecha", "Hora", "Ruta", "Tipo", "Tiquetes vendidos"]}>
                  {c.viajes.length === 0 && (
                    <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Sin viajes asignados.</td></tr>
                  )}
                  {c.viajes.map((v) => (
                    <tr key={v.id} className="border-t">
                      <td className="p-3">{format(new Date(v.fecha + "T00:00:00"), "d MMM yyyy", { locale: es })}</td>
                      <td className="p-3 font-semibold">{formatHora(v.hora.slice(0,5))}</td>
                      <td className="p-3">{v.origen} → {v.destino}</td>
                      <td className="p-3 capitalize">{v.tipo}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 font-bold">
                          <Users className="h-4 w-4 text-primary" />
                          {v.tiquetes_vendidos} / {v.capacidad_total}
                        </span>
                      </td>
                    </tr>
                  ))}
                </Table>
              </article>
            ))}
          </TabsContent>

          <TabsContent value="viajes" className="mt-4">
            <Table headers={["Fecha", "Hora", "Ruta", "Tipo", "Cupos", "Precio"]}>
              {viajes.map(v => (
                <tr key={v.id} className="border-t">
                  <td className="p-3">{format(new Date(v.fecha + "T00:00:00"), "d MMM yyyy", { locale: es })}</td>
                  <td className="p-3 font-semibold">{formatHora(v.hora.slice(0,5))}</td>
                  <td className="p-3">{v.origen} → {v.destino}</td>
                  <td className="p-3 capitalize">{v.tipo}</td>
                  <td className="p-3">{v.cupos_disponibles}/{v.capacidad_total}</td>
                  <td className="p-3">{formatPrecio(Number(v.precio))}</td>
                </tr>
              ))}
            </Table>
          </TabsContent>

          <TabsContent value="vehiculos" className="mt-4">
            <Table headers={["Placa", "Tipo", "Capacidad", "Activo"]}>
              {vehiculos.map(v => (
                <tr key={v.id} className="border-t">
                  <td className="p-3 font-bold">{v.placa}</td>
                  <td className="p-3 capitalize">{v.tipo}</td>
                  <td className="p-3">{v.capacidad}</td>
                  <td className="p-3">{v.activo ? "Sí" : "No"}</td>
                </tr>
              ))}
            </Table>
          </TabsContent>

          <TabsContent value="tiquetes" className="mt-4">
            <Table headers={["Pasajero", "Viaje", "Asiento", "Precio", "Vendido"]}>
              {tiquetes.map(t => (
                <tr key={t.id} className="border-t">
                  <td className="p-3">
                    <div className="font-semibold">{t.persona?.nombre} {t.persona?.apellido}</div>
                    <div className="text-xs text-muted-foreground">{t.persona?.email}</div>
                  </td>
                  <td className="p-3">
                    {t.viaje && format(new Date(t.viaje.fecha + "T00:00:00"), "d MMM", { locale: es })} ·{" "}
                    {t.viaje && formatHora(t.viaje.hora.slice(0,5))} <span className="capitalize text-muted-foreground">({t.viaje?.tipo})</span>
                  </td>
                  <td className="p-3">{t.numero_asiento}</td>
                  <td className="p-3">{formatPrecio(Number(t.precio))}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {format(new Date(t.created_at), "d MMM HH:mm", { locale: es })}
                  </td>
                </tr>
              ))}
            </Table>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="p-5 rounded-2xl bg-gradient-card border shadow-soft">
    <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-4xl font-extrabold mt-2 text-primary">{value}</p>
  </div>
);

const Table = ({ headers, children }: { headers: string[]; children: React.ReactNode }) => (
  <div className="rounded-2xl border bg-card overflow-x-auto">
    <table className="w-full text-sm">
      <thead className="bg-muted/50">
        <tr className="text-left">{headers.map(h => <th key={h} className="p-3">{h}</th>)}</tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

export default Admin;
