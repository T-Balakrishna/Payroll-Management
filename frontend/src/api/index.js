import axios from "axios";

const backendPort = Number(import.meta.env.VITE_BACKEND_PORT) || 5000;
const baseURL = `http://localhost:${backendPort}/api`;

const API = axios.create({
  baseURL,
  withCredentials: true,
});

const CSRF_API = axios.create({
  baseURL,
  withCredentials: true,
});

let csrfTokenCache = null;
const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

const ensureCsrfToken = async () => {
  if (csrfTokenCache) return csrfTokenCache;
  const res = await CSRF_API.get('/csrf');
  const token = res?.data?.csrfToken;
  if (token) {
    csrfTokenCache = token;
  }
  return csrfTokenCache;
};

API.interceptors.request.use(async (config) => {
  const method = String(config?.method || 'get').toLowerCase();
  if (UNSAFE_METHODS.has(method)) {
    const token = await ensureCsrfToken();
    if (token) {
      config.headers = config.headers || {};
      config.headers['X-XSRF-TOKEN'] = token;
    }
  }
  return config;
});

const DEFAULT_NAME_FIELDS = ["companyName", "departmentName", "designationName"];

const isDefaultName = (value) =>
  typeof value === "string" && value.trim().toLowerCase() === "default";

const isDefaultEntityRecord = (obj) =>
  obj &&
  typeof obj === "object" &&
  DEFAULT_NAME_FIELDS.some(
    (field) => Object.prototype.hasOwnProperty.call(obj, field) && isDefaultName(obj[field])
  );

const sanitizeDefaultEntities = (value, dropCurrentObject = false) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeDefaultEntities(item, true))
      .filter((item) => item !== null && item !== undefined);
  }

  if (value && typeof value === "object") {
    const sanitized = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      sanitized[key] = sanitizeDefaultEntities(nestedValue, true);
    }

    if (dropCurrentObject && isDefaultEntityRecord(sanitized)) {
      return null;
    }
    return sanitized;
  }

  return value;
};

API.interceptors.response.use(
  (response) => {
    const responseType = String(response?.config?.responseType || "").toLowerCase();
    const contentType = String(response?.headers?.["content-type"] || "").toLowerCase();
    const isBinaryResponse =
      responseType === "blob" ||
      responseType === "arraybuffer" ||
      contentType.includes("application/pdf") ||
      contentType.includes("application/octet-stream");

    if (!isBinaryResponse && response && typeof response.data !== "undefined") {
      // Keep root object shape, but strip "Default" company/department/designation records everywhere else.
      response.data = sanitizeDefaultEntities(response.data, false);
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export default API;
