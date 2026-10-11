import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  cancelMeeting,
  createMeeting,
  getAvailability,
  getIceServers,
  getMeetingStatus,
  type Availability,
  type MeetingStatus,
  type PublicMeetingStatus,
  VideoCallApiError,
} from "../services/videoCallApi";
import "./VideoCallWidget.css";

type WidgetState = "closed" | "form" | "waiting" | "call" | "finished";
type CallEndReason = "rejected" | "cancelled" | "ended" | "expired" | "timeout" | "error";
type SignalDescription = { type: "offer" | "answer"; sdp: string };
type SignalCandidate = RTCIceCandidateInit;
type StatusPayload = PublicMeetingStatus & { reason?: string | null };

const WAITING_LIMIT_MS = 7 * 60 * 1000;
const POLL_INTERVAL_MS = 4000;
const tokenKey = "portfolio-video-call-token";
const roomKey = "portfolio-video-call-room";
const socketUrl = (import.meta.env.VITE_SOCKET_URL as string | undefined)?.replace(/\/$/, "");

function formatCountdown(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function friendlyError(error: unknown): string {
  if (!(error instanceof VideoCallApiError)) return "Something went wrong. Please try again.";
  if (error.code === "validation_error") return "Please check your name and message and try again.";
  if (error.code === "duplicate_pending") return "You already have a pending call request in this browser.";
  if (error.code === "rate_limited") return "Too many requests. Please wait a moment before trying again.";
  if (error.code === "host_unavailable" || error.code === "queue_full") return "Abhinav is unavailable for a call right now.";
  if (error.status === 401 || error.status === 403) return "This call request is no longer authorized. Please start a new request.";
  return error.message;
}

function statusLabel(status: MeetingStatus): string {
  return status === "in_progress" ? "In progress" : status.charAt(0).toUpperCase() + status.slice(1);
}

const VideoCallWidget = () => {
  const [state, setState] = useState<WidgetState>("closed");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [visitorName, setVisitorName] = useState("");
  const [visitorMessage, setVisitorMessage] = useState("");
  const [meeting, setMeeting] = useState<PublicMeetingStatus | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [status, setStatus] = useState<MeetingStatus>("pending");
  const [waitingStartedAt, setWaitingStartedAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(WAITING_LIMIT_MS);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState("Preparing your call…");
  const [endReason, setEndReason] = useState<CallEndReason | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const roomRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  const cleanupCall = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    socketRef.current?.disconnect();
    socketRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    pendingCandidatesRef.current = [];
  }, []);

  const finish = useCallback((reason: CallEndReason) => {
    cleanupCall();
    sessionStorage.removeItem(tokenKey);
    sessionStorage.removeItem(roomKey);
    setEndReason(reason);
    setState("finished");
  }, [cleanupCall]);

  const send = useCallback((event: string, payload: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) return;
    socket.emit(event, payload);
  }, []);

  const handleRemoteDescription = useCallback(async (description: SignalDescription) => {
    const peer = peerRef.current;
    const room = roomRef.current;
    if (!peer || !room) return;
    await peer.setRemoteDescription(description);
    for (const candidate of pendingCandidatesRef.current.splice(0)) await peer.addIceCandidate(candidate);
    if (description.type === "offer") {
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      send("call:answer", { roomId: room, sdp: { type: answer.type, sdp: answer.sdp } });
    }
  }, [send]);

  const startCall = useCallback(async (targetRoom: string, token: string) => {
    try {
      setConnectionState("Requesting camera and microphone…");
      const [media, ice] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }),
        getIceServers(targetRoom, token),
      ]);
      streamRef.current = media;
      if (localVideoRef.current) localVideoRef.current.srcObject = media;
      const peer = new RTCPeerConnection({ iceServers: ice.iceServers });
      peerRef.current = peer;
      media.getTracks().forEach((track) => peer.addTrack(track, media));
      peer.ontrack = (event) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]; };
      peer.onicecandidate = (event) => { if (event.candidate) send("call:ice-candidate", { roomId: targetRoom, candidate: event.candidate.toJSON() }); };
      peer.onconnectionstatechange = () => {
        const next = peer.connectionState;
        setConnectionState(next === "connected" ? "Connected" : next === "failed" ? "Connection failed" : next);
        if (next === "connected") send("call:connected", { roomId: targetRoom });
        if (next === "failed") send("call:connection-failed", { roomId: targetRoom, reason: "ice_failed" });
      };
      const socket = io(socketUrl || undefined, { auth: { role: "visitor", roomId: targetRoom, visitorToken: token } });
      socketRef.current = socket;
      socket.on("connect", () => {
        setConnectionState("Waiting for Abhinav to join…");
        socket.emit("meeting:join", { roomId: targetRoom });
        socket.emit("call:ready", { roomId: targetRoom });
      });
      socket.on("meeting:status", (payload: StatusPayload) => {
        setStatus(payload.status);
        if (payload.status === "ended") finish("ended");
      });
      socket.on("call:begin", () => setConnectionState("Connecting video…"));
      socket.on("call:offer", (payload: { sdp: SignalDescription }) => { void handleRemoteDescription(payload.sdp); });
      socket.on("call:ice-candidate", (payload: { candidate: SignalCandidate }) => {
        if (peer.remoteDescription) void peer.addIceCandidate(payload.candidate);
        else pendingCandidatesRef.current.push(payload.candidate);
      });
      socket.on("call:peer-disconnected", () => finish("ended"));
      socket.on("call:ended", () => finish("ended"));
      socket.on("call:error", () => setConnectionState("The call connection needs to be retried."));
    } catch (cause) {
      cleanupCall();
      setError(cause instanceof DOMException && cause.name === "NotAllowedError" ? "Camera and microphone permission are required to join the call." : friendlyError(cause));
      setState("waiting");
    }
  }, [cleanupCall, finish, handleRemoteDescription, send]);

  useEffect(() => () => cleanupCall(), [cleanupCall]);

  const refreshAvailability = useCallback(async () => {
    setAvailabilityLoading(true);
    try { setAvailability(await getAvailability()); } catch (cause) { setError(friendlyError(cause)); } finally { setAvailabilityLoading(false); }
  }, []);

  useEffect(() => {
    if (state === "closed") return;
    void refreshAvailability();
  }, [refreshAvailability, state]);

  useEffect(() => {
    if (state !== "waiting" || !roomId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await getMeetingStatus(roomId);
        if (cancelled) return;
        setMeeting(next); setStatus(next.status);
        if (next.status === "accepted" || next.status === "in_progress") {
          setState("call");
          const token = tokenRef.current;
          if (token && next.status === "accepted") void startCall(roomId, token);
        } else if (["rejected", "cancelled", "ended", "expired"].includes(next.status)) finish(next.status as CallEndReason);
      } catch (cause) { if (!cancelled) setError(friendlyError(cause)); }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [finish, roomId, startCall, state]);

  useEffect(() => {
    if (state !== "waiting" || !waitingStartedAt) return;
    const timer = window.setInterval(() => setRemaining(WAITING_LIMIT_MS - (Date.now() - waitingStartedAt)), 1000);
    return () => window.clearInterval(timer);
  }, [state, waitingStartedAt]);

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = visitorName.trim();
    const message = visitorMessage.trim();
    if (name.length < 1 || name.length > 80) { setError("Please enter your name (1–80 characters)."); return; }
    if (message.length > 500) { setError("Your message must be 500 characters or fewer."); return; }
    setBusy(true); setError(null);
    try {
      const created = await createMeeting(name, message);
      sessionStorage.setItem(tokenKey, created.visitorToken);
      sessionStorage.setItem(roomKey, created.roomId);
      tokenRef.current = created.visitorToken; roomRef.current = created.roomId;
      setRoomId(created.roomId); setStatus(created.status); setWaitingStartedAt(Date.now()); setRemaining(WAITING_LIMIT_MS); setState("waiting");
    } catch (cause) { setError(friendlyError(cause)); } finally { setBusy(false); }
  };

  const cancelRequest = async () => {
    const room = roomRef.current; const token = tokenRef.current;
    if (!room || !token) { finish("cancelled"); return; }
    setBusy(true); setError(null);
    try { await cancelMeeting(room, token); finish("cancelled"); sessionStorage.removeItem(tokenKey); sessionStorage.removeItem(roomKey); }
    catch (cause) { setError(friendlyError(cause)); } finally { setBusy(false); }
  };

  const endCall = () => { if (roomRef.current) send("call:end", { roomId: roomRef.current }); finish("ended"); };
  const toggleMic = () => { const track = streamRef.current?.getAudioTracks()[0]; if (track) { track.enabled = !track.enabled; setMicEnabled(track.enabled); } };
  const toggleCamera = () => { const track = streamRef.current?.getVideoTracks()[0]; if (track) { track.enabled = !track.enabled; setCameraEnabled(track.enabled); } };
  const reset = () => { cleanupCall(); setMeeting(null); setRoomId(null); roomRef.current = null; tokenRef.current = null; setError(null); setEndReason(null); setState("closed"); };
  const unavailable = availability?.available === false || availability?.busy === true;

  return (
    <section className="video-call-widget" aria-labelledby="video-call-heading">
      <div className="video-call-widget__eyebrow">Open to a quick conversation</div>
      <div className="video-call-widget__header"><div><h2 id="video-call-heading">Let’s talk face to face.</h2><p>Request a private video call with Abhinav—no account needed.</p></div><span className={`availability-dot ${availability?.available && !availability.busy ? "is-live" : ""}`} aria-label={unavailable ? "Currently unavailable" : "Availability unknown"} /></div>
      {state === "closed" && <div className="video-call-widget__closed"><p className="availability-copy">{availabilityLoading ? "Checking availability…" : unavailable ? availability?.busy ? "Abhinav is currently on another call." : "Abhinav is unavailable right now." : availability ? "Abhinav is available for a call." : "Check availability before requesting."}</p><button type="button" className="video-call-button" onClick={() => { setState("form"); setError(null); }} disabled={unavailable || availabilityLoading}>{unavailable ? "Unavailable right now" : "Request a video call"}</button></div>}
      {state === "form" && <form className="video-call-form" onSubmit={submitRequest}><label htmlFor="visitor-name">Your name <span>*</span></label><input id="visitor-name" value={visitorName} onChange={(event) => setVisitorName(event.target.value)} maxLength={80} autoComplete="name" required /><label htmlFor="visitor-message">What would you like to discuss? <small>Optional</small></label><textarea id="visitor-message" value={visitorMessage} onChange={(event) => setVisitorMessage(event.target.value)} maxLength={500} rows={4} /><div className="video-call-form__actions"><button type="button" className="video-call-button video-call-button--quiet" onClick={reset}>Back</button><button type="submit" className="video-call-button" disabled={busy}>{busy ? "Sending…" : "Request a call"}</button></div></form>}
      {state === "waiting" && <div className="video-call-status"><span className="status-kicker">Request sent</span><h3>Abhinav has been notified.</h3><p>Thanks, {visitorName || "there"}. Please wait up to <strong>7 minutes</strong> for Abhinav to join.</p><div className="waiting-countdown" aria-live="polite">{remaining > 0 ? `${formatCountdown(remaining)} remaining` : "7 minutes have passed"}</div><p className="video-call-status__detail">Current status: <strong>{statusLabel(status)}</strong></p>{error && <p className="video-call-error" role="alert">{error}</p>}<button type="button" className="video-call-button video-call-button--quiet" onClick={() => void cancelRequest()} disabled={busy}>{busy ? "Cancelling…" : remaining > 0 ? "Cancel request" : "Leave waiting room"}</button></div>}
      {state === "call" && <div className="video-call-room"><div className="video-call-room__top"><div><span className="status-kicker">Live call</span><p>{connectionState}</p></div><span className="video-call-room__status" aria-live="polite">{statusLabel(status)}</span></div><div className="video-call-videos"><video ref={remoteVideoRef} autoPlay playsInline className="video-call-video video-call-video--remote" /><video ref={localVideoRef} autoPlay muted playsInline className="video-call-video video-call-video--local" /></div>{error && <p className="video-call-error" role="alert">{error}</p>}<div className="video-call-controls"><button type="button" onClick={toggleMic} aria-pressed={!micEnabled}>{micEnabled ? "Mute mic" : "Unmute mic"}</button><button type="button" onClick={toggleCamera} aria-pressed={!cameraEnabled}>{cameraEnabled ? "Turn camera off" : "Turn camera on"}</button><button type="button" className="video-call-control--end" onClick={endCall}>End call</button></div></div>}
      {state === "finished" && <div className="video-call-status"><span className="status-kicker">Call room closed</span><h3>{endReason === "rejected" ? "Abhinav couldn’t take the call." : endReason === "expired" || endReason === "timeout" ? "The waiting window has ended." : "Thanks for stopping by."}</h3><p>{endReason === "ended" ? "The video call has ended." : "You can return to the portfolio or request another call later."}</p><button type="button" className="video-call-button" onClick={reset}>Return to portfolio</button></div>}
      {error && (state === "form" || state === "closed") && <p className="video-call-error" role="alert">{error}</p>}
      {meeting && state === "finished" && <span className="sr-only">Meeting status: {meeting.status}</span>}
    </section>
  );
};

export default VideoCallWidget;
