export type TalentAvatarSize = "sm" | "md" | "lg";

const CLOUDINARY_AVATAR_DIMENSIONS: Record<TalentAvatarSize, number> = {
  sm: 104,
  md: 128,
  lg: 224,
};

export function getCloudinaryAvatarUrl(
  src: string,
  size: TalentAvatarSize
): string {
  const normalizedSrc = src.trim();

  if (
    !normalizedSrc ||
    !normalizedSrc.includes("res.cloudinary.com") ||
    !normalizedSrc.includes("/upload/")
  ) {
    return normalizedSrc;
  }

  const dimension = CLOUDINARY_AVATAR_DIMENSIONS[size];
  const transformation = `c_fill,g_face,w_${dimension},h_${dimension}`;

  return normalizedSrc.replace("/upload/", `/upload/${transformation}/`);
}
