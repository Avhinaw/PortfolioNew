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

export const FALLBACK_ICE_SERVERS: IceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

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

export function getSocketUrl(): string | undefined {
  const explicit = (import.meta.env.VITE_SOCKET_URL as string | undefined)?.trim().replace(/\/$/, "");
  if (explicit) return explicit;
  const configuredApi = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/$/, "");
  if (!configuredApi) return undefined;
  return configuredApi.replace(/\/api$/, "");
}

export function getIceServersWithFallback(iceServers: IceServer[]): IceServer[] {
  return [...FALLBACK_ICE_SERVERS, ...iceServers];
}

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

export interface HostMeeting {
  roomId: string;
  visitorName: string;
  visitorMessage: string | null;
  status: MeetingStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  endedBy: "host" | "visitor" | "system" | null;
  visitorOnline: boolean;
}

export interface HostLoginResponse {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
}

const hostRequest = <T>(path: string, token: string, init: RequestInit = {}) =>
  request<T>(path, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) } });

export const hostLogin = (email: string, password: string) =>
  request<HostLoginResponse>("/host/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const hostLogout = (token: string) =>
  hostRequest<unknown>("/host/auth/logout", token, { method: "POST" });

export const listHostMeetings = (token: string, status?: MeetingStatus) =>
  hostRequest<{ meetings: HostMeeting[] }>(`/host/meetings?limit=50${status ? `&status=${status}` : ""}`, token);

export const acceptHostMeeting = (roomId: string, token: string) =>
  hostRequest<HostMeeting>(`/host/meetings/${roomId}/accept`, token, { method: "POST" });

export const rejectHostMeeting = (roomId: string, token: string) =>
  hostRequest<HostMeeting>(`/host/meetings/${roomId}/reject`, token, { method: "POST" });

export const endHostMeeting = (roomId: string, token: string) =>
  hostRequest<HostMeeting>(`/host/meetings/${roomId}/end`, token, { method: "POST" });

export const getHostIceServers = (token: string) =>
  hostRequest<{ iceServers: IceServer[] }>("/host/ice-servers", token);

export interface HostAvailability {
  available: boolean;
  busy: boolean;
}

export const getHostMeeting = (roomId: string, token: string) =>
  hostRequest<HostMeeting>(`/host/meetings/${roomId}`, token);

export const rejectPendingHostMeetings = (token: string) =>
  hostRequest<{ rejected: number }>("/host/meetings/bulk/reject-pending", token, { method: "POST" });

export const getHostAvailability = (token: string) =>
  hostRequest<HostAvailability>("/host/availability", token);

export const updateHostAvailability = (token: string, available: boolean) =>
  hostRequest<HostAvailability>("/host/availability", token, {
    method: "PUT",
    body: JSON.stringify({ available }),
  });

export const testHostTelegram = (token: string) =>
  hostRequest<unknown>("/host/telegram/test", token, { method: "POST" });
