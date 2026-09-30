import {
  User,
  Meeting,
  MeetingParticipant,
  SchedulePayload,
  MeetingUpdatePayload
} from '@/types/meeting';

export type {
  User,
  Meeting,
  MeetingParticipant,
  SchedulePayload,
  MeetingUpdatePayload
};

export function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return 'http://localhost:8000';
}

/**
 * Section 9.4: Accepts either a numeric ID or a full invite link.
 */
export function extractMeetingCode(input: string): string | null {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    const paramId = url.searchParams.get('meetingId');
    if (paramId) {
      const cleanParam = paramId.replace(/[\s\-/]/g, '');
      return /^\d{9,11}$/.test(cleanParam) ? cleanParam : null;
    }
    const pathPart = url.pathname.split('/').filter(Boolean).pop();
    if (pathPart) {
      const cleanPath = pathPart.replace(/[\s\-/]/g, '');
      return /^\d{9,11}$/.test(cleanPath) ? cleanPath : null;
    }
    return null;
  } catch {
    const digits = trimmed.replace(/[\s\-/]/g, '');
    return /^\d{9,11}$/.test(digits) ? digits : null;
  }
}

/**
 * Backward compatibility helper for components using extractMeetingId.
 */
export function extractMeetingId(input: string): string {
  const extracted = extractMeetingCode(input);
  if (extracted) return extracted;
  return input.trim().replace(/[\s-]/g, '');
}

/**
 * Format raw digit string into standard Zoom ### ### #### or ### #### #### format.
 */
export function formatMeetingId(id: string): string {
  const clean = id.replace(/[\s-]/g, '');
  if (clean.length === 10) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
  } else if (clean.length === 11) {
    return `${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7)}`;
  }
  return id;
}

async function jsonFetch<T>(
  url: string,
  init?: RequestInit,
  fallbackError = 'Request failed'
): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err.detail || fallbackError;
    const errorObj = new Error(message) as Error & { status?: number };
    errorObj.status = res.status;
    throw errorObj;
  }
  return res.json();
}

/**
 * GET /api/me : The default logged-in user
 */
export async function getMe(): Promise<User> {
  return jsonFetch<User>(
    `${getApiBase()}/api/me`,
    { cache: 'no-store' },
    'Failed to fetch user profile'
  );
}

/**
 * POST /api/meetings/instant : Create an instant meeting
 */
export async function createInstantMeeting(
  title = 'Instant Meeting',
  hostName = 'Alex Rivera'
): Promise<Meeting> {
  return jsonFetch<Meeting>(
    `${getApiBase()}/api/meetings/instant`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, host_name: hostName }),
    },
    'Failed to create instant meeting'
  );
}

/**
 * POST /api/meetings/schedule : Create a scheduled meeting
 */
export async function scheduleMeeting(payload: SchedulePayload): Promise<Meeting> {
  return jsonFetch<Meeting>(
    `${getApiBase()}/api/meetings/schedule`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to schedule meeting'
  );
}

/**
 * GET /api/meetings?type=upcoming
 */
export const getUpcomingMeetings = (): Promise<Meeting[]> =>
  jsonFetch<Meeting[]>(
    `${getApiBase()}/api/meetings?type=upcoming`,
    { cache: 'no-store' },
    'Failed to fetch upcoming meetings'
  );

/**
 * GET /api/meetings?type=recent
 */
export const getRecentMeetings = (): Promise<Meeting[]> =>
  jsonFetch<Meeting[]>(
    `${getApiBase()}/api/meetings?type=recent`,
    { cache: 'no-store' },
    'Failed to fetch recent meetings'
  );

/**
 * GET /api/meetings/{code}
 */
export const getMeetingDetails = (meetingIdOrCode: string): Promise<Meeting> =>
  jsonFetch<Meeting>(
    `${getApiBase()}/api/meetings/${encodeURIComponent(meetingIdOrCode)}`,
    { cache: 'no-store' },
    'Meeting not found'
  );

/**
 * POST /api/meetings/{code}/join
 */
export async function joinMeeting(code: string, displayName: string): Promise<MeetingParticipant> {
  return jsonFetch<MeetingParticipant>(
    `${getApiBase()}/api/meetings/${encodeURIComponent(code)}/join`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: displayName }),
    },
    'Failed to join meeting'
  );
}

/**
 * POST /api/meetings/{code}/leave
 */
export async function leaveMeeting(code: string, participantId?: number, displayName?: string): Promise<{ status: string }> {
  const params = new URLSearchParams();
  if (participantId) params.append('participant_id', participantId.toString());
  if (displayName) params.append('display_name', displayName);

  return jsonFetch<{ status: string }>(
    `${getApiBase()}/api/meetings/${encodeURIComponent(code)}/leave?${params.toString()}`,
    { method: 'POST' },
    'Failed to leave meeting'
  );
}

/**
 * POST /api/meetings/{code}/end
 */
export async function endMeeting(code: string): Promise<Meeting> {
  return jsonFetch<Meeting>(
    `${getApiBase()}/api/meetings/${encodeURIComponent(code)}/end`,
    { method: 'POST' },
    'Failed to end meeting'
  );
}

/**
 * GET /api/meetings/{code}/participants
 */
export async function getParticipants(code: string): Promise<MeetingParticipant[]> {
  return jsonFetch<MeetingParticipant[]>(
    `${getApiBase()}/api/meetings/${encodeURIComponent(code)}/participants`,
    { cache: 'no-store' },
    'Failed to fetch participants'
  );
}

/**
 * POST /api/meetings/{code}/mute-all
 */
export async function muteAll(code: string): Promise<{ status: string }> {
  return jsonFetch<{ status: string }>(
    `${getApiBase()}/api/meetings/${encodeURIComponent(code)}/mute-all`,
    { method: 'POST' },
    'Failed to mute all participants'
  );
}

/**
 * DELETE /api/meetings/{code}/participants/{id}
 */
export async function removeParticipant(code: string, participantId: number): Promise<{ status: string }> {
  return jsonFetch<{ status: string }>(
    `${getApiBase()}/api/meetings/${encodeURIComponent(code)}/participants/${participantId}`,
    { method: 'DELETE' },
    'Failed to remove participant'
  );
}

/**
 * DELETE /api/meetings/{code} : Bonus delete scheduled meeting
 */
export async function deleteMeeting(code: string): Promise<{ status: string }> {
  return jsonFetch<{ status: string }>(
    `${getApiBase()}/api/meetings/${encodeURIComponent(code)}`,
    { method: 'DELETE' },
    'Failed to delete meeting'
  );
}

/**
 * PATCH /api/meetings/{code} : Bonus edit scheduled meeting
 */
export async function updateMeeting(code: string, payload: MeetingUpdatePayload): Promise<Meeting> {
  return jsonFetch<Meeting>(
    `${getApiBase()}/api/meetings/${encodeURIComponent(code)}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    'Failed to update meeting'
  );
}
