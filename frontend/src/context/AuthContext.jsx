/**
 * Auth Context
 * Global authentication state management
 */

import { createContext, useContext, useState, useEffect } from "react";
import * as authApi from "../api/authApi";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  /**
   * Check if user is authenticated
   */
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("accessToken");

      if (!token) {
        setLoading(false);
        return;
      }

      // Don't optimistically set isAuthenticated — wait for backend confirmation.
      // This prevents a flash of authenticated UI when the token is actually expired.
      try {
        const response = await authApi.getCurrentUser();
        const verifiedUser = response.data.user;
        setUser(verifiedUser);
        setIsAuthenticated(true);
        localStorage.setItem("user", JSON.stringify(verifiedUser));
      } catch (error) {
        // Token is invalid or expired — clear everything
        await logout();
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login user
   */
  const login = async (email, password) => {
    try {
      const response = await authApi.login({ email, password });

      const { user, accessToken, refreshToken } = response.data;

      // Save to localStorage
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(user));

      // Update state
      setUser(user);
      setIsAuthenticated(true);

      return { success: true, user };
    } catch (error) {
      console.error("Login failed:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Login failed",
      };
    }
  };

  // ADD after the login function

  const registerOrg = async (payload) => {
    try {
      const response = await authApi.registerOrg(payload);
      const { user, accessToken, refreshToken } = response.data;
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);
      setIsAuthenticated(true);
      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Registration failed",
      };
    }
  };

  const acceptInvite = async (payload) => {
    try {
      const response = await authApi.acceptInviteApi(payload);
      const { user, accessToken, refreshToken } = response.data;
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(user));
      setUser(user);
      setIsAuthenticated(true);
      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Failed to accept invitation",
      };
    }
  };

  /**
   * Register new user
   */
  const register = async (userData) => {
    try {
      const response = await authApi.register(userData);

      const { user, accessToken, refreshToken } = response.data;

      // Save to localStorage
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(user));

      // Update state
      setUser(user);
      setIsAuthenticated(true);

      return { success: true, user };
    } catch (error) {
      console.error("Registration failed:", error);
      return {
        success: false,
        message: error.response?.data?.message || "Registration failed",
        errors: error.response?.data?.errors || [],
      };
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear localStorage
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");

      // Clear state
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  /**
   * Update user data
   */
  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    registerOrg, // ✅ add this
    acceptInvite, // ✅ add this (you'll need it later)
    logout,
    updateUser,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
export default AuthContext;
