import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('accessToken');
  });

  const apiUrl = import.meta.env.VITE_API_URL;

  const login = useCallback((data) => {
    setUser(data.user);
    setToken(data.accessToken);

    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('accessToken', data.accessToken);
  }, []);

  const updateUser = useCallback((nextUser) => {
    setUser(nextUser);
    localStorage.setItem('user', JSON.stringify(nextUser));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);

    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
  }, []);

  const verify = useCallback(async () => {
    if (!token) return false;

    try {
      const res = await fetch(`${apiUrl}/auth/verify`, {
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
      localStorage.setItem('user', JSON.stringify(data.user));

      return true;
    } catch {
      logout();
      return false;
    }
  }, [token, apiUrl, logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        verify,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
