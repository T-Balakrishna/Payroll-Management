const normalizeAppBase = (value) => {
  if (!value || value === "/") return "/";
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
};

export const APP_BASE = normalizeAppBase(import.meta.env.BASE_URL);

export const routerBasename = APP_BASE === "/" ? undefined : APP_BASE.replace(/\/$/, "");

export const withAppBase = (path) => {
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  return `${APP_BASE}${normalizedPath}`;
};
