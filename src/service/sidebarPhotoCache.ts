const SIDEBAR_PHOTO_KEY_PREFIX = "festival_flow_sidebar_photo_";
const LAST_SIDEBAR_PHOTO_KEY = "festival_flow_last_sidebar_photo";
const LAST_SIDEBAR_UID_KEY = "festival_flow_last_uid";

function getSidebarPhotoKey(userId: string): string {
  return `${SIDEBAR_PHOTO_KEY_PREFIX}${userId}`;
}

export function getCachedSidebarPhoto(userId?: string | null): string {
  if (!userId) {
    return "";
  }

  return localStorage.getItem(getSidebarPhotoKey(userId))?.trim() ?? "";
}

export function setCachedSidebarPhoto(userId: string, photoUrl?: string | null): void {
  const normalizedPhotoUrl = photoUrl?.trim() ?? "";
  const key = getSidebarPhotoKey(userId);

  if (normalizedPhotoUrl) {
    localStorage.setItem(key, normalizedPhotoUrl);
    localStorage.setItem(LAST_SIDEBAR_PHOTO_KEY, normalizedPhotoUrl);
    localStorage.setItem(LAST_SIDEBAR_UID_KEY, userId);
    return;
  }

  localStorage.removeItem(key);
}

export function getLastCachedSidebarPhoto(): string {
  return localStorage.getItem(LAST_SIDEBAR_PHOTO_KEY)?.trim() ?? "";
}

export function clearLastCachedSidebarPhoto(): void {
  localStorage.removeItem(LAST_SIDEBAR_PHOTO_KEY);
  localStorage.removeItem(LAST_SIDEBAR_UID_KEY);
}

export function validateLastCachedSidebarPhoto(userId: string): void {
  const lastUserId = localStorage.getItem(LAST_SIDEBAR_UID_KEY);

  if (lastUserId && lastUserId !== userId) {
    clearLastCachedSidebarPhoto();
  }
}
