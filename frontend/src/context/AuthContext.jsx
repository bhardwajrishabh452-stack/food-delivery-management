import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "../services/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState("customer");
  const [token, setToken] = useState(localStorage.getItem("fds_token") || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleRefreshedToken = (event) => {
      setToken(event.detail);
    };
    const handleExpiredSession = () => {
      localStorage.removeItem("fds_token");
      setUser(null);
      setRole("customer");
      setToken(null);
      localStorage.removeItem("fds_active_user_id");
      localStorage.setItem("fds_active_role", "customer");
    };
    window.addEventListener("fds-auth-token-refreshed", handleRefreshedToken);
    window.addEventListener("fds-auth-session-expired", handleExpiredSession);
    return () => {
      window.removeEventListener("fds-auth-token-refreshed", handleRefreshedToken);
      window.removeEventListener("fds-auth-session-expired", handleExpiredSession);
    };
  }, []);

  // Initialize user profile on load
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem("fds_token");
        if (storedToken) {
          const profile = await api.auth.getMe();
          setUser(profile.data);
          setRole(profile.data.role);
          setToken(localStorage.getItem("fds_token") || storedToken);
          localStorage.setItem("fds_active_role", profile.data.role);
          localStorage.setItem("fds_active_user_id", profile.data._id);
        }
      } catch (err) {
        console.error("Auth init error:", err);
        localStorage.removeItem("fds_token");
        localStorage.removeItem("fds_active_role");
        localStorage.removeItem("fds_active_user_id");
        setUser(null);
        setRole("customer");
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const register = async (userData) => {
    const res = await api.auth.register(userData);
    if (!res.success) throw new Error("Registration failed");
    const { user: registeredUser, token: registeredToken } = res.data;
    setUser(registeredUser);
    setRole(registeredUser.role);
    setToken(registeredToken);
    localStorage.setItem("fds_token", registeredToken);
    localStorage.setItem("fds_active_role", registeredUser.role);
    localStorage.setItem("fds_active_user_id", registeredUser._id);
    return registeredUser;
  };

  const login = async (email, password) => {
    const res = await api.auth.login({ email, password });
    if (res.success) {
      setUser(res.data.user);
      setRole(res.data.user.role);
      setToken(res.data.token);
      localStorage.setItem("fds_token", res.data.token);
      localStorage.setItem("fds_active_role", res.data.user.role);
      localStorage.setItem("fds_active_user_id", res.data.user._id);
      return res.data.user;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setRole("customer");
    localStorage.removeItem("fds_token");
    localStorage.setItem("fds_active_role", "customer");
    localStorage.removeItem("fds_active_user_id");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        loading,
        register,
        login,
        logout,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
