"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import GenerateForm from "@/components/GenerateForm";
import ResultScreen from "@/components/ResultScreen";
import HistoryScreen from "@/components/HistoryScreen";
import { FormData, GeneratedContent } from "@/lib/types";

type Tab = "generar" | "historial";
type View = "form" | "result";

const HISTORY_KEY = "o2wave_history";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("generar");
  const [view, setView] = useState<View>("form");
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [isRegeneratingText, setIsRegeneratingText] = useState(false);
  const [currentContent, setCurrentContent] = useState<GeneratedContent | null>(null);
  const [history, setHistory] = useState<GeneratedContent[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const saveToHistory = (content: GeneratedContent) => {
    setHistory((prev) => {
      const updated = [...prev, content];
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const updateInHistory = (updated: GeneratedContent) => {
    setHistory((prev) => {
      const newHistory = prev.map((item) =>
        item.id === updated.id ? updated : item
      );
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
      } catch {
        // ignore
      }
      return newHistory;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      // ignore
    }
  };

  const generateText = async (formData: FormData): Promise<string> => {
    const res = await fetch("/api/generate-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Error generando texto");
    return data.texto;
  };

  const generateImage = async (formData: FormData): Promise<string | undefined> => {
    if (formData.redSocial === "TikTok") return undefined;
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formData }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Error generando imagen");
    return data.imagenUrl;
  };

  const handleGenerate = async (formData: FormData) => {
    setError(null);
    setIsLoadingText(true);
    setIsLoadingImage(formData.redSocial !== "TikTok");

    try {
      // Generate text and image in parallel
      const [texto, imagenUrl] = await Promise.all([
        generateText(formData),
        generateImage(formData),
      ]);

      const content: GeneratedContent = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        texto,
        imagenUrl,
        formData,
        fechaCreacion: new Date().toISOString(),
        esTikTok: formData.redSocial === "TikTok",
      };

      setCurrentContent(content);
      saveToHistory(content);
      setView("result");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
    } finally {
      setIsLoadingText(false);
      setIsLoadingImage(false);
    }
  };

  const handleRegenerateImage = async () => {
    if (!currentContent) return;
    setIsRegeneratingImage(true);
    setError(null);
    try {
      const imagenUrl = await generateImage(currentContent.formData);
      const updated = { ...currentContent, imagenUrl };
      setCurrentContent(updated);
      updateInHistory(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  const handleRegenerateText = async () => {
    if (!currentContent) return;
    setIsRegeneratingText(true);
    setError(null);
    try {
      const texto = await generateText(currentContent.formData);
      const updated = { ...currentContent, texto };
      setCurrentContent(updated);
      updateInHistory(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
    } finally {
      setIsRegeneratingText(false);
    }
  };

  const handleRestart = () => {
    setView("form");
    setCurrentContent(null);
    setError(null);
  };

  const handleSelectFromHistory = (content: GeneratedContent) => {
    setCurrentContent(content);
    setView("result");
    setActiveTab("generar");
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f3f4f6", fontFamily: "var(--font-montserrat), Montserrat, sans-serif" }}>
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === "generar" && view === "form") {
            // stay on form
          }
        }}
      />

      {/* Error banner */}
      {error && (
        <div className="max-w-2xl mx-auto px-4 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-red-500 text-lg flex-shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-semibold text-red-700">Algo fue mal</p>
              <p className="text-xs text-red-500 mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600 flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      {activeTab === "generar" ? (
        view === "form" ? (
          <GenerateForm
            onGenerate={handleGenerate}
            isLoading={isLoadingText || isLoadingImage}
          />
        ) : currentContent ? (
          <ResultScreen
            content={currentContent}
            onRestart={handleRestart}
            onRegenerateImage={handleRegenerateImage}
            onRegenerateText={handleRegenerateText}
            isRegeneratingImage={isRegeneratingImage}
            isRegeneratingText={isRegeneratingText}
          />
        ) : null
      ) : (
        <HistoryScreen
          history={history}
          onSelect={handleSelectFromHistory}
          onClear={clearHistory}
        />
      )}

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-gray-400">
        <span style={{ color: "#93bf30", fontWeight: 700 }}>o²</span>
        <span style={{ color: "#f9b23b", fontWeight: 700 }}>Wave</span>
        {" · "}Potenciado por <span className="font-semibold">Claude AI</span>
        {" · "}© {new Date().getFullYear()} Generación O2
      </footer>
    </div>
  );
}
