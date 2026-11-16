import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  acceptHostMeeting,
  endHostMeeting,
  getHostAvailability,
  getHostIceServers,
  getIceServersWithFallback,
  getHostMeeting,
  hostLogin,
  hostLogout,
  listHostMeetings,
  getSocketUrl,
  rejectPendingHostMeetings,
  rejectHostMeeting,
  testHostTelegram,
  updateHostAvailability,
  updateHostAvailabilitySchedule,
  type AvailabilitySchedule,
  type HostMeeting,
  type IceServer,
  VideoCallApiError,
} from "../services/videoCallApi";
import "./AdminMeetPage.css";

type SignalDescription = { type: "offer" | "answer"; sdp: string };
type MeetingWithError = HostMeeting & { actionError?: string };
const tokenKey = "portfolio-host-access-token";
const socketUrl = getSocketUrl();

function getError(error: unknown): string {
  if (error instanceof VideoCallApiError) {
    if (error.status === 401 || error.status === 403) return "Your admin session has expired. Please sign in again.";
    return error.message;
  }
  return "The admin meeting service is unavailable right now.";
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

const SCHEDULE_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DEFAULT_SCHEDULE: AvailabilitySchedule = { enabled: false, timezone: "UTC", windows: [] };

function minuteToTime(value: number): string {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function timeToMinute(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

const AdminMeetPage = () => {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(tokenKey));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [meetings, setMeetings] = useState<MeetingWithError[]>([]);
  const [activeMeeting, setActiveMeeting] = useState<HostMeeting | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [hostAvailable, setHostAvailable] = useState(true);
  const [hostAvailability, setHostAvailability] = useState<import("../services/videoCallApi").HostAvailability | null>(null);
  const [availabilitySchedule, setAvailabilitySchedule] = useState<AvailabilitySchedule>(DEFAULT_SCHEDULE);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [scheduleBusy, setScheduleBusy] = useState(false);
  const [telegramMessage, setTelegramMessage] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState("No active call");
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const candidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const startedRoomRef = useRef<string | null>(null);
  const callGenerationRef = useRef(0);
  const connectedReportedRef = useRef(false);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const closeCall = useCallback(() => {
    callGenerationRef.current += 1;
    connectedReportedRef.current = false;
    peerRef.current?.close();
    peerRef.current = null;
    socketRef.current?.disconnect();
    socketRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    candidatesRef.current = [];
    remoteStreamRef.current = null;
    startedRoomRef.current = null;
    setConnectionState("No active call");
    setActiveMeeting(null);
  }, []);

  const loadMeetings = useCallback(async () => {
    if (!token) return;
    try {
      const result = await listHostMeetings(token);
      setMeetings(result.meetings);
      setPageError(null);
    } catch (error) {
      setPageError(getError(error));
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void loadMeetings();
    void getHostAvailability(token).then((result) => {
      setHostAvailability(result);
      setHostAvailable(result.manualAvailable ?? result.available);
      setAvailabilitySchedule(result.schedule ?? DEFAULT_SCHEDULE);
    }).catch((error) => setPageError(getError(error)));
    const timer = window.setInterval(() => void loadMeetings(), 4000);
    return () => window.clearInterval(timer);
  }, [loadMeetings, token]);

  useEffect(() => () => closeCall(), [closeCall]);

  useEffect(() => {
    if (streamRef.current && localVideoRef.current && localVideoRef.current.srcObject !== streamRef.current) {
      localVideoRef.current.srcObject = streamRef.current;
    }
    if (remoteStreamRef.current && remoteVideoRef.current && remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      void remoteVideoRef.current.play().catch(() => setPageError("Click the remote video area to start audio/video playback."));
    }
  }, [activeMeeting, connectionState]);

  const login = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true); setLoginError(null);
    try {
      const result = await hostLogin(email.trim(), password);
      sessionStorage.setItem(tokenKey, result.accessToken);
      setToken(result.accessToken);
      setPassword("");
    } catch (error) {
      setLoginError(getError(error));
    } finally { setLoading(false); }
  };

  const logout = async () => {
    if (token) await hostLogout(token).catch(() => undefined);
    closeCall(); sessionStorage.removeItem(tokenKey); setToken(null); setMeetings([]);
  };

  const startCall = async (meeting: HostMeeting) => {
    if (!token) return;
    if (startedRoomRef.current === meeting.roomId && peerRef.current) return;
    closeCall();
    startedRoomRef.current = meeting.roomId;
    const generation = callGenerationRef.current;
    setLoading(true); setPageError(null); setActiveMeeting(meeting);
    try {
      const [media, ice] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }),
        getHostIceServers(token),
      ]);
      if (generation !== callGenerationRef.current) { media.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = media;
      const attachLocal = () => { if (localVideoRef.current) { localVideoRef.current.srcObject = media; void localVideoRef.current.play().catch(() => setPageError("Click the local video area to start preview playback.")); } };
      attachLocal();
      window.requestAnimationFrame(attachLocal);
      const peer = new RTCPeerConnection({ iceServers: getIceServersWithFallback(ice.iceServers as IceServer[]) });
      peerRef.current = peer;
      media.getTracks().forEach((track) => peer.addTrack(track, media));
      peer.ontrack = (event) => {
        if (generation !== callGenerationRef.current) return;
        const remote = event.streams[0] || remoteStreamRef.current || new MediaStream();
        if (!event.streams[0]) remote.addTrack(event.track);
        remoteStreamRef.current = remote;
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remote;
          void remoteVideoRef.current.play().catch(() => setPageError("Click the remote video area to start audio/video playback."));
        }
        setConnectionState("Remote video connected");
      };
      peer.onicecandidate = (event) => { if (event.candidate) socketRef.current?.emit("call:ice-candidate", { roomId: meeting.roomId, candidate: event.candidate.toJSON() }); };
      peer.onconnectionstatechange = () => {
        const next = peer.connectionState;
        setConnectionState(next === "connected" ? "Connected" : next === "failed" ? "Connection failed" : next);
        if (next === "connected" && !connectedReportedRef.current) { connectedReportedRef.current = true; socketRef.current?.emit("call:connected", { roomId: meeting.roomId }); }
        if (next === "failed") { setPageError("The network connection failed. A TURN server may be needed behind some firewalls."); socketRef.current?.emit("call:connection-failed", { roomId: meeting.roomId, reason: "ice_failed" }); }
      };
      const socket = io(socketUrl || undefined, { auth: { role: "host", token } });
      socketRef.current = socket;
      socket.on("connect", () => {
        setConnectionState("Waiting for visitor…");
        socket.emit("host:register", (registerResponse: { ok?: boolean; error?: { message?: string } }) => {
          if (registerResponse?.ok === false) {
            setPageError(registerResponse.error?.message || "The host could not register for signaling.");
            setConnectionState("Host registration failed");
            return;
          }
          socket.emit("host:join-room", { roomId: meeting.roomId }, (joinResponse: { ok?: boolean; error?: { message?: string } }) => {
            if (joinResponse?.ok === false) {
              setPageError(joinResponse.error?.message || "The host could not join the call room.");
              setConnectionState("Room join failed");
              return;
            }
            socket.emit("call:ready", { roomId: meeting.roomId }, (readyResponse: { ok?: boolean; error?: { message?: string } }) => {
              if (readyResponse?.ok === false) {
                setPageError(readyResponse.error?.message || "The host could not announce call readiness.");
                setConnectionState("Call setup failed");
              }
            });
          });
        });
      });
      socket.on("call:begin", async () => {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit("call:offer", { roomId: meeting.roomId, sdp: { type: offer.type, sdp: offer.sdp } });
        setConnectionState("Calling visitorâ€¦");
      });
      socket.on("call:answer", async (payload: { sdp: SignalDescription }) => {
        try {
          await peer.setRemoteDescription(payload.sdp);
          for (const candidate of candidatesRef.current.splice(0)) await peer.addIceCandidate(candidate);
        } catch (error) {
          setPageError(`Unable to apply visitor signaling: ${error instanceof Error ? error.message : "remote description failed"}`);
        }
      });
      socket.on("call:ice-candidate", (payload: { candidate: RTCIceCandidateInit }) => {
        if (peer.remoteDescription) void peer.addIceCandidate(payload.candidate).catch(() => setPageError("A network candidate could not be added."));
        else candidatesRef.current.push(payload.candidate);
      });
      socket.on("call:peer-disconnected", () => setConnectionState("Visitor disconnected"));
      socket.on("call:ended", () => { setConnectionState("Call ended"); closeCall(); void loadMeetings(); });
      socket.on("call:error", (error: { message?: string }) => setPageError(error.message || "The call connection needs to be retried."));
    } catch (error) {
      closeCall(); setPageError(error instanceof DOMException && error.name === "NotAllowedError" ? "Camera and microphone permission are required." : error instanceof DOMException && error.name === "NotFoundError" ? "No camera or microphone was found." : getError(error));
    } finally { setLoading(false); }
  };

  const accept = async (meeting: HostMeeting) => {
    if (!token) return;
    setLoading(true); setPageError(null);
    try { const accepted = await acceptHostMeeting(meeting.roomId, token); await startCall(accepted); await loadMeetings(); }
    catch (error) { setPageError(getError(error)); } finally { setLoading(false); }
  };

  const reject = async (meeting: HostMeeting) => {
    if (!token) return;
    try { await rejectHostMeeting(meeting.roomId, token); await loadMeetings(); } catch (error) { setPageError(getError(error)); }
  };

  const toggleAvailability = async () => {
    if (!token) return;
    setAvailabilityBusy(true); setPageError(null);
    try {
      const result = await updateHostAvailability(token, !hostAvailable);
      setHostAvailability(result);
      setHostAvailable(result.manualAvailable ?? result.available);
    } catch (error) { setPageError(getError(error)); } finally { setAvailabilityBusy(false); }
  };

  const saveAvailabilitySchedule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setScheduleBusy(true); setPageError(null); setTelegramMessage(null);
    try {
      const result = await updateHostAvailabilitySchedule(token, availabilitySchedule);
      setHostAvailability(result);
      setHostAvailable(result.manualAvailable ?? result.available);
      setAvailabilitySchedule(result.schedule);
      setTelegramMessage("Recurring unavailable hours saved.");
    } catch (error) { setPageError(getError(error)); } finally { setScheduleBusy(false); }
  };

  const setScheduleDayEnabled = (dayOfWeek: number, enabled: boolean) => {
    setAvailabilitySchedule((current) => {
      const windows = current.windows.filter((window) => window.dayOfWeek !== dayOfWeek);
      if (enabled) windows.push({ dayOfWeek, startMinute: 60, endMinute: 480 });
      return { ...current, windows: windows.sort((a, b) => a.dayOfWeek - b.dayOfWeek) };
    });
  };

  const setScheduleTime = (dayOfWeek: number, field: "startMinute" | "endMinute", value: string) => {
    setAvailabilitySchedule((current) => ({
      ...current,
      windows: current.windows.map((window) => window.dayOfWeek === dayOfWeek ? { ...window, [field]: timeToMinute(value) } : window),
    }));
  };

  const rejectAllPending = async () => {
    if (!token || !meetings.some((meeting) => meeting.status === "pending")) return;
    setLoading(true); setPageError(null);
    try { await rejectPendingHostMeetings(token); await loadMeetings(); } catch (error) { setPageError(getError(error)); } finally { setLoading(false); }
  };

  const testTelegram = async () => {
    if (!token) return;
    setTelegramMessage(null); setPageError(null);
    try { await testHostTelegram(token); setTelegramMessage("Telegram test notification delivered."); } catch (error) { setPageError(getError(error)); }
  };

  const openMeetingDetails = async (meeting: HostMeeting) => {
    if (!token) return;
    try { setActiveMeeting(await getHostMeeting(meeting.roomId, token)); } catch (error) { setPageError(getError(error)); }
  };

  const endCall = async () => {
    if (!token || !activeMeeting) return;
    socketRef.current?.emit("call:end", { roomId: activeMeeting.roomId });
    await endHostMeeting(activeMeeting.roomId, token).catch(() => undefined);
    closeCall(); await loadMeetings();
  };

  const toggleTrack = (kind: "audio" | "video") => {
    const track = kind === "audio" ? streamRef.current?.getAudioTracks()[0] : streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    if (kind === "audio") setMicEnabled(track.enabled); else setCameraEnabled(track.enabled);
  };

  if (!token) return <main className="admin-meet-shell"><section className="admin-meet-card admin-meet-login"><span className="admin-meet-kicker">Private host access</span><h1>Admin meet</h1><p>Sign in to review visitor requests and join a call.</p><form onSubmit={login}><label htmlFor="admin-email">Email</label><input id="admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /><label htmlFor="admin-password">Password</label><input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />{loginError && <p className="admin-meet-error" role="alert">{loginError}</p>}<button className="admin-meet-primary" type="submit" disabled={loading}>{loading ? "Signing inâ€¦" : "Sign in"}</button></form><a href="/">Return to portfolio</a></section></main>;

  return (
    <main className="admin-meet-shell">
      <header className="admin-meet-header">
        <div><span className="admin-meet-kicker">Private host access</span><h1>Admin meet</h1><p>Accept a visitor request, then join the room.</p></div>
        <div className="admin-meet-header-actions">
          <button className={`admin-meet-availability ${hostAvailable ? "is-available" : ""}`} type="button" onClick={() => void toggleAvailability()} disabled={availabilityBusy}><span className="admin-meet-availability-dot" />{availabilityBusy ? "Updating…" : hostAvailable ? "Available" : "Unavailable"}</button>
          <button className="admin-meet-quiet" type="button" onClick={() => void testTelegram()}>Test Telegram</button>
          <button className="admin-meet-quiet" type="button" onClick={() => void logout()}>Sign out</button>
        </div>
      </header>
      {pageError && <p className="admin-meet-error admin-meet-banner" role="alert">{pageError}</p>}
      {telegramMessage && <p className="admin-meet-success admin-meet-banner" role="status">{telegramMessage}</p>}
      <section className="admin-meet-card admin-meet-schedule-card">
        <div className="admin-meet-section-heading"><div><span className="admin-meet-kicker">Automatic hours</span><h2>Recurring unavailable schedule</h2><p className="admin-meet-muted">New call requests and accepts are blocked during these weekly hours.</p></div><span className={`admin-meet-schedule-status ${hostAvailability?.scheduleActive ? "is-active" : ""}`}>{hostAvailability?.scheduleActive ? "Unavailable now" : availabilitySchedule.enabled ? "Schedule enabled" : "Schedule off"}</span></div>
        <form className="admin-meet-schedule-form" onSubmit={saveAvailabilitySchedule}>
          <div className="admin-meet-schedule-topline"><label className="admin-meet-checkbox"><input type="checkbox" checked={availabilitySchedule.enabled} onChange={(event) => setAvailabilitySchedule((current) => ({ ...current, enabled: event.target.checked }))} /> Enable recurring unavailable hours</label><label>Timezone<input value={availabilitySchedule.timezone} onChange={(event) => setAvailabilitySchedule((current) => ({ ...current, timezone: event.target.value }))} placeholder="Asia/Kolkata" required /></label></div>
          <div className="admin-meet-schedule-list">{SCHEDULE_DAYS.map((day, dayOfWeek) => { const window = availabilitySchedule.windows.find((item) => item.dayOfWeek === dayOfWeek); return <div className="admin-meet-schedule-row" key={day}><label className="admin-meet-checkbox"><input type="checkbox" checked={Boolean(window)} onChange={(event) => setScheduleDayEnabled(dayOfWeek, event.target.checked)} />{day}</label><label>From<input type="time" value={window ? minuteToTime(window.startMinute) : "01:00"} onChange={(event) => setScheduleTime(dayOfWeek, "startMinute", event.target.value)} disabled={!window} /></label><label>Until<input type="time" value={window ? minuteToTime(window.endMinute) : "08:00"} onChange={(event) => setScheduleTime(dayOfWeek, "endMinute", event.target.value)} disabled={!window} /></label></div>; })}</div>
          <div className="admin-meet-schedule-footer"><p className="admin-meet-muted">Example: select a day and set <strong>01:00</strong> to <strong>08:00</strong>. Times use the selected timezone.</p><button className="admin-meet-primary" type="submit" disabled={scheduleBusy}>{scheduleBusy ? "Saving…" : "Save schedule"}</button></div>
        </form>
      </section>
      <div className="admin-meet-grid">
        <section className="admin-meet-card">
          <div className="admin-meet-section-heading"><h2>Incoming requests</h2><div className="admin-meet-section-actions"><button type="button" className="admin-meet-refresh" onClick={() => void loadMeetings()}>Refresh</button><button type="button" className="admin-meet-refresh admin-meet-danger-quiet" onClick={() => void rejectAllPending()} disabled={loading || !meetings.some((meeting) => meeting.status === "pending")}>Reject pending</button></div></div>
          {meetings.length === 0 ? <p className="admin-meet-muted">No active visitor requests.</p> : <div className="admin-meet-list">{meetings.map((meeting) => <article className="admin-meet-request" key={meeting.roomId}><div><strong>{meeting.visitorName}</strong><span>{formatTime(meeting.createdAt)} · {meeting.status}</span>{meeting.visitorMessage && <p>{meeting.visitorMessage}</p>}</div><div className="admin-meet-actions">{meeting.status === "pending" && <><button type="button" className="admin-meet-primary" onClick={() => void accept(meeting)} disabled={loading || hostAvailability?.available === false}>Accept & join</button><button type="button" className="admin-meet-quiet" onClick={() => void reject(meeting)}>Reject</button></>}{meeting.status === "accepted" && <><button type="button" className="admin-meet-primary" onClick={() => void startCall(meeting)} disabled={loading}>Join call</button><button type="button" className="admin-meet-quiet" onClick={() => void openMeetingDetails(meeting)}>Details</button></>}</div></article>)}</div>}
        </section>
        {activeMeeting && <section className="admin-meet-card admin-meet-room"><div className="admin-meet-section-heading"><div><span className="admin-meet-kicker">Live room</span><h2>{activeMeeting.visitorName}</h2></div><span className="admin-meet-status">{connectionState}</span></div><div className="admin-meet-videos"><video ref={remoteVideoRef} autoPlay playsInline className="admin-meet-video" /><video ref={localVideoRef} autoPlay muted playsInline className="admin-meet-video admin-meet-video-local" /></div><div className="admin-meet-controls"><button type="button" onClick={() => toggleTrack("audio")}>{micEnabled ? "Mute mic" : "Unmute mic"}</button><button type="button" onClick={() => toggleTrack("video")}>{cameraEnabled ? "Turn camera off" : "Turn camera on"}</button><button type="button" className="admin-meet-end" onClick={() => void endCall()}>End call</button></div></section>}
      </div>
    </main>
  );
};

export default AdminMeetPage;
