// Servicios de dominio. Cada función representa un endpoint REST esperado en el backend
// (http://localhost:8080/api por defecto). Los componentes SOLO llaman a estas funciones.
import { api } from "@/lib/apiClient";

// ===== Tipos =====
export type TipoVehiculo = "taxi" | "buseta";
export type AppRole = "pasajero" | "conductor" | "administrador";

export interface Viaje {
  id: string;
  fecha: string;          // YYYY-MM-DD
  hora: string;           // HH:mm:ss
  tipo: TipoVehiculo;
  origen: string;
  destino: string;
  capacidad_total: number;
  cupos_disponibles: number;
  precio: number;
  vehiculo_id?: string | null;
  created_at?: string;
}

export interface Vehiculo {
  id: string;
  placa: string;
  tipo: TipoVehiculo;
  capacidad: number;
  activo: boolean;
  conductor_id?: string | null;
}

export interface Persona {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string | null;
  documento?: string | null;
}

export interface Tiquete {
  id: string;
  viaje_id: string;
  persona_id: string;
  numero_asiento: number;
  precio: number;
  estado: string;
  created_at: string;
  viaje?: Pick<Viaje, "fecha" | "hora" | "tipo" | "origen" | "destino">;
  persona?: Pick<Persona, "nombre" | "apellido" | "email">;
}

export interface Notificacion {
  id: string;
  persona_id: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  created_at: string;
}

// ===== Viajes =====
export const viajesService = {
  listarPorFechaYTipo: (fecha: string, tipo: TipoVehiculo, origen: string, destino: string) =>
    api.get<Viaje[]>("/viajes", { query: { fecha, tipo, origen, destino } }),

  listar: (params?: { limit?: number }) =>
    api.get<Viaje[]>("/viajes", { query: params }),

  obtenerOCrear: (fecha: string, hora: string, tipo: TipoVehiculo, origen: string, destino: string) =>
    api.post<Viaje>("/viajes/obtener-o-crear", { fecha, hora, tipo, origen, destino }),

  porVehiculos: (vehiculoIds: string[]) =>
    api.get<Viaje[]>("/viajes", { query: { vehiculo_ids: vehiculoIds.join(",") } }),
};

// ===== Vehículos =====
export const vehiculosService = {
  listar: () => api.get<Vehiculo[]>("/vehiculos"),
  porConductor: (conductorId: string) =>
    api.get<Vehiculo[]>("/vehiculos", { query: { conductor_id: conductorId } }),
};

// ===== Tiquetes =====
export const tiquetesService = {
  comprar: (viajeId: string, personaId: string) =>
    api.post<Tiquete>("/tiquetes", { viaje_id: viajeId, persona_id: personaId }),

  porPersona: (personaId: string) =>
    api.get<Tiquete[]>("/tiquetes", { query: { persona_id: personaId } }),

  listar: (params?: { limit?: number }) =>
    api.get<Tiquete[]>("/tiquetes", { query: params }),
};

// ===== Notificaciones =====
export const notificacionesService = {
  porPersona: (personaId: string) =>
    api.get<Notificacion[]>("/notificaciones", { query: { persona_id: personaId } }),

  marcarLeida: (id: string) =>
    api.patch<Notificacion>(`/notificaciones/${id}`, { leida: true }),
};

// ===== Roles =====
export const rolesService = {
  porPersona: (personaId: string) =>
    api.get<{ rol: AppRole }[]>("/roles", { query: { persona_id: personaId } }),
};

// ===== Conductores (vista de administrador) =====
export interface ConductorResumen {
  persona: Persona;
  vehiculos: Vehiculo[];
  viajes: (Viaje & { tiquetes_vendidos: number })[];
}

export const conductoresService = {
  listar: () => api.get<ConductorResumen[]>("/conductores"),
};
