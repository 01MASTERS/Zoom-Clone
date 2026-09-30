export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url?: string | null;
  created_at?: string;
}

export interface MeetingParticipant {
  id: number;
  meeting_id?: number | string | null;
  meeting_code?: string | null;
  user_id?: number | null;
  display_name: string;
  role: 'host' | 'attendee' | string;
  is_host: boolean;
  is_muted: boolean;
  joined_at: string;
  left_at?: string | null;
}

export interface Meeting {
  id: number;
  meeting_code: string;
  meeting_id: string;
  title: string;
  description?: string;
  host_id?: number | null;
  host_name: string;
  meeting_type: 'instant' | 'scheduled' | string;
  is_instant: boolean;
  scheduled_at?: string | null;
  duration_minutes: number;
  status: 'scheduled' | 'live' | 'active' | 'ended' | 'completed' | string;
  passcode?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at: string;
  invite_url: string;
  join_url?: string;
  participant_count?: number;
  participants?: MeetingParticipant[];
}

export interface SchedulePayload {
  title: string;
  description?: string;
  scheduled_at: string;
  duration_minutes: number;
  passcode?: string;
  host_name?: string;
}

export interface JoinPayload {
  display_name: string;
}

export interface MeetingUpdatePayload {
  title?: string;
  description?: string;
  scheduled_at?: string;
  duration_minutes?: number;
  passcode?: string;
}
