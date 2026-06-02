// HTTP client centralizado para el backend de COTRACIBOL.
// Toda la app habla con el backend a través de este cliente, NO con Supabase directamente.
// Configurable vía VITE_API_BASE_URL; por defecto apunta al backend local.
import { supabase } from "@/integrations/supabase/client";

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "http://localhost:8080/api";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Si es false, no intenta adjuntar el token del usuario. Default true. */
  auth?: boolean;
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(
    path.startsWith("http") ? path : `${API_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
  );
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

async function getAuthToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function apiRequest<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, headers = {}, signal, auth = true } = options;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };
  if (body !== undefined) finalHeaders["Content-Type"] = "application/json";

  if (auth) {
    const token = await getAuthToken();
    if (token) finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(buildUrl(path, query), {
    method,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "message" in data && typeof (data as any).message === "string"
        ? (data as any).message
        : `Request failed with status ${res.status}`);
    throw new ApiError(message, res.status, data);
  }

  return data as T;
}

export const api = {
  get:    <T = unknown>(path: string, opts?: Omit<RequestOptions, "method" | "body">) => apiRequest<T>(path, { ...opts, method: "GET" }),
  post:   <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) => apiRequest<T>(path, { ...opts, method: "POST", body }),
  put:    <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) => apiRequest<T>(path, { ...opts, method: "PUT", body }),
  patch:  <T = unknown>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) => apiRequest<T>(path, { ...opts, method: "PATCH", body }),
  delete: <T = unknown>(path: string, opts?: Omit<RequestOptions, "method" | "body">) => apiRequest<T>(path, { ...opts, method: "DELETE" }),
};
