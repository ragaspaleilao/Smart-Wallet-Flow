import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setUserId, getUserId, clearUserId } from '@/lib/api';

interface AuthContextType {
  userId: string | null;
  isAuthenticated: boolean;
  login: (userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize synchronously from localStorage so isAuthenticated is correct on first render,
  // preventing a spurious redirect to "/" on page refresh.
  const [userId, setUserIdState] = useState<string | null>(() => getUserId());

  const login = (newUserId: string) => {
    setUserId(newUserId);
    setUserIdState(newUserId);
  };

  const logout = () => {
    clearUserId();
    setUserIdState(null);
  };

  return (
    <AuthContext.Provider
      value={{
        userId,
        isAuthenticated: !!userId,
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
