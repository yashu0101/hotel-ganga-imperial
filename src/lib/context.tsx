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

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") as Lang;
    const savedTheme = localStorage.getItem("theme") as Theme;
    if (savedLang === "en" || savedLang === "hi") setLang(savedLang);
    if (savedTheme === "light" || savedTheme === "dark") setTheme(savedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("lang", lang);
    localStorage.setItem("lang", lang);
  }, [lang]);

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
