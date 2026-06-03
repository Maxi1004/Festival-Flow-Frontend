import { useAuth } from "../context/useAuth";

export function useCurrentProfile() {
  const { user, token, profile, isProfileLoading } = useAuth();

  return { user, token, profile, isProfileLoading };
}
