import axios from "axios";
import {
  forceLogout,
  scheduleAutoLogoutFromToken,
  shouldForceLogout,
} from "./sessionManager";

function getAuthToken() {
  try {
    return (
      localStorage.getItem("book_token") ||
      sessionStorage.getItem("book_token") ||
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("accessToken") ||
      localStorage.getItem("access_token") ||
      sessionStorage.getItem("access_token") ||
      JSON.parse(localStorage.getItem("loginData") || "null")?.token ||
      JSON.parse(sessionStorage.getItem("loginData") || "null")?.token ||
      ""
    );
  } catch {
    return "";
  }
}

const authAxios = axios.create({
  baseURL: import.meta.env.VITE_AUTH_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

authAxios.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
    scheduleAutoLogoutFromToken(token);
  }
  return config;
});

authAxios.interceptors.response.use(
  (response) => {
    const token = getAuthToken();
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

console.log("Auth Axios Base URL:", authAxios.defaults.baseURL);

export default authAxios;
