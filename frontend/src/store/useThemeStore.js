import { create } from "zustand";
import { THEMES, DEFAULT_THEME } from '../constants';

export const useThemeStore = create((set, get) => {
    // Helper to resolve and apply theme
    const applyTheme = (themeValue) => {
        let applied = themeValue;
        if (themeValue === "system") {
            applied = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        }
        document.documentElement.setAttribute("data-theme", applied);
    };

    // System theme change listener
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (e) => {
        if (get().theme === "system") {
            document.documentElement.setAttribute("data-theme", e.matches ? "dark" : "light");
            set({ theme: "system" });
        }
    };

    // Listen to changes
    try {
        mediaQuery.addEventListener("change", handleSystemThemeChange);
    } catch (err) {
        mediaQuery.addListener(handleSystemThemeChange);
    }

    const savedTheme = localStorage.getItem("chat-theme");
    const initialTheme = THEMES.includes(savedTheme) ? savedTheme : DEFAULT_THEME;
    applyTheme(initialTheme);

    return {
        theme: initialTheme,
        setTheme: (theme) => {
            if (!THEMES.includes(theme)) return;
            localStorage.setItem("chat-theme", theme);
            applyTheme(theme);
            set({ theme });
        },
    };
});
