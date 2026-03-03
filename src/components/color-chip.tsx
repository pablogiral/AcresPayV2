"use client";

type ColorChipProps = {
  color: string;
  label?: string;
};

function getTextColor(hex: string) {
  const value = hex.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance > 150 ? "#0f172a" : "#f8fafc";
}

export function ColorChip({ color, label = "Color" }: ColorChipProps) {
  return (
    <span
      className="color-chip"
      style={{ backgroundColor: color, color: getTextColor(color) }}
      title={color}
      aria-label={`${label}: ${color}`}
    >
      <span className="color-chip-dot" />
      {label}
    </span>
  );
}
