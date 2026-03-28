import { createContext, useContext, useEffect, useState } from "react";
import type { PropsWithChildren } from "react";
import axios from "axios";
import api from "../api/client";

type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_staff: boolean;
};

type LoginPayload = {
  email: string;
  password: string;
};

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const authUserStorageKey = "auth-user";

function readStoredUser(): User | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(authUserStorageKey);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function writeStoredUser(user: User | null) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (user) {
      window.localStorage.setItem(authUserStorageKey, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(authUserStorageKey);
    }
  } catch {
    // Ignore storage failures and keep the auth flow usable.
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUserState] = useState<User | null>(() => readStoredUser());
  const [isLoading, setIsLoading] = useState(true);

  function setUser(user: User) {
    setUserState(user);
    writeStoredUser(user);
  }

  function clearUser() {
    setUserState(null);
    writeStoredUser(null);
  }

  useEffect(() => {
    let active = true;
    const cachedUser = readStoredUser();

    async function loadUser() {
      try {
        await api.get("/auth/csrf");
        const response = await api.get("/auth/me");
        if (active) {
          setUser(response.data);
        }
      } catch (error) {
        if (active) {
          if (axios.isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) {
            clearUser();
          } else if (!cachedUser) {
            clearUser();
          }
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadUser();

    return () => {
      active = false;
    };
  }, []);

  async function login(payload: LoginPayload) {
    await api.get("/auth/csrf");
    const response = await api.post("/auth/login", payload);
    setUser(response.data);
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      clearUser();
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === "admin",
        isStaff: user?.role === "staff",
        isLoading,
        login,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
