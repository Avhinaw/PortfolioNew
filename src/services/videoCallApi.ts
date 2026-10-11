export type MeetingStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "in_progress"
  | "cancelled"
  | "ended"
  | "expired";

export interface Availability {
  available: boolean;
  busy: boolean;
}

export interface Meeting {
  id: string;
  roomId: string;
  status: MeetingStatus;
  createdAt: string;
  expiresAt: string;
  visitorToken: string;
}

export interface PublicMeetingStatus {
  roomId: string;
  status: MeetingStatus;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  endedAt: string | null;
}

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface ApiErrorShape {
  code?: string;
  message?: string;
  details?: unknown;
}

export class VideoCallApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, error: ApiErrorShape = {}) {
    super(error.message || "The video call service could not complete that request.");
    this.name = "VideoCallApiError";
    this.status = status;
    this.code = error.code || "request_failed";
  }
}

const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "/api";

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    });
  } catch {
    throw new VideoCallApiError(0, { code: "network_error", message: "The video call service is unreachable right now." });
  }

  const body = (await response.json().catch(() => null)) as { ok?: boolean; data?: T; error?: ApiErrorShape } | null;
  if (!response.ok || body?.ok === false) {
    throw new VideoCallApiError(response.status, body?.error);
  }
  return (body?.data ?? body) as T;
}

export const getAvailability = () => request<Availability>("/availability");

export const createMeeting = (visitorName: string, visitorMessage?: string) =>
  request<Meeting>("/meetings", {
    method: "POST",
    body: JSON.stringify({ visitorName, ...(visitorMessage ? { visitorMessage } : {}) }),
  });

export const getMeetingStatus = (roomId: string) => request<PublicMeetingStatus>(`/meetings/${roomId}/status`);

export const cancelMeeting = (roomId: string, visitorToken: string) =>
  request<PublicMeetingStatus>(`/meetings/${roomId}/cancel`, {
    method: "POST",
    headers: { "X-Visitor-Token": visitorToken },
  });

export const getIceServers = (roomId: string, visitorToken: string) =>
  request<{ iceServers: IceServer[] }>(`/meetings/${roomId}/ice-servers`, {
    headers: { "X-Visitor-Token": visitorToken },
  });
