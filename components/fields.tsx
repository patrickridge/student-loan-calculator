"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface NumberFieldProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
  hint?: string;
}

/** Labelled number input. Empty or invalid input counts as the minimum, so the sums never break. */
export function NumberField({ id, label, value, onChange, prefix, suffix, step = 1, min = 0, max, hint }: NumberFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          className={`tabular-nums ${prefix ? "pl-7" : ""} ${suffix ? "pr-20" : ""}`}
          value={Number.isFinite(value) ? value : ""}
          step={step}
          min={min}
          max={max}
          onChange={(e) => {
            const next = Number(e.target.value);
            onChange(Number.isFinite(next) ? Math.max(min, next) : min);
          }}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

interface SliderFieldProps extends NumberFieldProps {
  max: number;
}

/** Number input with a slider underneath, for values people like to drag. */
export function SliderField(props: SliderFieldProps) {
  const { value, onChange, min = 0, max, step = 1, label } = props;
  return (
    <div className="space-y-3">
      <NumberField {...props} />
      <Slider
        aria-label={label}
        value={[Math.min(value, max)]}
        min={min}
        max={max}
        step={step}
        onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)}
      />
    </div>
  );
}
