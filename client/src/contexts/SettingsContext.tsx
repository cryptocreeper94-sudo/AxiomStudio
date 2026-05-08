import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface AppSettings {
  appearance: {
    theme: "dark" | "light";
    accentColor: string;
    fontSize: number;
  };
  editor: {
    wordWrap: "on" | "off";
    minimap: boolean;
    tabSize: number;
    formatOnSave: boolean;
  };
  terminal: {
    fontSize: number;
    cursorBlink: boolean;
  };
  ai: {
    defaultAgent: string;
    temperature: number;
    autoRoute: boolean;
  };
}

const defaultSettings: AppSettings = {
  appearance: {
    theme: "dark",
    accentColor: "#06b6d4", // Cyan default
    fontSize: 13,
  },
  editor: {
    wordWrap: "off",
    minimap: true,
    tabSize: 2,
    formatOnSave: false,
  },
  terminal: {
    fontSize: 13,
    cursorBlink: true,
  },
  ai: {
    defaultAgent: "auto",
    temperature: 0.7,
    autoRoute: true,
  },
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  updateSection: <K extends keyof AppSettings>(section: K, values: Partial<AppSettings[K]>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem("axiom_settings");
      if (saved) {
        // Deep merge to ensure missing keys are populated with defaults
        const parsed = JSON.parse(saved);
        return {
          appearance: { ...defaultSettings.appearance, ...parsed.appearance },
          editor: { ...defaultSettings.editor, ...parsed.editor },
          terminal: { ...defaultSettings.terminal, ...parsed.terminal },
          ai: { ...defaultSettings.ai, ...parsed.ai },
        };
      }
    } catch (err) {
      console.warn("Failed to parse settings from localStorage:", err);
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem("axiom_settings", JSON.stringify(settings));
    
    // Apply global CSS variables based on appearance settings
    document.documentElement.style.setProperty("--ax-accent", settings.appearance.accentColor);
    
    // We could also toggle a body class for light/dark mode here
    if (settings.appearance.theme === "light") {
      document.body.classList.add("theme-light");
    } else {
      document.body.classList.remove("theme-light");
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const updateSection = <K extends keyof AppSettings>(section: K, values: Partial<AppSettings[K]>) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...values },
    }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, updateSection, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
