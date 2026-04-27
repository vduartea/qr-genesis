import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  type QrDesign,
  type QrFrame,
  type QrPattern,
  type QrShape,
} from "@/lib/qrDesign";

interface DesignPanelProps {
  design: QrDesign;
  onChange: (next: QrDesign) => void;
  disabled?: boolean;
}

const FRAMES: { value: QrFrame; label: string }[] = [
  { value: "none", label: "Sin marco" },
  { value: "simple", label: "Simple" },
  { value: "rounded", label: "Redondeado" },
  { value: "label", label: "Etiqueta" },
];

const SHAPES: { value: QrShape; label: string }[] = [
  { value: "square", label: "Cuadrado" },
  { value: "circle", label: "Círculo" },
  { value: "smooth", label: "Suavizado" },
];

const PATTERNS: { value: QrPattern; label: string }[] = [
  { value: "classic", label: "Clásico" },
  { value: "dots", label: "Puntos" },
  { value: "lines", label: "Suaves" },
];

/** Generic 3-up selector with active state. */
function OptionGroup<T extends string>({
  options,
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-md border px-3 py-2 text-xs font-medium transition",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-soft"
                : "border-border bg-surface text-foreground hover:border-foreground/40",
              disabled && "opacity-50 cursor-not-allowed",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function DesignPanel({ design, onChange, disabled }: DesignPanelProps) {
  const set = <K extends keyof QrDesign>(key: K, value: QrDesign[K]) => {
    onChange({ ...design, [key]: value });
  };

  return (
    <div className="space-y-5 pt-1">
      {/* Colores */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Colores
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="design-fg">Color principal</Label>
            <div className="flex items-center gap-2">
              <input
                id="design-fg"
                type="color"
                value={design.fgColor}
                onChange={(e) => set("fgColor", e.target.value)}
                disabled={disabled}
                className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent disabled:cursor-not-allowed"
              />
              <Input
                value={design.fgColor}
                onChange={(e) => set("fgColor", e.target.value)}
                disabled={disabled}
                maxLength={7}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="design-bg">Fondo</Label>
            <div className="flex items-center gap-2">
              <input
                id="design-bg"
                type="color"
                value={design.bgColor}
                onChange={(e) => set("bgColor", e.target.value)}
                disabled={disabled}
                className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent disabled:cursor-not-allowed"
              />
              <Input
                value={design.bgColor}
                onChange={(e) => set("bgColor", e.target.value)}
                disabled={disabled}
                maxLength={7}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Marco */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Marco
        </p>
        <OptionGroup
          ariaLabel="Marco"
          options={FRAMES}
          value={design.frame}
          onChange={(v) => set("frame", v)}
          disabled={disabled}
        />
        {design.frame === "label" && (
          <div className="space-y-2 pt-1">
            <Label htmlFor="design-label">Texto de la etiqueta</Label>
            <Input
              id="design-label"
              value={design.frameLabel}
              onChange={(e) => set("frameLabel", e.target.value.slice(0, 24))}
              placeholder="ESCANÉAME"
              maxLength={24}
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* Forma */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Forma de los módulos
        </p>
        <OptionGroup
          ariaLabel="Forma"
          options={SHAPES}
          value={design.shape}
          onChange={(v) => set("shape", v)}
          disabled={disabled}
        />
      </div>

      {/* Patrón */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Patrón
        </p>
        <OptionGroup
          ariaLabel="Patrón"
          options={PATTERNS}
          value={design.pattern}
          onChange={(v) => set("pattern", v)}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Mantén el contraste y un color de fondo claro para no afectar la legibilidad.
        </p>
      </div>
    </div>
  );
}