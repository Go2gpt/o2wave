"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className,
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: "var(--orange)",
      color: "#fff",
    },
    secondary: {
      background: "var(--orange-light)",
      color: "var(--orange)",
    },
    ghost: {
      background: "transparent",
      color: "var(--gray)",
      border: "1px solid var(--border)",
    },
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{ ...variantStyles[variant], ...style }}
      className={cn(
        "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
        "hover:opacity-90 active:scale-[0.98]",
        {
          "px-3 py-1.5 text-sm": size === "sm",
          "px-4 py-2 text-sm": size === "md",
          "px-6 py-3 text-base": size === "lg",
        },
        className
      )}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
