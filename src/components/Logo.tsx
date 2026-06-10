export interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
}

const HEIGHTS: Record<NonNullable<LogoProps["size"]>, number> = {
  sm: 48,
  md: 72,
  lg: 100,
  xl: 120,
};

export default function Logo({ size = "md" }: LogoProps) {
  return <img src="/logo.png" alt="o²Wave" height={HEIGHTS[size]} style={{ height: HEIGHTS[size], width: "auto" }} />;
}
