import { Link, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Bell, LogOut, Menu } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

export const Navbar = () => {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const isAdmin = roles.includes("administrador");
  const isConductor = roles.includes("conductor");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/"><Logo /></Link>
        <nav className="hidden md:flex items-center gap-1">
          <Link to="/viajes" className="px-3 py-2 text-sm font-medium hover:text-primary transition-smooth">Viajes</Link>
          <Link to="/#contacto" className="px-3 py-2 text-sm font-medium hover:text-primary transition-smooth">Contacto</Link>
          {isConductor && (
            <Link to="/conductor" className="px-3 py-2 text-sm font-medium hover:text-primary transition-smooth">Mi panel</Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="px-3 py-2 text-sm font-medium hover:text-primary transition-smooth">Administración</Link>
          )}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button variant="ghost" size="icon" onClick={() => navigate("/notificaciones")} aria-label="Notificaciones">
                <Bell className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Menu className="h-4 w-4" />
                    <span className="hidden sm:inline">{user.email?.split("@")[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover">
                  <DropdownMenuItem onClick={() => navigate("/mis-tiquetes")}>Mis tiquetes</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/notificaciones")}>Notificaciones</DropdownMenuItem>
                  {isConductor && <DropdownMenuItem onClick={() => navigate("/conductor")}>Panel conductor</DropdownMenuItem>}
                  {isAdmin && <DropdownMenuItem onClick={() => navigate("/admin")}>Administración</DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button onClick={() => navigate("/auth")} className="bg-primary hover:bg-primary/90">
              Ingresar
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
