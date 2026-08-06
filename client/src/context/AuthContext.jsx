import React, { createContext, useContext, useState, useEffect } from 'react';
import { getProfile, loginUser, registerUser } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    const token = localStorage.getItem('filemind_token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await getProfile();
      setUser(res.data.user);
      setStats(res.data.stats);
    } catch (err) {
      console.error('Failed to load profile', err);
      localStorage.removeItem('filemind_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (email, password) => {
    const res = await loginUser({ email, password });
    localStorage.setItem('filemind_token', res.data.token);
    setUser({
      _id: res.data._id,
      name: res.data.name,
      email: res.data.email,
      avatar: res.data.avatar,
    });
    await loadUser();
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await registerUser({ name, email, password });
    localStorage.setItem('filemind_token', res.data.token);
    setUser({
      _id: res.data._id,
      name: res.data.name,
      email: res.data.email,
      avatar: res.data.avatar,
    });
    await loadUser();
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('filemind_token');
    setUser(null);
    setStats(null);
  };

  return (
    <AuthContext.Provider value={{ user, stats, loading, login, register, logout, refreshProfile: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
