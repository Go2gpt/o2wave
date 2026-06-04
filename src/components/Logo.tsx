"use client";

export interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
}

// Tamaño base en px por prop; el superíndice escala con em relativos a este.
const FONT_SIZES: Record<NonNullable<LogoProps["size"]>, number> = {
  sm: 18,
  md: 24,
  lg: 36,
  xl: 60,
};

export default function Logo({ size = "md" }: LogoProps) {
  const fontSize = FONT_SIZES[size];
  return (
    <span className="inline-flex items-baseline font-black tracking-tight leading-none select-none" style={{ fontSize }}>
      <span className="relative inline-block" style={{ color: "#93bf30" }}>
        O
        <span className="absolute font-black" style={{
          right: "-0.45em",
          top: "-0.1em",
          fontSize: "0.45em",
          lineHeight: 1,
        }}>2</span>
      </span>
      <span style={{ color: "#f9b23b", marginLeft: "0.3em" }}>Wave</span>
    </span>
  );
}
