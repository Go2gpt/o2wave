"use client";

interface LogoProps {
  size?: "sm" | "md" | "lg";
}

export default function Logo({ size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <span className={`font-montserrat font-black tracking-tight ${sizeClasses[size]}`}>
      <span style={{ color: "#93bf30" }}>o²</span>
      <span style={{ color: "#f9b23b" }}>Wave</span>
    </span>
  );
}
