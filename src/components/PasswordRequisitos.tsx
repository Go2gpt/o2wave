/** Una contraseña válida: ≥8 caracteres y al menos una letra y un número. */
export function passwordValido(v: string): boolean {
  return v.length >= 8 && /(?=.*[a-zA-Z])(?=.*\d)/.test(v);
}

/** Lista de requisitos que se marcan en vivo (✓ verde / ✗ gris). */
export default function PasswordRequisitos({ value }: { value: string }) {
  const reqs = [
    { ok: value.length >= 8, label: "Mínimo 8 caracteres" },
    { ok: /(?=.*[a-zA-Z])(?=.*\d)/.test(value), label: "Al menos una letra y un número" },
  ];
  return (
    <ul className="mt-2 space-y-0.5">
      {reqs.map((r) => (
        <li key={r.label} className="text-[11px] font-medium flex items-center gap-1.5"
          style={{ color: r.ok ? "#3f6212" : "#9ca3af" }}>
          <span>{r.ok ? "✓" : "✗"}</span>{r.label}
        </li>
      ))}
    </ul>
  );
}
