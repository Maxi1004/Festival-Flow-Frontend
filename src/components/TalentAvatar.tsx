import {
  getCloudinaryAvatarUrl,
  type TalentAvatarSize,
} from "../utils/cloudinaryAvatar";

type TalentAvatarProps = {
  src?: string | null;
  name?: string | null;
  size?: TalentAvatarSize;
};

export default function TalentAvatar({
  src,
  name,
  size = "sm",
}: TalentAvatarProps) {
  const displayName = name?.trim() || "Talento";
  const photoUrl = src?.trim()
    ? getCloudinaryAvatarUrl(src, size)
    : "";
  const initial = displayName.charAt(0).toUpperCase() || "T";

  return (
    <div className={`talent-avatar talent-avatar--${size}`}>
      {photoUrl ? (
        <img src={photoUrl} alt={displayName} />
      ) : (
        <span aria-hidden="true">{initial}</span>
      )}
    </div>
  );
}
