"use client";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

const fieldBase =
  "w-full px-3 py-2.5 text-sm rounded-xl bg-white transition-all duration-200 outline-none placeholder:text-gray-400";

const focusHandlers = {
  onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "var(--orange)";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(249,178,59,0.18)";
  },
  onBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = "var(--border)";
    e.currentTarget.style.boxShadow = "none";
  },
};

export function Input({ label, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-semibold" style={{ color: "var(--black)" }}>
          {label}
        </label>
      )}
      <input
        {...props}
        {...(focusHandlers as object)}
        className={cn(fieldBase, className)}
        style={{ border: "1.5px solid var(--border)", color: "var(--black)" }}
      />
    </div>
  );
}

export function Textarea({ label, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-semibold" style={{ color: "var(--black)" }}>
          {label}
        </label>
      )}
      <textarea
        {...props}
        {...(focusHandlers as object)}
        className={cn(fieldBase, "resize-none", className)}
        style={{ border: "1.5px solid var(--border)", color: "var(--black)" }}
      />
    </div>
  );
}
