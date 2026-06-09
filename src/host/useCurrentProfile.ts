import { useAuth } from "../context/useAuth";
import { normalizeRole } from "../utils/authRole";

export function useCurrentProfile() {
  const { user, token, profile, isProfileLoading } = useAuth();
  const role = normalizeRole(profile?.role);

  return { user, token, profile, role, isProfileLoading };
}
