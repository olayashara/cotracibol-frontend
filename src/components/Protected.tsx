import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const Protected = ({ children, role }: { children: ReactNode; role?: "conductor" | "administrador" }) => {
  const { user, roles, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Cargando…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (role && !roles.includes(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};
