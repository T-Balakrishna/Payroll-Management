import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true
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
    if (response && typeof response.data !== "undefined") {
      // Keep root object shape, but strip "Default" company/department/designation records everywhere else.
      response.data = sanitizeDefaultEntities(response.data, false);
    }
    return response;
  },
  (error) => Promise.reject(error)
);

export default API;
