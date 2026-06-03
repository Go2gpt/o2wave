"use client";
export interface LogoProps { size?: "sm" | "md" | "lg" | "xl"; }
const sizes: Record<NonNullable<LogoProps["size"]>, string> = { sm: "text-lg", md: "text-2xl", lg: "text-4xl", xl: "text-6xl" };
export default function Logo({ size = "md" }: LogoProps) {
  return (
    <span className={`font-black tracking-tight leading-none ${sizes[size]}`}>
      <span style={{ color: "#93bf30" }}>o²</span>
      <span style={{ color: "#f9b23b" }}>Wave</span>
    </span>
  );
}
