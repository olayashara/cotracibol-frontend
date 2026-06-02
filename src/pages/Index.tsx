import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Bus, Car, ShieldCheck, Clock, MapPin } from "lucide-react";
import logo from "@/assets/cotracibol-logo.png";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-95" />
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="container relative py-24 md:py-32 grid md:grid-cols-2 gap-12 items-center text-primary-foreground">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs font-semibold tracking-wider uppercase">
              <MapPin className="h-3 w-3" /> Ciudad Bolívar ↔ Medellín
            </span>
            <h1 className="mt-5 text-5xl md:text-7xl font-extrabold leading-[0.95]">
              Tu camino<br />a casa,<br />
              <span className="text-secondary">a tiempo.</span>
            </h1>
            <p className="mt-6 text-lg text-primary-foreground/90 max-w-md">
              Reserva tu cupo en taxi o buseta en segundos. Salidas programadas
              todos los días desde el corazón del Suroeste antioqueño.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-glow font-semibold">
                <Link to="/viajes">Comprar tiquete <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white">
                <a href="#servicios">Ver servicios</a>
              </Button>
            </div>
          </div>
          <div className="hidden md:flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 blur-3xl bg-secondary/40 rounded-full" />
              <img src={logo} alt="Logo COTRACIBOL"
                className="relative w-[380px] h-[380px] drop-shadow-2xl animate-[spin_60s_linear_infinite]" />
            </div>
          </div>
        </div>
      </section>

      {/* Servicios */}
      <section id="servicios" className="container py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold">Dos formas de viajar</h2>
          <p className="mt-3 text-muted-foreground">Elige según tu ritmo, tu equipaje y tu hora ideal.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <article className="group p-8 rounded-2xl bg-gradient-card border border-border shadow-soft hover:shadow-elegant transition-smooth">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-primary/10 text-primary"><Car className="h-7 w-7" /></div>
              <span className="text-xs font-bold uppercase tracking-wider text-secondary-foreground bg-secondary px-3 py-1 rounded-full">4 cupos</span>
            </div>
            <h3 className="mt-5 text-2xl font-bold">Taxi compartido</h3>
            <p className="mt-2 text-muted-foreground">Salidas cada hora entre 6:00 a.m. y 6:00 p.m. Ideal para viajes rápidos.</p>
            <p className="mt-4 text-3xl font-extrabold text-primary">$18.000 <span className="text-sm font-normal text-muted-foreground">/ pasajero</span></p>
          </article>
          <article className="group p-8 rounded-2xl bg-gradient-card border border-border shadow-soft hover:shadow-elegant transition-smooth">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-primary/10 text-primary"><Bus className="h-7 w-7" /></div>
              <span className="text-xs font-bold uppercase tracking-wider text-secondary-foreground bg-secondary px-3 py-1 rounded-full">8 cupos</span>
            </div>
            <h3 className="mt-5 text-2xl font-bold">Buseta</h3>
            <p className="mt-2 text-muted-foreground">Tres salidas diarias: 6:00 a.m., 12:00 m. y 5:00 p.m. Mayor comodidad y equipaje.</p>
            <p className="mt-4 text-3xl font-extrabold text-primary">$15.000 <span className="text-sm font-normal text-muted-foreground">/ pasajero</span></p>
          </article>
        </div>
      </section>

      {/* Beneficios */}
      <section className="bg-muted/40 border-y border-border/60">
        <div className="container py-16 grid md:grid-cols-3 gap-8">
          {[
            { icon: ShieldCheck, t: "Conductores certificados", d: "Todos nuestros vehículos pasan revisión técnica mensual." },
            { icon: Clock, t: "Puntualidad garantizada", d: "Salidas en hora exacta. Tu tiempo es lo más importante." },
            { icon: MapPin, t: "Ruta directa", d: "Medellín – Ciudad Bolívar sin escalas innecesarias." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="flex gap-4">
              <div className="shrink-0 p-3 rounded-xl bg-primary text-primary-foreground"><Icon className="h-5 w-5" /></div>
              <div>
                <h4 className="font-bold text-lg">{t}</h4>
                <p className="text-sm text-muted-foreground mt-1">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
