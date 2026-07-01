import { useThemeStore } from "../store/useThemeStore";
import { THEMES } from "../constants";

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();
  return (
    <div className="min-h-screen container mx-auto px-4 pt-20 pb-10 max-w-5xl">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Theme</h2>
          <p className="text-sm text-base-content/70">Choose a theme for your chat interface</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {THEMES.map((t) => {
            const previewTheme = t === "system"
              ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
              : t;
            return (
              <button 
              key={t}
              className={`group flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-200 w-full ${theme === t ? "bg-base-200 border-base-300" : "bg-base-100 hover:bg-base-200/50 border-transparent"}`}
              onClick={()=> setTheme(t)}
              >
                <div className="relative h-12 w-full rounded-lg overflow-hidden border border-base-300" data-theme={previewTheme}>
                  <div className="absolute inset-0 grid grid-cols-4 gap-1 p-2">
                    <div className="rounded-sm bg-primary"></div>
                    <div className="rounded-sm bg-secondary"></div>
                    <div className="rounded-sm bg-accent"></div>
                    <div className="rounded-sm bg-neutral"></div>
                  </div>
                </div>
                <span className="text-xs font-semibold tracking-wide truncate w-full text-center">
                  {t === "system" ? "System Default" : t.charAt(0).toUpperCase() + t.slice(1)}
                </span>
              </button>
            );
          })}

        </div>
      </div>
    </div>
  )
}

export default SettingsPage
