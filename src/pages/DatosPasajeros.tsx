import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowRight, Users, UserPlus, ShieldAlert, Armchair } from "lucide-react";
import { formatPrecio } from "@/lib/horarios";

interface PasajeroForm {
  nombre: string;
  apellido: string;
  tipoDocumento: string;
  documento: string;
  fechaNacimiento: string;
  isAsientoExtra: boolean;
  adultoResponsableIdx: string; // Para vincular menores de edad
}

export const DatosPasajeros = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Datos heredados de la pantalla de Viajes
  const { viajeId, precio, idVehiculo, asientosDisponibles } = location.state || {
    viajeId: null,
    precio: 0,
    idVehiculo: 2,
    asientosDisponibles: 1,
  };

  const [cantidadPasajes, setCantidadPasajes] = useState<number>(1);
  const [pasajeros, setPasajeros] = useState<PasajeroForm[]>([
    { nombre: "", apellido: "", tipoDocumento: "CC", documento: "", fechaNacimiento: "", isAsientoExtra: false, adultoResponsableIdx: "" }
  ]);

  // Redirección de seguridad si acceden a la URL directamente sin seleccionar viaje
  useEffect(() => {
    if (!viajeId) {
      toast.error("Sesión inválida. Por favor selecciona tu viaje nuevamente.");
      navigate("/viajes");
    }
  }, [viajeId]);

  // Manejar el cambio en la cantidad de pasajes a comprar
  const handleCantidadChange = (value: string) => {
    const num = Number(value);
    setCantidadPasajes(num);

    // Ajustar el array de formularios dinámicamente manteniendo los datos ya escritos
    setPasajeros((prev) => {
      const nuevoArray = [...prev];
      if (num > prev.length) {
        for (let i = prev.length; i < num; i++) {
          nuevoArray.push({ nombre: "", apellido: "", tipoDocumento: "CC", documento: "", fechaNacimiento: "", isAsientoExtra: false, adultoResponsableIdx: "" });
        }
      } else {
        nuevoArray.length = num;
      }
      return nuevoArray;
    });
  };

  // Actualizar campos individuales del formulario de un pasajero
  const updatePasajeroField = (index: number, field: keyof PasajeroForm, value: any) => {
    setPasajeros((prev) => {
      const actualizados = [...prev];
      actualizados[index] = { ...actualizados[index], [field]: value };
      return actualizados;
    });
  };

  // LÓGICA: Asiento Extra (Clonación del Pasajero Principal)
  const handleAsientoExtraChange = (index: number, checked: boolean) => {
    // Validación: Impedir marcar más de un asiento extra por proceso de compra
    const totalAsientosExtras = pasajeros.filter((p, idx) => idx !== index && p.isAsientoExtra).length;
    if (checked && totalAsientosExtras >= 1) {
      toast.error("Por motivos de seguridad, solo se permite reservar un (1) asiento extra por transacción.");
      return;
    }

    const pasajeroPrincipal = pasajeros[0];
    if (!pasajeroPrincipal.nombre || !pasajeroPrincipal.documento) {
      toast.error("Por favor completa los datos del Pasajero 1 antes de solicitar un asiento extra.");
      return;
    }

    setPasajeros((prev) => {
      const actualizados = [...prev];
      if (checked) {
        actualizados[index] = {
          ...pasajeroPrincipal,
          isAsientoExtra: true,
          adultoResponsableIdx: ""
        };
      } else {
        actualizados[index] = { nombre: "", apellido: "", tipoDocumento: "CC", documento: "", fechaNacimiento: "", isAsientoExtra: false, adultoResponsableIdx: "" };
      }
      return actualizados;
    });
  };

  // Función utilitaria para calcular la edad exacta
  const calcularEdad = (fechaNacimiento: string): number => {
    if (!fechaNacimiento) return 18;
    const hoy = new Date();
    const cumpleanos = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - cumpleanos.getFullYear();
    const m = hoy.getMonth() - cumpleanos.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumpleanos.getDate())) {
      edad--;
    }
    return edad;
  };

  // Obtener lista de adultos válidos cargados en el formulario actual (para el selector de menores)
  const getAdultosDisponibles = () => {
    return pasajeros
      .map((p, idx) => ({ ...p, originalIdx: idx }))
      .filter((p) => p.tipoDocumento === "CC" && calcularEdad(p.fechaNacimiento) >= 18 && p.nombre !== "");
  };

  // PROCESAR Y VALIDAR TODO EL FORMULARIO
  const handleContinuarAlPago = () => {
    // 1. Validar campos vacíos
    for (let i = 0; i < pasajeros.length; i++) {
      const p = pasajeros[i];
      if (!p.nombre || !p.apellido || !p.documento || !p.fechaNacimiento) {
        toast.error(`Por favor diligencie todos los campos obligatorios del Pasajero #${i + 1}`);
        return;
      }
    }

    // 2. LÓGICA DE MENORES DE EDAD Y ADULTOS A CARGO
    const conteoAdultosResponsables: { [key: string]: number } = {};

    for (let i = 0; i < pasajeros.length; i++) {
      const p = pasajeros[i];
      const edad = calcularEdad(p.fechaNacimiento);
      const esMenor = p.tipoDocumento === "TI" || edad < 18;

      if (esMenor) {
        if (!p.adultoResponsableIdx) {
          toast.error(`El Pasajero #${i + 1} es menor de edad. Debe vincular un adulto a cargo del grupo.`);
          return;
        }
        // Ir contando cuántos menores tiene asignados cada adulto
        conteoAdultosResponsables[p.adultoResponsableIdx] = (conteoAdultosResponsables[p.adultoResponsableIdx] || 0) + 1;
        
        // Verificación del límite de la regla de negocio
        if (conteoAdultosResponsables[p.adultoResponsableIdx] > 2) {
          const adultoNombre = pasajeros[Number(p.adultoResponsableIdx)].nombre;
          toast.error(`Regla de Seguridad: El adulto (${adultoNombre}) no puede estar a cargo de más de dos menores de edad.`);
          return;
        }
      }
    }

    // 3. CÁLCULO DEL SUBTOTAL Y ENVÍO DEL ESTADO GLOBAL
    const subtotalCalculado = precio * cantidadPasajes;

    toast.success("Información de pasajeros validada correctamente.");
    
    // Despachamos el estado completo hacia la pasarela de pagos
    navigate("/pago", {
      state: {
        viajeId,
        idVehiculo,
        cantidadPasajes,
        pasajeros,
        totalPagar: subtotalCalculado
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Navbar />
      <main className="flex-1 container py-12 max-w-4xl">
        
        {/* Cabecera */}
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Datos de los Pasajeros</h1>
            <p className="text-sm text-muted-foreground mt-1">Registre la información oficial para la expedición de los tiquetes.</p>
          </div>
          
          {/* Selector de pasajes limitado por el inventario real de la BD */}
          <div className="flex items-center gap-3 bg-white border px-4 py-2.5 rounded-2xl shadow-sm">
            <Users className="h-5 w-5 text-primary" />
            <div className="text-left">
              <span className="text-[10px] text-muted-foreground font-bold block uppercase leading-none">Cantidad de Pasajes</span>
              <Select value={String(cantidadPasajes)} onValueChange={handleCantidadChange}>
                <SelectTrigger className="border-none bg-transparent p-0 h-auto font-black text-slate-900 focus:ring-0 gap-1 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: Math.min(asientosDisponibles, 4) }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      {i + 1} {i + 1 === 1 ? "Pasajero" : "Pasajeros"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        {/* Listado Dinámico de Formularios */}
        <div className="space-y-6">
          {pasajeros.map((pasajero, index) => (
            <article key={index} className="bg-white border rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-black">
                    {index + 1}
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {index === 0 ? "Pasajero Principal (Titular)" : `Pasajero #${index + 1}`}
                  </h3>
                </div>

                {/* Checkbox condicional para Asiento Extra (Aplica del pasajero 2 en adelante) */}
                {index > 0 && (
                  <div className="flex items-center gap-2 bg-slate-50 border px-3 py-1.5 rounded-xl text-xs">
                    <Checkbox
                      id={`extra-${index}`}
                      checked={pasajero.isAsientoExtra}
                      onCheckedChange={(checked) => handleAsientoExtraChange(index, checked === true)}
                    />
                    <label htmlFor={`extra-${index}`} className="font-semibold text-slate-600 flex items-center gap-1 cursor-pointer select-none">
                      <Armchair className="h-3.5 w-3.5 text-amber-500" /> ¿Asiento Extra?
                    </label>
                  </div>
                )}
              </div>

              {/* Formulario Grid de Campos */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Nombres</label>
                  <Input
                    placeholder="Ej. Juan Carlos"
                    value={pasajero.nombre}
                    disabled={pasajero.isAsientoExtra}
                    onChange={(e) => updatePasajeroField(index, "nombre", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Apellidos</label>
                  <Input
                    placeholder="Ej. Pérez Gómez"
                    value={pasajero.apellido}
                    disabled={pasajero.isAsientoExtra}
                    onChange={(e) => updatePasajeroField(index, "apellido", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Tipo Documento</label>
                  <Select
                    value={pasajero.tipoDocumento}
                    disabled={pasajero.isAsientoExtra}
                    onValueChange={(val) => {
                      updatePasajeroField(index, "tipoDocumento", val);
                      if (val === "CC") updatePasajeroField(index, "adultoResponsableIdx", "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CC">Cédula de Ciudadanía (C.C.)</SelectItem>
                      <SelectItem value="TI">Tarjeta de Identidad (T.I.)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Número Documento</label>
                  <Input
                    placeholder="Ej. 10023456"
                    type="number"
                    value={pasajero.documento}
                    disabled={pasajero.isAsientoExtra}
                    onChange={(e) => updatePasajeroField(index, "documento", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Fecha de Nacimiento</label>
                  <Input
                    type="date"
                    value={pasajero.fechaNacimiento}
                    disabled={pasajero.isAsientoExtra}
                    onChange={(e) => updatePasajeroField(index, "fechaNacimiento", e.target.value)}
                  />
                </div>

                {/* Selector Condicional de Menor de Edad */}
                {(pasajero.tipoDocumento === "TI" || (pasajero.fechaNacimiento && calcularEdad(pasajero.fechaNacimiento) < 18)) && !pasajero.isAsientoExtra && (
                  <div className="space-y-1 bg-amber-50 border border-amber-200 p-3 rounded-xl flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 text-amber-800 text-[11px] font-bold uppercase mb-1">
                      <ShieldAlert className="h-3.5 w-3.5" /> Vincular Adulto Responsable
                    </div>
                    <Select
                      value={pasajero.adultoResponsableIdx}
                      onValueChange={(val) => updatePasajeroField(index, "adultoResponsableIdx", val)}
                    >
                      <SelectTrigger className="bg-white border-amber-300 text-xs">
                        <SelectValue placeholder="Seleccione un adulto del grupo" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAdultosDisponibles().map((adulto) => (
                          <SelectItem key={adulto.originalIdx} value={String(adulto.originalIdx)}>
                            {adulto.nombre} {adulto.apellido} (Pasajero {adulto.originalIdx + 1})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>

        {/* Resumen final y botón de acción */}
        <footer className="mt-8 bg-white border rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
          <div className="text-center sm:text-left">
            <span className="text-xs text-muted-foreground font-medium block">Total por {cantidadPasajes} pasajes:</span>
            <span className="text-3xl font-black text-slate-900">{formatPrecio(precio * cantidadPasajes)}</span>
          </div>
          <Button onClick={handleContinuarAlPago} size="lg" className="w-full sm:w-auto font-bold bg-slate-900 hover:bg-slate-800 text-white px-8 rounded-xl h-12">
            Continuar al Pago <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </footer>

      </main>
      <Footer />
    </div>
  );
};

export default DatosPasajeros;