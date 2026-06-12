import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatPrecio } from "@/lib/horarios";
import { Users, UserPlus, Trash2, ArrowRight, HelpCircle, AlertTriangle, Loader2 } from "lucide-react";

interface Pasajero {
  nombre: string;
  apellido: string;
  tipoDocumento: string;
  documento: string;
  fechaNacimiento: string;
  isAsientoExtra: boolean;
}

export const DatosPasajeros = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Estados heredados de Viajes.tsx
  const { viajeId, idVehiculo, precioBase } = location.state || {
    viajeId: null,
    idVehiculo: 2,
    precioBase: 35000,
  };

  // 🔄 MODIFICADO: Estados para controlar los cupos dinámicos de la Base de Datos
  const [maxPasajesPermitidos, setMaxPasajesPermitidos] = useState(4);
  const [cargandoCupos, setCargandoCupos] = useState(true);

  const [cantidadPasajes, setCantidadPasajes] = useState(1);
  const [pasajeros, setPasajeros] = useState<Pasajero[]>([
    { nombre: "", apellido: "", tipoDocumento: "CC", documento: "", fechaNacimiento: "", isAsientoExtra: false },
  ]);

  // 🔄 NUEVO: Consultar asientos disponibles reales en Supabase antes de interactuar
  useEffect(() => {
    if (!viajeId) {
      toast.error("No se detectó una referencia de viaje válida.");
      navigate("/viajes");
      return;
    }

    const verificarCuposReales = async () => {
      try {
        setCargandoCupos(true);
        const { data: viaje, error } = await supabase
          .from("tbl_viaje" as any)
          .select("asientos_disponibles, id_vehiculo")
          .eq("id", viajeId)
          .single() as any;

        if (error) throw error;

        if (viaje) {
          // El tope máximo pasa a ser exactamente el stock actual de la fila del viaje
          setMaxPasajesPermitidos(viaje.asientos_disponibles);
          
          if (viaje.asientos_disponibles <= 0) {
            toast.error("¡Lo sentimos! Este viaje ya no cuenta con asientos disponibles.");
            navigate("/viajes");
          }
        }
      } catch (err) {
        console.error("Error al validar inventario de puestos:", err);
        toast.error("No se pudo sincronizar la disponibilidad con el servidor.");
      } finally {
        setCargandoCupos(false);
      }
    };

    verificarCuposReales();
  }, [viajeId, navigate]);

  // Calcular el total a pagar basándose en pasajes y asientos extras clonados
  const totalPagar = (() => {
    const totalAsientosEfectivos = pasajeros.reduce((acc, p) => {
      return acc + 1 + (p.isAsientoExtra ? 1 : 0);
    }, 0);
    return totalAsientosEfectivos * precioBase;
  })();

  // Sincronizar el número de pasajes con la cantidad de formularios desplegados
  const handleCantidadChange = (nuevaCantidad: number) => {
    // 🔄 MODIFICADO: Bloqueo estricto basado en el stock real de asientos
    if (nuevaCantidad > maxPasajesPermitidos) {
      toast.error(`Solo quedan ${maxPasajesPermitidos} asientos disponibles para este viaje.`);
      return;
    }
    if (nuevaCantidad < 1) return;

    setCantidadPasajes(nuevaCantidad);

    setPasajeros((prev) => {
      if (nuevaCantidad > prev.length) {
        const extras = Array(nuevaCantidad - prev.length).fill(null).map(() => ({
          nombre: "",
          apellido: "",
          tipoDocumento: "CC",
          documento: "",
          fechaNacimiento: "",
          isAsientoExtra: false,
        }));
        return [...prev, ...extras];
      } else {
        return prev.slice(0, nuevaCantidad);
      }
    });
  };

  const handlePasajeroChange = (index: number, field: keyof Pasajero, value: any) => {
    setPasajeros((prev) => {
      const actualizados = [...prev];
      actualizados[index] = { ...actualizados[index], [field]: value };
      return actualizados;
    });
  };

  // Validaciones de edad y campos obligatorios
  const validarFormularios = (): boolean => {
    for (let i = 0; i < pasajeros.length; i++) {
      const p = pasajeros[i];
      if (!p.nombre.trim() || !p.apellido.trim() || !p.documento.trim() || !p.fechaNacimiento) {
        toast.error(`Por favor complete todos los datos del Pasajero #${i + 1}.`);
        return false;
      }

      // Validar edad para menores
      const hoy = new Date();
      const cumple = new Date(p.fechaNacimiento);
      let edad = hoy.getFullYear() - cumple.getFullYear();
      const m = hoy.getMonth() - cumple.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) {
        edad--;
      }

      if (edad < 18 && !p.isAsientoExtra) {
        toast.error(
          `El Pasajero #${i + 1} es menor de edad (${edad} años). Por ley de transporte, los menores deben ocupar y pagar una silla individual de forma obligatoria. Por favor marque la opción 'Asiento Extra/Obligatorio Menor'.`
        );
        return false;
      }
    }
    return true;
  };

  const handleSiguiente = (e: React.FormEvent) => {
    e.preventDefault();

    // 🔄 MODIFICADO: Candado definitivo en el submit
    if (cantidadPasajes > maxPasajesPermitidos) {
      toast.error(`Operación rechazada. Excede el cupo máximo de ${maxPasajesPermitidos} asientos remanentes.`);
      return;
    }

    if (!validarFormularios()) return;

    // Redirección con estado limpio a la pasarela de pago adaptada
    navigate("/pago", {
      state: {
        viajeId,
        idVehiculo,
        cantidadPasajes,
        pasajeros,
        totalPagar,
      },
    });
  };

  if (cargandoCupos) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center gap-2">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
          <p className="text-xs text-muted-foreground font-semibold">Sincronizando disponibilidad de asientos...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/40">
      <Navbar />
      <main className="flex-1 container py-12 max-w-4xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Users className="h-7 w-7 text-primary" /> Datos de los Pasajeros
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Completa el manifiesto de viaje. Los cupos se reservarán de forma definitiva al procesar el pago.
            </p>
          </div>

          {/* Selector de cantidad dinámico ajustado al stock real */}
          <div className="bg-white border rounded-xl p-3 shadow-sm flex items-center gap-4 w-fit">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Cantidad de Pasajes:</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                disabled={cantidadPasajes <= 1}
                onClick={() => handleCantidadChange(cantidadPasajes - 1)}
              >
                -
              </Button>
              <span className="font-black text-slate-800 text-sm px-2 w-4 text-center">{cantidadPasajes}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                disabled={cantidadPasajes >= maxPasajesPermitidos}
                onClick={() => handleCantidadChange(cantidadPasajes + 1)}
              >
                +
              </Button>
            </div>
          </div>
        </div>

        {/* Notificación de cupos máximos */}
        <div className="mb-6 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2.5 text-xs font-medium text-blue-800">
          <HelpCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <span>
            Este viaje cuenta con un tope máximo de <strong>{maxPasajesPermitidos}</strong> puestos libres actualmente.
          </span>
        </div>

        <form onSubmit={handleSiguiente} className="space-y-6">
          {pasajeros.map((pasajero, index) => (
            <fieldset key={index} className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
              <legend className="text-xs font-bold uppercase tracking-wider bg-slate-900 text-white px-3 py-1 rounded-full ml-4">
                Pasajero #{index + 1} {index === 0 && "(Titular)"}
              </legend>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Nombres</label>
                  <Input
                    value={pasajero.nombre}
                    onChange={(e) => handlePasajeroChange(index, "nombre", e.target.value)}
                    placeholder="Ej. Carlos Mario"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Apellidos</label>
                  <Input
                    value={pasajero.apellido}
                    onChange={(e) => handlePasajeroChange(index, "apellido", e.target.value)}
                    placeholder="Ej. Restrepo Vélez"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Documento</label>
                  <Select
                    value={pasajero.tipoDocumento}
                    onValueChange={(val) => handlePasajeroChange(index, "tipoDocumento", val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                      <SelectItem value="CE">Cédula de Extranjería</SelectItem>
                      <SelectItem value="TI">Tarjeta de Identidad</SelectItem>
                      <SelectItem value="PP">Pasaporte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Número Identificación</label>
                  <Input
                    type="number"
                    value={pasajero.documento}
                    onChange={(e) => handlePasajeroChange(index, "documento", e.target.value)}
                    placeholder="Sin puntos ni comas"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Fecha de Nacimiento</label>
                  <Input
                    type="date"
                    value={pasajero.fechaNacimiento}
                    onChange={(e) => handlePasajeroChange(index, "fechaNacimiento", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-dashed flex items-start gap-3 bg-slate-50/50 p-3 rounded-xl">
                <Checkbox
                  id={`asiento-extra-${index}`}
                  checked={pasajero.isAsientoExtra}
                  onCheckedChange={(checked) => handlePasajeroChange(index, "isAsientoExtra", !!checked)}
                />
                <div className="grid gap-1 leading-none">
                  <label
                    htmlFor={`asiento-extra-${index}`}
                    className="text-xs font-bold text-slate-700 cursor-pointer select-none"
                  >
                    Asiento Extra / Obligatorio Menor (+{formatPrecio(precioBase)})
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Marque esta casilla si viaja con un menor de edad o si el pasajero requiere una silla adicional por comodidad.
                  </p>
                </div>
              </div>
            </fieldset>
          ))}

          {/* Barra inferior de acciones estática */}
          <section className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-md">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block">Subtotal Estimado</span>
              <span className="text-3xl font-black text-white">{formatPrecio(totalPagar)}</span>
            </div>
            <Button type="submit" size="lg" className="w-full md:w-auto bg-white hover:bg-slate-100 text-slate-950 font-bold px-8 h-12 rounded-xl flex items-center gap-2">
              Continuar al Pago <ArrowRight className="h-4 w-4" />
            </Button>
          </section>
        </form>
      </main>
      <Footer />
    </div>
  );
};

export default DatosPasajeros;