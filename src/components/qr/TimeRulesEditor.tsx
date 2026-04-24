import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type TimeRule,
  type TimeRuleValidationError,
} from "@/lib/timeRules";

interface TimeRulesEditorProps {
  rules: TimeRule[];
  onChange: (next: TimeRule[]) => void;
  errors?: TimeRuleValidationError[];
  disabled?: boolean;
}

function errorFor(
  errors: TimeRuleValidationError[] | undefined,
  index: number,
  field: TimeRuleValidationError["field"],
): string | null {
  if (!errors) return null;
  return errors.find((e) => e.index === index && e.field === field)?.message ?? null;
}

export function TimeRulesEditor({
  rules,
  onChange,
  errors,
  disabled,
}: TimeRulesEditorProps) {
  const updateRule = (index: number, patch: Partial<TimeRule>) => {
    onChange(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const removeRule = (index: number) => {
    onChange(rules.filter((_, i) => i !== index));
  };

  const addRule = () => {
    onChange([...rules, { start: "09:00", end: "18:00", url: "" }]);
  };

  return (
    <div className="space-y-3">
      {rules.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Sin reglas. Añade una para redirigir a una URL distinta dentro de un horario.
        </p>
      ) : (
        <ul className="space-y-3">
          {rules.map((rule, index) => {
            const startErr = errorFor(errors, index, "start");
            const endErr = errorFor(errors, index, "end");
            const urlErr = errorFor(errors, index, "url");
            const rangeErr = errorFor(errors, index, "range");
            return (
              <li
                key={index}
                className="space-y-2 rounded-lg border border-border/60 bg-surface p-3"
              >
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={`tr-start-${index}`}
                      className="text-[11px] uppercase tracking-wide text-muted-foreground"
                    >
                      Desde
                    </Label>
                    <Input
                      id={`tr-start-${index}`}
                      type="time"
                      value={rule.start}
                      disabled={disabled}
                      onChange={(e) => updateRule(index, { start: e.target.value })}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={`tr-end-${index}`}
                      className="text-[11px] uppercase tracking-wide text-muted-foreground"
                    >
                      Hasta
                    </Label>
                    <Input
                      id={`tr-end-${index}`}
                      type="time"
                      value={rule.end}
                      disabled={disabled}
                      onChange={(e) => updateRule(index, { end: e.target.value })}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => removeRule(index)}
                    disabled={disabled}
                    aria-label="Quitar regla"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {(startErr || endErr || rangeErr) && (
                  <p className="text-xs text-destructive">
                    {startErr ?? endErr ?? rangeErr}
                  </p>
                )}
                <div className="space-y-1">
                  <Label
                    htmlFor={`tr-url-${index}`}
                    className="text-[11px] uppercase tracking-wide text-muted-foreground"
                  >
                    URL destino
                  </Label>
                  <Input
                    id={`tr-url-${index}`}
                    type="url"
                    placeholder="https://ejemplo.com/horario"
                    value={rule.url}
                    disabled={disabled}
                    onChange={(e) => updateRule(index, { url: e.target.value })}
                  />
                  {urlErr && <p className="text-xs text-destructive">{urlErr}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRule}
        disabled={disabled}
      >
        <Plus className="h-4 w-4" />
        Añadir regla
      </Button>

      <p className="text-xs text-muted-foreground">
        Si la hora del servidor coincide con alguna regla, el QR redirige a esa URL.
        En caso contrario, se usa la URL de destino base. Si <span className="font-medium text-foreground">desde</span> es mayor que <span className="font-medium text-foreground">hasta</span>, la ventana cruza la medianoche.
      </p>
    </div>
  );
}