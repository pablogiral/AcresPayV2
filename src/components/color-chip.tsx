"use client";

type ColorChipProps = {
  color: string;
  label?: string;
  className?: string;
};

export function getReadableTextColor(hex: string) {
  const value = hex.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance > 150 ? "#0f172a" : "#f8fafc";
}

export function ColorChip({ color, label, className }: ColorChipProps) {
  return (
    <span
      className={className ?? "color-chip"}
      style={{ backgroundColor: color, color: getReadableTextColor(color) }}
      title={color}
      aria-label={label ? `${label}: ${color}` : color}
    >
      <span className="color-chip-dot" />
      {label ?? null}
    </span>
  );
}
