import { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, User, getGetMeQueryKey } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("phishguard_token") : null
  );

  const { data: user, isLoading, refetch } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token,
      retry: false,
    }
  });

  const login = (newToken: string) => {
    localStorage.setItem("phishguard_token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("phishguard_token");
    setToken(null);
  };

  useEffect(() => {
    if (token) {
      refetch();
    }
  }, [token, refetch]);

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading: !!token && isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
