export const HORARIOS_BUSETA = ["06:00", "12:00", "17:00"];
export const HORARIOS_TAXI = Array.from({ length: 13 }, (_, i) => `${String(6 + i).padStart(2, "0")}:00`);

export const PRECIO_BUSETA = 15000;
export const PRECIO_TAXI = 18000;
export const CAPACIDAD_BUSETA = 8;
export const CAPACIDAD_TAXI = 4;

export function formatHora(t: string) {
  const [h, m] = t.split(":");
  const hh = parseInt(h, 10);
  const ampm = hh >= 12 ? "p.m." : "a.m.";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${m} ${ampm}`;
}

export function formatPrecio(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}
