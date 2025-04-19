import daisyui from "daisyui"
import { THEMES } from "./src/constants";
module.exports = {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {},
    },
    plugins: [daisyui],
    daisyui: {
      themes: THEMES,
      darkTheme: "dark",
      base: true,
      styled: true,
      utils: true,
    },
  }
  