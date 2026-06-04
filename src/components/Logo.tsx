export interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
}

const HEIGHTS: Record<NonNullable<LogoProps["size"]>, number> = {
  sm: 32,
  md: 48,
  lg: 72,
  xl: 120,
};

export default function Logo({ size = "md" }: LogoProps) {
  return <img src="/logo.png" alt="o²Wave" height={HEIGHTS[size]} style={{ height: HEIGHTS[size], width: "auto" }} />;
}
