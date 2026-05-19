let logoutTimer = null;

function getStoredToken() {
  try {
    return (
      localStorage.getItem("crm_token") ||
      sessionStorage.getItem("crm_token") ||
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

export function clearAuthStorage() {
  try {
    [
      "crm_token",
      "crm_user",
      "token",
      "accessToken",
      "access_token",
      "loginData",
    ].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  } catch {
    // no-op
  }
}

export function redirectToLogin() {
  if (typeof window === "undefined") return;

  if (window.location.pathname !== "/book/login") {
    window.location.assign("/book/login");
  }
}

export function forceLogout() {
  clearTimeout(logoutTimer);
  logoutTimer = null;
  clearAuthStorage();
  redirectToLogin();
}

export function decodeJwt(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;

    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");

    const json = atob(payload);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function scheduleAutoLogoutFromToken(tokenArg) {
  clearTimeout(logoutTimer);
  logoutTimer = null;

  const token = tokenArg || getStoredToken();
  if (!token) return;

  const payload = decodeJwt(token);
  const exp = Number(payload?.exp || 0);
  if (!exp) return;

  const msLeft = exp * 1000 - Date.now();

  if (msLeft <= 0) {
    forceLogout();
    return;
  }

  logoutTimer = window.setTimeout(() => {
    forceLogout();
  }, msLeft);
}

export function shouldForceLogout(error) {
  const status = Number(error?.response?.status || 0);

  const msg = String(
    error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      ""
  ).toLowerCase();

  if (status === 401) return true;

  // Important:
  // 403 is permission denied, not session expired.
  // Do not clear token or redirect to login on 403.
  if (status === 403) return false;

  return (
    msg.includes("jwt expired") ||
    msg.includes("token expired") ||
    msg.includes("invalid token") ||
    msg.includes("authentication token missing") ||
    msg.includes("no token")
  );
}