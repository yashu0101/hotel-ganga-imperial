"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Lang, t as translate } from "./i18n";

type Theme = "dark" | "light";

interface AppContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  t: (key: string) => string;
}

const AppContext = createContext<AppContextType>({
  lang: "en",
  setLang: () => {},
  theme: "dark",
  setTheme: () => {},
  t: (key) => key,
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const [theme, setTheme] = useState<Theme>("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
    let savedLang: Lang | null = null;
    let savedTheme: Theme | null = null;
    try {
      savedLang = localStorage.getItem("lang") as Lang;
      savedTheme = localStorage.getItem("theme") as Theme;
    } catch { /* Preferences remain usable when storage is unavailable. */ }
    if (savedLang === "en" || savedLang === "hi") setLang(savedLang);
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
    setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem("theme", theme); } catch { /* Storage is optional. */ }
  }, [theme, ready]);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.setAttribute("lang", lang);
    try { localStorage.setItem("lang", lang); } catch { /* Storage is optional. */ }
  }, [lang, ready]);

  const t = (key: string) => translate(lang, key);

  return (
    <AppContext.Provider value={{ lang, setLang, theme, setTheme, t }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
