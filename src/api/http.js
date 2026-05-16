// src/api/http.js
import axios from "axios";
import {
  forceLogout,
  scheduleAutoLogoutFromToken,
  shouldForceLogout,
} from "./sessionManager";

function cleanBaseUrl(url) {
  return String(url || "").replace(/\/+$/, "");
}

function inferApiBaseFromViteBase() {
  const base = String(import.meta.env.VITE_BASE_URL || "").trim();
  if (!base) return "";

  const normalized = (base.startsWith("/") ? base : `/${base}`).replace(/\/+$/, "");
  return `${normalized}/api`;
}

function ensureApiSuffix(base) {
  const cleaned = cleanBaseUrl(base);
  if (!cleaned) return "";
  if (/\/api$/i.test(cleaned) || /\/api\//i.test(cleaned)) return cleaned;
  return `${cleaned}/api`;
}

function getToken() {
  return (
    localStorage.getItem("book_token") ||
    sessionStorage.getItem("book_token") ||
    localStorage.getItem("token") ||
    sessionStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("accessToken") ||
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token") ||
    ""
  );
}

function getUserMeta() {
  try {
    const raw = localStorage.getItem("book_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const looksLikeObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || "").trim());

const RAW_BASE =
  cleanBaseUrl(import.meta.env.VITE_CRM_API_URL) ||
  cleanBaseUrl(import.meta.env.VITE_LEADS_BASE_URL) ||
  cleanBaseUrl(inferApiBaseFromViteBase()) ||
  "";

const API_BASE = ensureApiSuffix(RAW_BASE);

export const leadHttp = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

leadHttp.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      scheduleAutoLogoutFromToken(token);
    }

    const user = getUserMeta();
    if (user?.name) config.headers["x-user-name"] = user.name;

    if (user?.role) {
      if (looksLikeObjectId(user.role)) {
        config.headers["x-role-id"] = String(user.role).trim();
      } else {
        config.headers["x-role-key"] = String(user.role).trim();
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

leadHttp.interceptors.response.use(
  (response) => {
    const token = getToken();
    if (token) scheduleAutoLogoutFromToken(token);
    return response;
  },
  (error) => {
    if (shouldForceLogout(error)) {
      forceLogout();
    }
    return Promise.reject(error);
  }
);
