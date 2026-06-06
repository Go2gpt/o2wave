"use client";

import { useState } from "react";

export default function ChipsInput({
  value,
  onChange,
  placeholder = "Añadir y pulsar Enter",
  max,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  max?: number;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (value.includes(v)) { setDraft(""); return; }
    if (max && value.length >= max) return;
    onChange([...value, v]);
    setDraft("");
  };

  const remove = (i: number) => onChange(value.filter((_, j) => j !== i));

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((chip, i) => (
          <span key={`${chip}-${i}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ backgroundColor: "#fff8ef", color: "#f9b23b" }}>
            {chip}
            <button type="button" onClick={() => remove(i)} aria-label={`Quitar ${chip}`}
              className="text-[#f9b23b]/70 hover:text-[#f9b23b] font-bold leading-none">×</button>
          </span>
        ))}
        {value.length === 0 && <span className="text-xs text-gray-300">Sin elementos</span>}
      </div>
      {(!max || value.length < max) && (
        <div className="flex gap-2">
          <input value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder={placeholder}
            className="flex-1 border-2 border-gray-100 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none transition-colors"
            onFocus={(e) => (e.target.style.borderColor = "#f9b23b")}
            onBlur={(e) => (e.target.style.borderColor = "#f3f4f6")} />
          <button type="button" onClick={add}
            className="px-4 rounded-xl text-sm font-bold border-2 border-gray-200 text-gray-600 hover:bg-gray-50">
            Añadir
          </button>
        </div>
      )}
    </div>
  );
}
