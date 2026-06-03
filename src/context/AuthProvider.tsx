import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { auth } from "../firebase/config";
import {
  loginWithEmail as loginWithEmailService,
  loginWithGoogle as loginWithGoogleService,
  logoutUser,
  observeAuthState,
} from "../service/auth";
import { getProfile } from "../service/authApi";
import {
  clearLastCachedSidebarPhoto,
  setCachedSidebarPhoto,
  validateLastCachedSidebarPhoto,
} from "../service/sidebarPhotoCache";
import type { AuthProfile } from "../types/auth";
import { AuthContext, type AuthContextValue } from "./AuthContext";

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const requestVersionRef = useRef(0);

  const loadProfile = useCallback(async (firebaseUser: User) => {
    const requestVersion = ++requestVersionRef.current;
    setIsProfileLoading(true);

    try {
      const nextToken = await firebaseUser.getIdToken();
      const nextProfile = await getProfile(nextToken);

      if (requestVersion === requestVersionRef.current) {
        const nextPhotoUrl = nextProfile.user.photo_url?.trim() || nextProfile.user.picture?.trim();

        if (nextPhotoUrl) {
          setCachedSidebarPhoto(nextProfile.user.uid, nextPhotoUrl);
        }

        setToken(nextToken);
        setProfile(nextProfile.user);
      }
    } catch (error) {
      if (requestVersion === requestVersionRef.current) {
        console.error("Error al obtener /auth/me:", error);
        setProfile(null);
      }
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setIsProfileLoading(false);
      }
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const firebaseUser = auth.currentUser;

    if (!firebaseUser) {
      requestVersionRef.current += 1;
      setUser(null);
      setToken(null);
      setProfile(null);
      setIsProfileLoading(false);
      return;
    }

    setUser(firebaseUser);
    await loadProfile(firebaseUser);
  }, [loadProfile]);

  const updateProfilePhoto = useCallback((photoUrl: string) => {
    setProfile((currentProfile) => {
      if (!currentProfile) {
        return currentProfile;
      }

      setCachedSidebarPhoto(currentProfile.uid, photoUrl);
      return { ...currentProfile, photo_url: photoUrl };
    });
  }, []);

  const logout = useCallback(async () => {
    clearLastCachedSidebarPhoto();
    await logoutUser();
  }, []);

  useEffect(() => {
    const unsubscribe = observeAuthState((firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        requestVersionRef.current += 1;
        setToken(null);
        setProfile(null);
        setIsProfileLoading(false);
        return;
      }

      validateLastCachedSidebarPhoto(firebaseUser.uid);
      setToken(null);
      void loadProfile(firebaseUser);
    });

    return () => {
      requestVersionRef.current += 1;
      unsubscribe();
    };
  }, [loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      profile,
      isProfileLoading,
      loginWithEmail: loginWithEmailService,
      loginWithGoogle: loginWithGoogleService,
      logout,
      refreshProfile,
      updateProfilePhoto,
    }),
    [isProfileLoading, logout, profile, refreshProfile, token, updateProfilePhoto, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
