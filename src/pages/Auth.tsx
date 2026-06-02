import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { z } from "zod";

const TIPOS_DOC = [
  { value: "cedula", label: "Cédula" },
  { value: "tarjeta_identidad", label: "Tarjeta de identidad" },
  { value: "pasaporte", label: "Pasaporte" },
  { value: "cedula_extranjeria", label: "Cédula de extranjería" },
] as const;

const signupSchema = z.object({
  nombre: z.string().trim().min(1, "Nombre requerido").max(60),
  apellido: z.string().trim().min(1, "Apellido requerido").max(60),
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
  tipo_documento: z.enum(["cedula", "tarjeta_identidad", "pasaporte", "cedula_extranjeria"], {
    errorMap: () => ({ message: "Selecciona un tipo de documento" }),
  }),
  documento: z.string().trim().min(4, "Documento inválido").max(30),
  fecha_nacimiento: z.string().min(1, "Fecha de nacimiento requerida"),
  telefono: z.string().trim().min(7, "Teléfono inválido").max(20),
});
const loginSchema = z.object({
  email: z.string().trim().email("Email inválido"),
  password: z.string().min(1, "Requerido"),
});

type SignupForm = {
  nombre: string; apellido: string; email: string; password: string;
  tipo_documento: "" | "cedula" | "tarjeta_identidad" | "pasaporte" | "cedula_extranjeria";
  documento: string; fecha_nacimiento: string; telefono: string;
};

const Auth = () => {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [signup, setSignup] = useState<SignupForm>({
    nombre: "", apellido: "", email: "", password: "",
    tipo_documento: "", documento: "", fecha_nacimiento: "", telefono: "",
  });
  const [login, setLogin] = useState({ email: "", password: "" });

  useEffect(() => { 
    if (user && !loading) nav("/viajes", { replace: true }); 
  }, [user, loading, nav]);

  if (user) return <Navigate to="/viajes" replace />;

  // 🔄 CORREGIDO: Ahora usa Supabase nativo apuntando a tu proyecto de la universidad
  const handleGoogle = async () => {
    try {
      setBusy(false); // Evitamos bloquear la UI local antes del redireccionamiento externo
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Google te devolverá a la pestaña de viajes de tu app local
          redirectTo: window.location.origin + "/viajes",
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Error en Google Auth:", error.message);
      toast.error("No se pudo iniciar con Google: " + error.message);
      setBusy(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse(signup);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/viajes`,
        data: {
          nombre: parsed.data.nombre,
          apellido: parsed.data.apellido,
          tipo_documento: parsed.data.tipo_documento,
          documento: parsed.data.documento,
          fecha_nacimiento: parsed.data.fecha_nacimiento,
          telefono: parsed.data.telefono,
        },
      },
    });

    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("¡Cuenta creada! Bienvenido a COTRACIBOL");
    nav("/viajes");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse(login);
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
    setBusy(false);
    if (error) { toast.error("Credenciales inválidas"); return; }
    toast.success("Bienvenido de vuelta");
    nav("/viajes");
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex relative bg-gradient-hero text-primary-foreground p-12 flex-col justify-between">
        <Logo />
        <div>
          <h1 className="text-5xl font-extrabold leading-tight">Súbete.<br/>El próximo viaje<br/>te espera.</h1>
          <p className="mt-4 text-primary-foreground/80 max-w-sm">Reserva tu cupo en cualquier momento, desde donde estés.</p>
        </div>
        <p className="text-xs text-primary-foreground/60">© {new Date().getFullYear()} COTRACIBOL</p>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md">
          <div className="md:hidden mb-8"><Logo /></div>
          <Tabs defaultValue="login">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Ingresar</TabsTrigger>
              <TabsTrigger value="signup">Registrarme</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <h2 className="text-3xl font-bold">Bienvenido de vuelta</h2>
              <p className="text-muted-foreground mt-1 text-sm">Ingresa para comprar y consultar tus viajes.</p>
              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div><Label>Email</Label>
                  <Input type="email" value={login.email} onChange={e => setLogin({ ...login, email: e.target.value })} />
                </div>
                <div><Label>Contraseña</Label>
                  <Input type="password" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} />
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-primary hover:bg-primary/90">Ingresar</Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <h2 className="text-3xl font-bold">Crea tu cuenta</h2>
              <p className="text-muted-foreground mt-1 text-sm">Completa tus datos para empezar a viajar.</p>
              <form onSubmit={handleSignup} className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nombre</Label>
                    <Input value={signup.nombre} onChange={e => setSignup({ ...signup, nombre: e.target.value })} />
                  </div>
                  <div><Label>Apellido</Label>
                    <Input value={signup.apellido} onChange={e => setSignup({ ...signup, apellido: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo de documento</Label>
                    <Select
                      value={signup.tipo_documento}
                      onValueChange={(v) => setSignup({ ...signup, tipo_documento: v as SignupForm["tipo_documento"] })}
                    >
                      <SelectTrigger className="w-full [&>span]:flex-1 [&>span]:text-left">
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_DOC.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Número de documento</Label>
                    <Input inputMode="numeric" value={signup.documento} onChange={e => setSignup({ ...signup, documento: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Fecha de nacimiento</Label>
                    <Input type="date" value={signup.fecha_nacimiento} onChange={e => setSignup({ ...signup, fecha_nacimiento: e.target.value })} />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input type="tel" inputMode="tel" value={signup.telefono} onChange={e => setSignup({ ...signup, telefono: e.target.value })} />
                  </div>
                </div>

                <div><Label>Email</Label>
                  <Input type="email" value={signup.email} onChange={e => setSignup({ ...signup, email: e.target.value })} />
                </div>
                <div><Label>Contraseña</Label>
                  <Input type="password" value={signup.password} onChange={e => setSignup({ ...signup, password: e.target.value })} />
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-primary hover:bg-primary/90">Crear cuenta</Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> O <div className="h-px flex-1 bg-border" />
          </div>

          <Button onClick={handleGoogle} disabled={busy} variant="outline" className="w-full gap-3">
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 5.1 29.3 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.3 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 5.1 29.3 3 24 3 16.3 3 9.7 7.4 6.3 14.7z"/><path fill="#4CAF50" d="M24 45c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.3 0-9.7-3.4-11.3-8L6.2 33.6C9.6 40.6 16.2 45 24 45z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C41 35.5 45 30.3 45 24c0-1.2-.1-2.3-.4-3.5z"/></svg>
            Continuar con Google
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
