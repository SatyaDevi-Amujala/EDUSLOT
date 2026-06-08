import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'bbs.token';
const USER_KEY = 'bbs.user';
const AUTH_CHANGED = 'bbs:auth-changed';

const AuthContext = createContext(null);

function readStored() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

function broadcast() {
  // Notify same-tab listeners (storage event only fires for OTHER tabs).
  window.dispatchEvent(new Event(AUTH_CHANGED));
}

export function AuthProvider({ children }) {
  const [{ token, user }, setState] = useState(readStored);

  useEffect(() => {
    const sync = () => setState(readStored());
    window.addEventListener('storage', sync);
    window.addEventListener(AUTH_CHANGED, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(AUTH_CHANGED, sync);
    };
  }, []);

  const persist = useCallback((nextToken, nextUser) => {
    if (nextToken) {
      localStorage.setItem(TOKEN_KEY, nextToken);
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
    setState({ token: nextToken, user: nextUser });
    broadcast();
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    persist(data.token, data.user);
    return data.user;
  }, [persist]);

  const signup = useCallback(async (name, email, password) => {
    const res = await fetch(`${API}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    persist(data.token, data.user);
    return data.user;
  }, [persist]);

  const logout = useCallback(() => persist(null, null), [persist]);

  const value = useMemo(
    () => ({ token, user, login, signup, logout, api: API }),
    [token, user, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
