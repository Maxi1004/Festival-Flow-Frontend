export type UserRole = "PRODUCER" | "TALENT" | "ADMIN";

export type AuthProfile = {
  uid: string;
  email: string;
  name: string;
  photo_url?: string | null;
  picture?: string | null;
  role: UserRole;
  provider?: string | null;
  created_at?: string | null;
};

export type GetProfileResponse = {
  message: string;
  user: AuthProfile;
};

export const USER_ROLE_OPTIONS: Array<{
  label: string;
  value: Exclude<UserRole, "ADMIN">;
}> = [
  { label: "Productor / gestor de proyectos", value: "PRODUCER" },
  { label: "Talento / profesional audiovisual", value: "TALENT" },
];
