// src/auth/AuthProvider.jsx
import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

const normalizeRoleKey = (r) =>
  String(r || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/_/g, "")
    .replace(/-/g, "");

const looksLikeObjectId = (v) => /^[a-f\d]{24}$/i.test(String(v || "").trim());

const pickRoleKey = (u) => {
  // Try common fields returned by different backends
  const fromKey =
    u?.roleKey ||
    u?.role_name ||
    u?.roleName ||
    u?.role ||
    u?.role_type ||
    u?.type;

  // If role is an ObjectId, we cannot treat it as roleKey
  if (looksLikeObjectId(fromKey)) return "";

  return normalizeRoleKey(fromKey);
};

const pickRoleId = (u) => {
  const cand = u?.roleId || u?.role_id || u?.role;
  return looksLikeObjectId(cand) ? String(cand).trim() : "";
};

export const AuthProvider = ({ children }) => {
  // 1) Initialize State from LocalStorage (prevents logout on refresh)
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("book_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem("book_token") || "");

  // 2) Login Function
  const login = (data) => {
    // Accepts: { user: {...}, token: "..." } OR plain user object
    const rawUser = data?.user || data || null;
    const tokenData = data?.token || data?.accessToken || data?.access_token || "";

    if (!rawUser) return;

    // ✅ Normalize roles so frontend + headers match backend expectations
    const roleKey = pickRoleKey(rawUser);
    const roleId = pickRoleId(rawUser);

    const userData = {
      ...rawUser,
      roleKey: rawUser.roleKey || roleKey, // stable key
      roleId: rawUser.roleId || roleId,    // stable id (if any)
    };

    setUser(userData);
    setToken(tokenData);

    // Save to Storage IMMEDIATELY
    localStorage.setItem("book_user", JSON.stringify(userData));
    if (tokenData) localStorage.setItem("book_token", tokenData);
  };

  // 3) Logout Function
  const logout = () => {
    setUser(null);
    setToken("");
    localStorage.removeItem("book_user");
    localStorage.removeItem("book_token");
    localStorage.removeItem("book_auth");
  };

  // Keep backward compatibility: role is roleKey if present, else role
  const role = user?.roleKey || (looksLikeObjectId(user?.role) ? "" : user?.role);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, role }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
