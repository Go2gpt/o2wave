"use client";

import { useEffect } from "react";

export type ToastState = { message: string; type: "success" | "error" | "info" } | null;

const STYLES: Record<NonNullable<ToastState>["type"], { bg: string; color: string; border: string; icon: string }> = {
  success: { bg: "#f0f7e6", color: "#3f6212", border: "#93bf30", icon: "✅" },
  error: { bg: "#fef2f2", color: "#b91c1c", border: "#fca5a5", icon: "⚠️" },
  info: { bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe", icon: "ℹ️" },
};

export default function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  const s = STYLES[toast.type];

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[80] px-4 w-full max-w-sm">
      <div className="rounded-xl px-4 py-3 shadow-lg text-sm font-semibold flex items-center gap-2"
        style={{ backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
        <span>{s.icon}</span>
        <span className="flex-1">{toast.message}</span>
      </div>
    </div>
  );
}
