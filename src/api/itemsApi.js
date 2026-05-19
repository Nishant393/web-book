import { customerVendorAxios } from "./customerVendorApi";

const cleanBase = (value) => String(value || "").trim().replace(/\/+$/, "");

const API_BASE =
  cleanBase(import.meta.env.VITE_CRM_API_URL) ||
  cleanBase(import.meta.env.VITE_API_BASE_URL) ||
  cleanBase(import.meta.env.VITE_AUTH_BASE_URL) ||
  "";

function apiPath(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (/\/api$/i.test(API_BASE)) {
    return cleanPath.replace(/^\/api/i, "");
  }
  return cleanPath;
}

const unwrap = (res) => res?.data;

export const itemsApi = {
  list: (params = {}) =>
    customerVendorAxios.get(apiPath("/api/items"), { params }).then(unwrap),

  getById: (itemId) =>
    customerVendorAxios.get(apiPath(`/api/items/${itemId}`)).then(unwrap),

  create: (payload) =>
    customerVendorAxios.post(apiPath("/api/items"), payload).then(unwrap),

  update: (itemId, payload) =>
    customerVendorAxios.patch(apiPath(`/api/items/${itemId}`), payload).then(unwrap),

  delete: (itemId) =>
    customerVendorAxios.delete(apiPath(`/api/items/${itemId}`)).then(unwrap),
};
