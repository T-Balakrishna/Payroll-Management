import axios from "axios";

const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";
const baseURL = isLocalhost
  ? "http://localhost:5000"
  : "/payroll_management";

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
  const res = await CSRF_API.get('/csrf');
  const token = res?.data?.csrfToken;
  if (token) {
    csrfTokenCache = token;
  }
  return csrfTokenCache;
};

export const clearCsrfTokenCache = () => {
  csrfTokenCache = null;
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
