import { createContext, useContext, useEffect, useState } from "react";
import API from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const { data: me } = await API.get("/auth/me");

      try {
        const { data: userDetail } = await API.get(`/users/${me.id}`);
        const { password, ...safeUser } = userDetail || {};
        const merged = {
          ...safeUser,
          id: me.id,
          role: me.role,
        };
        setUser(merged);
        return merged;
      } catch {
        const minimal = { id: me.id, role: me.role };
        setUser(minimal);
        return minimal;
      }
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
