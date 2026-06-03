export type ConversationType = "DIRECT" | "TEAM";

export type ConversationParticipant = {
  user_uid: string;
  name: string;
  email?: string | null;
  role?: string | null;
  photo_url?: string | null;
  task_description?: string | null;
  status?: string | null;
};

export type Conversation = {
  id: string;
  type: ConversationType;
  project_id: string | null;
  project_title: string | null;
  title: string;
  subtitle: string | null;
  avatar_url: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  participants: ConversationParticipant[];
  participants_count?: number | null;
};

export type ConversationMessage = {
  id: string;
  conversation_id: string;
  project_id: string | null;
  sender_uid: string;
  sender_name: string;
  sender_role: string;
  sender_photo_url: string | null;
  message: string;
  created_at: string;
};

export type ConversationFeed = {
  items: Conversation[];
  next_cursor: string | null;
};

export type ConversationInfo = {
  id: string;
  type: ConversationType;
  project_id: string | null;
  project_title: string | null;
  title: string;
  subtitle?: string | null;
  avatar_url: string | null;
  participants: ConversationParticipant[];
  participants_count?: number | null;
  can_edit_team_settings?: boolean;
};

export type ConversationTeamSettingsPayload = {
  name: string;
};

export type ConversationTeamPhotoResponse = {
  photo_url: string;
};
