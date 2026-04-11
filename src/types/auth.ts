export type UserRole = "PRODUCER" | "TALENT";

export type AuthProfile = {
  uid: string;
  email: string;
  name: string;
  picture: string | null;
  role: UserRole;
  provider: string;
  created_at: string;
};

export type GetProfileResponse = {
  message: string;
  user: AuthProfile;
};

export const USER_ROLE_OPTIONS: Array<{
  label: string;
  value: UserRole;
}> = [
  { label: "Productor / gestor de proyectos", value: "PRODUCER" },
  { label: "Talento / profesional audiovisual", value: "TALENT" },
];
