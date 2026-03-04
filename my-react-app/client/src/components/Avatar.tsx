import React from "react";
import { useAuth } from "@/hooks/use-auth";

interface AvatarProps {
  /** explicit source (overrides logged-in user photo) */
  src?: string | null;
  alt?: string;
  /** pixel size, used for both width and height */
  size?: number;
  className?: string;
}

/**
 * Utility for converting a profile_photo value from the backend into a full URL.
 * Handles previews (blob/data URLs) and falls back to a default icon.
 */
function getPhotoUrl(path: string | null | undefined): string {
  if (!path) {
    return "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png";
  }

  // if it's already a data/blob/http URL just return it
  if (
    path.startsWith("blob:") ||
    path.startsWith("data:") ||
    path.startsWith("http")
  ) {
    return path;
  }

  const relative = path.startsWith("/api")
    ? path
    : `/api/user/profile-photo/${path}`;
  return `http://127.0.0.1:8000${relative}`;
}

export default function Avatar({
  src,
  alt,
  size = 32,
  className = "",
}: AvatarProps) {
  const { user } = useAuth();
  const photo = src ?? user?.profile_photo ?? null;
  const resolved = React.useMemo(() => getPhotoUrl(photo), [photo]);

  const computedAlt =
    alt || `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
    "User avatar";

  return (
    <img
      src={resolved}
      alt={computedAlt}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
    />
  );
}
