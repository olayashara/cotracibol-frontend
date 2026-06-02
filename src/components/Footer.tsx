import { Logo } from "./Logo";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

export const Footer = () => (
  <footer id="contacto" className="border-t border-border/60 bg-muted/40 mt-20">
    <div className="container py-14 grid md:grid-cols-4 gap-10">
      <div className="md:col-span-2">
        <Logo />
        <p className="mt-4 text-sm text-muted-foreground max-w-sm">
          Más de 30 años conectando Ciudad Bolívar y Medellín con seguridad,
          puntualidad y calidez antioqueña.
        </p>
      </div>
      <div>
        <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider">Contacto</h4>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li className="flex items-start gap-2"><Phone className="h-4 w-4 mt-0.5 text-primary" /> +57 300 914 3789</li>
          <li className="flex items-start gap-2"><Mail className="h-4 w-4 mt-0.5 text-primary" /> info@cotracibol.co</li>
          <li className="flex items-start gap-2"><Clock className="h-4 w-4 mt-0.5 text-primary" /> Lun–Dom · 5:30 a.m. – 7:00 p.m.</li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider">Ubicación</h4>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 text-primary" />
            Terminal Sur · Medellín
          </li>
          <li className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5 text-primary" />
            Calle Sexta, Zona Rosa · Ciudad Bolívar, Antioquia
          </li>
        </ul>
      </div>
    </div>
    <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
      © {new Date().getFullYear()} COTRACIBOL · Cooperativa de Transportadores
    </div>
  </footer>
);
