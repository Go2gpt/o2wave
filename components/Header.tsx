"use client";

import Logo from "./Logo";

type Tab = "generar" | "historial";

interface HeaderProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function Header({ activeTab, onTabChange }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Logo size="md" />
          <nav className="flex gap-1">
            <button
              onClick={() => onTabChange("generar")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeTab === "generar"
                  ? "text-white"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
              style={
                activeTab === "generar"
                  ? { backgroundColor: "#f9b23b" }
                  : {}
              }
            >
              Generar
            </button>
            <button
              onClick={() => onTabChange("historial")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeTab === "historial"
                  ? "text-white"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
              style={
                activeTab === "historial"
                  ? { backgroundColor: "#f9b23b" }
                  : {}
              }
            >
              Historial
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
