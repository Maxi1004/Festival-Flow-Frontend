import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { observeAuthState } from "../service/auth";
import { getProfile } from "../service/authApi";
import type { AuthProfile } from "../types/auth";

type CurrentProfileState = {
  user: User | null;
  profile: AuthProfile | null;
  isProfileLoading: boolean;
};

export function useCurrentProfile(): CurrentProfileState {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = observeAuthState(async (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setProfile(null);
        setIsProfileLoading(false);
        return;
      }

      setIsProfileLoading(true);

      try {
        const nextProfile = await getProfile();
        setProfile(nextProfile.user);
      } catch (error) {
        console.error("Error al obtener /auth/me:", error);
        setProfile(null);
      } finally {
        setIsProfileLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    profile,
    isProfileLoading,
  };
}
