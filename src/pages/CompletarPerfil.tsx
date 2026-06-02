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

  // Campos manuales de Nombre y Apellidos (en plural)
  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");

  // Campos del formulario existentes
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

    // Validamos que TODOS los campos manuales estén llenos
    if (!nombre || !apellidos || !tipoDocumento || !numDocumento || !telefono || !fechaNacimiento) {
      toast({
        variant: "destructive",
        title: "Campos incompletos",
        description: "Por favor, llena todos los datos obligatorios para continuar.",
      });
      return;
    }

    // RESTRICCIÓN DE MENORES DE EDAD (Solo nacidos hasta el 1 de enero de 2008)
    const fechaSeleccionada = new Date(fechaNacimiento);
    const fechaLimite = new Date("2008-01-01");

    if (fechaSeleccionada > fechaLimite) {
      toast({
        variant: "destructive",
        title: "Registro no permitido",
        description: "No se pueden registrar menores de edad.",
      });
      return;
    }

    try {
      setLoading(true);

      const queryBase = supabase.from("tbl_persona" as any) as any;

      // Realizamos el UPSERT mapeando "apellidos" exactamente como está en tu base de datos
      const { error } = await queryBase
        .upsert({
          // Se omite el 'id' para evitar el conflicto con el tipo entero (integer)
          email: userEmail,    // Clave única para hacer la coincidencia y actualizar
          id_tipo_documento: tipoDocumento === "CC" ? 1 : 2,
          num_documento: numDocumento,
          telefono: telefono,
          fecha_nacimiento: fechaNacimiento,
          id_rol: 1,           
          id_estado: 1,
          nombre: nombre,       
          apellidos: apellidos  // <-- Corregido en plural para Supabase
        }, { onConflict: 'email' }); 

      if (error) throw error;

      toast({
        title: "¡Perfil completado!",
        description: "Tus datos se guardaron con éxito. Bienvenido a COTRACIBOL.",
      });

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
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Columna Izquierda Estética */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-b from-green-700 to-green-900 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white text-green-800 flex items-center justify-center font-bold text-xl">C</div>
          <div>
            <h1 className="font-bold tracking-wider text-sm">COTRACIBOL</h1>
            <p className="text-xs text-green-200">CIUDAD BOLÍVAR - MEDELLÍN</p>
          </div>
        </div>
        <div className="space-y-6 max-w-md">
          <h2 className="text-5xl font-extrabold tracking-tight leading-none">Queremos conocerte.</h2>
          <p className="text-green-100 text-lg">
            Completa tus datos de identificación para poder gestionar tus tiquetes y asegurar tus próximos viajes de forma legal.
          </p>
        </div>
        <p className="text-xs text-green-300">© 2026 COTRACIBOL</p>
      </div>

      {/* Columna Derecha - Formulario */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-slate-50">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-6">
          <div>
            <h3 className="text-3xl font-black text-slate-800">Casi listo</h3>
            <p className="text-sm text-slate-500 mt-1">
              Registrado como <span className="font-medium text-green-600">{userEmail}</span>. Por favor completa la siguiente información.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* INPUT DE NOMBRE */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">Nombre Completo</label>
              <Input 
                type="text" 
                placeholder="Ej. Juan Carlos" 
                value={nombre} 
                onChange={(e) => setNombre(e.target.value)} 
                className="h-11"
              />
            </div>

            {/* INPUT DE APELLIDOS */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">Apellidos</label>
              <Input 
                type="text" 
                placeholder="Ej. Pérez Gómez" 
                value={apellidos} 
                onChange={(e) => setApellidos(e.target.value)} 
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">Tipo de Documento</label>
                <select 
                  value={tipoDocumento} 
                  onChange={(e) => setTipoDocumento(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Seleccione...</option>
                  <option value="CC">Cédula de Ciudadanía</option>
                  <option value="CE">Cédula de Extranjería</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">Número de Documento</label>
                <Input 
                  type="text" 
                  placeholder="12345678" 
                  value={numDocumento} 
                  onChange={(e) => setNumDocumento(e.target.value)} 
                  className="h-11"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">Teléfono de Contacto</label>
              <Input 
                type="tel" 
                placeholder="3001234567" 
                value={telefono} 
                onChange={(e) => setTelefono(e.target.value)} 
                className="h-11"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">Fecha de Nacimiento</label>
              <Input 
                type="date" 
                value={fechaNacimiento} 
                onChange={(e) => setFechaNacimiento(e.target.value)} 
                className="h-11"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full h-11 bg-green-700 hover:bg-green-800 font-bold text-white transition-colors mt-2">
              {loading ? "Guardando..." : "Finalizar Registro"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}