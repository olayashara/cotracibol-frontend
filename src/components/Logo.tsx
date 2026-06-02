import logo from "@/assets/cotracibol-logo.png";

export const Logo = ({ size = 40, withText = true }: { size?: number; withText?: boolean }) => (
  <div className="flex items-center gap-3">
    <img src={logo} alt="Logo COTRACIBOL" width={size} height={size} className="rounded-full" />
    {withText && (
      <div className="flex flex-col leading-none">
        <span className="font-extrabold text-lg tracking-tight" style={{ fontFamily: "Outfit" }}>
          COTRACIBOL
        </span>
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Ciudad Bolívar · Medellín
        </span>
      </div>
    )}
  </div>
);
