import { createStore } from "@lib";

export const themeStore = createStore({
  mode: "light" as "light" | "dark",
  toggleCount: 0,
});

export const toggleTheme = () => {
  themeStore.update((prev) => ({
    mode: prev.mode === "light" ? "dark" : "light",
    toggleCount: prev.toggleCount + 1,
  }));
};
