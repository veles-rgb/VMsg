import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('accessToken');
  });

  function login(data) {
    setUser(data.user);
    setToken(data.accessToken);

    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('accessToken', data.accessToken);
  }

  function logout() {
    setUser(null);
    setToken(null);

    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
  }

  async function verify() {
    if (!token) return false;

    const res = await fetch('/api/auth/verify', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      logout();
      return false;
    }

    const data = await res.json();
    setUser(data.user);

    return true;
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, verify }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
