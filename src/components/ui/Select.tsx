"use client";

import { cn } from "@/lib/utils";
import { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          className="text-sm font-semibold"
          style={{ color: "var(--black)" }}
        >
          {label}
        </label>
      )}
      <select
        {...props}
        className={cn(
          "w-full px-3 py-2.5 text-sm rounded-xl bg-white transition-all duration-200 outline-none",
          "focus:ring-2",
          className
        )}
        style={{
          border: "1.5px solid var(--border)",
          color: "var(--black)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--orange)";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(249,178,59,0.18)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--border)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
