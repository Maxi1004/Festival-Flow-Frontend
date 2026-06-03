export type FestivalFlowTheme = "light" | "dark";

export const FESTIVAL_FLOW_THEME_KEY = "festival_flow_theme";

export function getStoredTheme(): FestivalFlowTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(FESTIVAL_FLOW_THEME_KEY);
  return storedTheme === "dark" ? "dark" : "light";
}

export function applyFestivalFlowTheme(theme: FestivalFlowTheme) {
  if (typeof document === "undefined") {
    return;
  }

  document.body.classList.remove("light-theme", "dark-theme");
  document.body.classList.add(`${theme}-theme`);
  document.body.dataset.theme = theme;
}

export function persistFestivalFlowTheme(theme: FestivalFlowTheme) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(FESTIVAL_FLOW_THEME_KEY, theme);
}
