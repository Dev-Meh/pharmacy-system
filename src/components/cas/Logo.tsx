import { Plane } from "lucide-react";

export function CasLogo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-orange shadow-elevated">
        <Plane className="h-5 w-5 -rotate-45 text-white" strokeWidth={2.5} />
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className={`font-display text-base font-extrabold tracking-tight ${light ? "text-white" : "text-foreground"}`}>
            CAS
          </div>
          <div className={`text-[10px] font-medium uppercase tracking-[0.14em] ${light ? "text-white/70" : "text-muted-foreground"}`}>
            Aviation Service
          </div>
        </div>
      )}
    </div>
  );
}
