import { create } from "zustand";
import { THEMES,DEFAULT_THEME } from '../constants'

export const useThemeStore = create((set) => ({
    theme: (() => {
        const savedTheme = localStorage.getItem("chat-theme");
        return THEMES.includes(savedTheme) ? savedTheme : DEFAULT_THEME;

    })(),
    setTheme: (theme) => {
        if(!THEMES.includes(theme)) return; 
        localStorage.setItem("chat-theme", theme);
        set({ theme });
    },
}))
