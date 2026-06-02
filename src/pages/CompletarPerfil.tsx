import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function CompletarPerfil() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // Campos del formulario
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [numDocumento, setNumDocumento] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
      } else {
        setUserId(user.id);
        setUserEmail(user.email || "");
      }
    };
    checkUser();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tipoDocumento || !numDocumento || !telefono || !fechaNacimiento) {
      toast({
        variant: "destructive",
        title: "Campos incompletos",
        description: "Por favor, llena todos los datos obligatorios para continuar.",
      });
      return;
    }

    try {
      setLoading(true);

      const queryBase = supabase.from("tbl_persona" as any) as any;

      // Realizamos el UPSERT enviando el userId que ya tienes guardado en el estado
      const { error } = await queryBase
        .upsert({
          id: userId,          // <--- Cambiado a userId (así se llama tu estado aquí)
          email: userEmail,    // Clave única para encontrar el registro
          id_tipo_documento: tipoDocumento === "CC" ? 1 : 2,
          num_documento: numDocumento,
          telefono: telefono,
          fecha_nacimiento: fechaNacimiento,
          id_rol: 1,           // Valores numéricos por defecto requeridos en tu BD
          id_estado: 1
        }, { onConflict: 'email' }); // Si el email coincide, actualiza los campos anteriores

      if (error) throw error;

      toast({
        title: "¡Perfil completado!",
        description: "Tus datos se guardaron con éxito. Bienvenido a COTRACIBOL.",
      });

      // Redirección inmediata tras el guardado exitoso
      navigate("/viajes");

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: error.message || "No se pudieron actualizar tus datos.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* SECCIÓN IZQUIERDA: Estética Verde Degradada */}
      <div className="bg-gradient-to-br from-green-700 via-green-600 to-yellow-500 text-white p-12 flex flex-col justify-between hidden md:flex">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-full w-12 h-12 flex items-center justify-center shadow-md">
            <span className="text-green-700 font-bold text-xl">C</span>
          </div>
          <div>
            <h2 className="font-bold tracking-wider text-lg">COTRACIBOL</h2>
            <p className="text-xs text-green-200 uppercase tracking-widest">Ciudad Bolívar - Medellín</p>
          </div>
        </div>

        <div className="space-y-4 max-w-md mb-20">
          <h1 className="text-5xl font-extrabold leading-tight">Queremos conocerte.</h1>
          <p className="text-lg text-green-50">
            Completa tus datos de identificación para poder gestionar tus tiquetes y asegurar tus próximos viajes de forma legal.
          </p>
        </div>

        <p className="text-sm text-green-200">© 2026 COTRACIBOL</p>
      </div>

      {/* SECCIÓN DERECHA: Formulario Estilizado */}
      <div className="bg-slate-50 flex flex-col justify-center px-8 sm:px-16 lg:px-24 py-12 relative overflow-y-auto">
        <div className="max-w-md w-full mx-auto space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Casi listo</h2>
            <p className="text-sm text-slate-500 mt-2">
              Registrado como <span className="font-semibold text-green-600">{userEmail}</span>. Por favor completa la siguiente información.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tipo de documento</label>
                <select
                  value={tipoDocumento}
                  onChange={(e) => setTipoDocumento(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="">Selecciona</option>
                  <option value="CC">Cédula de Ciudadanía</option>
                  <option value="CE">Cédula de Extranjería</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Número de documento</label>
                <Input
                  type="text"
                  placeholder="Ej: 1023456"
                  value={numDocumento}
                  onChange={(e) => setNumDocumento(e.target.value)}
                  className="rounded-lg border-slate-200 p-2.5"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Teléfono de contacto</label>
              <Input
                type="tel"
                placeholder="Ej: 3123456789"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="rounded-lg border-slate-200 p-2.5"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Fecha de nacimiento</label>
              <Input
                type="date"
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                className="rounded-lg border-slate-200 p-2.5 text-slate-600"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-lg transition-colors shadow-md mt-6"
            >
              {loading ? "Guardando datos..." : "Finalizar Registro"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}