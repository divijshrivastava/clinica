import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface User {
  user_id: string;
  hospital_id: string;
  role: "admin" | "doctor" | "nurse" | "receptionist";
  email?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
  checkAuth: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      _hasHydrated: false,
      login: (token: string, user: User) => {
        console.log("Login called with:", { token, user });
        set({ token, user, isAuthenticated: true });
        // Force immediate persistence
        const state = get();
        console.log("State after set:", {
          isAuthenticated: state.isAuthenticated,
          hasToken: !!state.token,
          hasUser: !!state.user,
        });
      },
      logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
      },
      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },
      checkAuth: () => {
        const state = get();
        return !!(state.token && state.user && state.isAuthenticated);
      },
    }),
    {
      name: "mymedic-auth",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => {
        console.log("🔄 Zustand rehydration started");
        return (state, error) => {
          if (error) {
            console.error("❌ Rehydration error:", error);
          } else {
            console.log("✅ Zustand rehydration complete", {
              isAuthenticated: state?.isAuthenticated,
              hasToken: !!state?.token,
              hasUser: !!state?.user,
              state: state,
            });
            // Set hydrated flag
            if (state) {
              state.setHasHydrated(true);
              console.log("✅ _hasHydrated set to true");
            } else {
              console.warn("⚠️ State is null after rehydration");
            }
          }
        };
      },
    }
  )
);
