"use client";

import { useState } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  className?: string;
  onFocus?: React.FocusEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

/** Input de contraseña con toggle ojo (ver/ocultar). Reutilizable. */
export default function PasswordInput({ value, onChange, placeholder, required, minLength, autoComplete, className = "", onFocus, onBlur }: Props) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className={`${className} pr-11`}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-base leading-none text-gray-400 hover:text-gray-600"
      >
        {show ? "🙈" : "👁"}
      </button>
    </div>
  );
}
