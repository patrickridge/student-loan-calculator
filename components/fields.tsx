"use client";

import { useState } from "react";

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

/**
 * Labelled number input. What you type is kept as typed, so clearing the box to type a new number
 * works; the sums use the last valid number, kept between `min` and `max`.
 */
export function NumberField({ id, label, value, onChange, prefix, suffix, step = 1, min = 0, max = Infinity, hint }: NumberFieldProps) {
  const [text, setText] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
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
          value={text ?? String(value)}
          step={step}
          min={min}
          max={Number.isFinite(max) ? max : undefined}
          onChange={(e) => {
            setText(e.target.value);
            const next = e.target.valueAsNumber;
            if (Number.isFinite(next)) onChange(clamp(next));
          }}
          onBlur={() => setText(null)}
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
  /** Highest number that can be typed, if more than the slider goes to. */
  typedMax?: number;
}

/** Number input with a slider underneath. */
export function SliderField({ typedMax, ...props }: SliderFieldProps) {
  const { value, onChange, min = 0, max, step = 1, label } = props;
  return (
    <div className="space-y-3">
      <NumberField {...props} max={typedMax ?? max} />
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
