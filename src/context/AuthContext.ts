import { createContext } from "react";
import type { User, UserCredential } from "firebase/auth";
import type { AuthProfile } from "../types/auth";

export type AuthContextValue = {
  user: User | null;
  token: string | null;
  profile: AuthProfile | null;
  isProfileLoading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<UserCredential>;
  loginWithGoogle: () => Promise<UserCredential>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfilePhoto: (photoUrl: string) => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
