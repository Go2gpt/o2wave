"use client";

import { useEffect } from "react";

export type ToastState = { message: string; type: "success" | "error" } | null;

export default function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  const ok = toast.type === "success";

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[80] px-4 w-full max-w-sm">
      <div
        className="rounded-xl px-4 py-3 shadow-lg text-sm font-semibold flex items-center gap-2"
        style={
          ok
            ? { backgroundColor: "#f0f7e6", color: "#3f6212", border: "1px solid #93bf30" }
            : { backgroundColor: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5" }
        }
      >
        <span>{ok ? "✅" : "⚠️"}</span>
        <span className="flex-1">{toast.message}</span>
      </div>
    </div>
  );
}
