"use client";

import { useState, useEffect } from "react";
import type { GeneratedContent } from "@/types";

const STORAGE_KEY = "o2wave_history";

export function useHistory() {
  const [history, setHistory] = useState<GeneratedContent[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as (GeneratedContent & { createdAt: string })[];
      setHistory(parsed.map((item) => ({ ...item, createdAt: new Date(item.createdAt) })));
    }
  }, []);

  const addToHistory = (item: GeneratedContent) => {
    const updated = [item, ...history].slice(0, 50);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return { history, addToHistory, clearHistory };
}
