import React, { createContext, useContext, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { authService } from '../services/authService';
import { ROLE_DASHBOARD_MAP } from '../utils/constants';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const userData = await authService.login(username, password);
      setUser(userData);
      return ROLE_DASHBOARD_MAP[userData.role] || '/dashboard';
    } catch (err) {
      const msg = err.response?.data?.detail || 'Invalid credentials. Please try again.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback((partial) => {
    const merged = authService.updateStoredUser(partial);
    setUser(merged);
    return merged;
  }, []);

  const hasRole = useCallback((...roles) => {
    return user ? roles.includes(user.role) : false;
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, hasRole, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
