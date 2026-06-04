export interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
}

const HEIGHTS: Record<NonNullable<LogoProps["size"]>, number> = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 72,
};

export default function Logo({ size = "md" }: LogoProps) {
  return <img src="/logo.png" alt="o²Wave" height={HEIGHTS[size]} style={{ height: HEIGHTS[size], width: "auto" }} />;
}
