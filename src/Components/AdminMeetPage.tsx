import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  acceptHostMeeting,
  endHostMeeting,
  getHostIceServers,
  hostLogin,
  hostLogout,
  listHostMeetings,
  rejectHostMeeting,
  type HostMeeting,
  type IceServer,
  VideoCallApiError,
} from "../services/videoCallApi";
import "./AdminMeetPage.css";

type SignalDescription = { type: "offer" | "answer"; sdp: string };
type MeetingWithError = HostMeeting & { actionError?: string };
const tokenKey = "portfolio-host-access-token";
const socketUrl = (import.meta.env.VITE_SOCKET_URL as string | undefined)?.replace(/\/$/, "");

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

const AdminMeetPage = () => {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(tokenKey));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [meetings, setMeetings] = useState<MeetingWithError[]>([]);
  const [activeMeeting, setActiveMeeting] = useState<HostMeeting | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState("No active call");
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const candidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const closeCall = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    socketRef.current?.disconnect();
    socketRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    candidatesRef.current = [];
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
    const timer = window.setInterval(() => void loadMeetings(), 4000);
    return () => window.clearInterval(timer);
  }, [loadMeetings, token]);

  useEffect(() => () => closeCall(), [closeCall]);

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
    setLoading(true); setPageError(null); setActiveMeeting(meeting);
    try {
      const [media, ice] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }),
        getHostIceServers(token),
      ]);
      streamRef.current = media;
      if (localVideoRef.current) localVideoRef.current.srcObject = media;
      const peer = new RTCPeerConnection({ iceServers: ice.iceServers as IceServer[] });
      peerRef.current = peer;
      media.getTracks().forEach((track) => peer.addTrack(track, media));
      peer.ontrack = (event) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]; };
      peer.onicecandidate = (event) => { if (event.candidate) socketRef.current?.emit("call:ice-candidate", { roomId: meeting.roomId, candidate: event.candidate.toJSON() }); };
      peer.onconnectionstatechange = () => {
        const next = peer.connectionState;
        setConnectionState(next === "connected" ? "Connected" : next === "failed" ? "Connection failed" : next);
        if (next === "connected") socketRef.current?.emit("call:connected", { roomId: meeting.roomId });
      };
      const socket = io(socketUrl || undefined, { auth: { role: "host", token } });
      socketRef.current = socket;
      socket.on("connect", () => {
        setConnectionState("Waiting for visitor…");
        socket.emit("host:join-room", { roomId: meeting.roomId });
        socket.emit("call:ready", { roomId: meeting.roomId });
      });
      socket.on("call:begin", async () => {
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit("call:offer", { roomId: meeting.roomId, sdp: { type: offer.type, sdp: offer.sdp } });
        setConnectionState("Calling visitor…");
      });
      socket.on("call:answer", async (payload: { sdp: SignalDescription }) => {
        await peer.setRemoteDescription(payload.sdp);
        for (const candidate of candidatesRef.current.splice(0)) await peer.addIceCandidate(candidate);
      });
      socket.on("call:ice-candidate", (payload: { candidate: RTCIceCandidateInit }) => {
        if (peer.remoteDescription) void peer.addIceCandidate(payload.candidate);
        else candidatesRef.current.push(payload.candidate);
      });
      socket.on("call:peer-disconnected", () => setConnectionState("Visitor disconnected"));
      socket.on("call:ended", () => { setConnectionState("Call ended"); closeCall(); void loadMeetings(); });
      socket.on("call:error", (error: { message?: string }) => setPageError(error.message || "The call connection needs to be retried."));
    } catch (error) {
      closeCall(); setPageError(error instanceof DOMException && error.name === "NotAllowedError" ? "Camera and microphone permission are required." : getError(error));
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

  if (!token) return <main className="admin-meet-shell"><section className="admin-meet-card admin-meet-login"><span className="admin-meet-kicker">Private host access</span><h1>Admin meet</h1><p>Sign in to review visitor requests and join a call.</p><form onSubmit={login}><label htmlFor="admin-email">Email</label><input id="admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /><label htmlFor="admin-password">Password</label><input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />{loginError && <p className="admin-meet-error" role="alert">{loginError}</p>}<button className="admin-meet-primary" type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button></form><a href="/">Return to portfolio</a></section></main>;

  return <main className="admin-meet-shell"><header className="admin-meet-header"><div><span className="admin-meet-kicker">Private host access</span><h1>Admin meet</h1><p>Accept a visitor request, then join the room.</p></div><button className="admin-meet-quiet" type="button" onClick={() => void logout()}>Sign out</button></header>{pageError && <p className="admin-meet-error admin-meet-banner" role="alert">{pageError}</p>}<div className="admin-meet-grid"><section className="admin-meet-card"><div className="admin-meet-section-heading"><h2>Incoming requests</h2><button type="button" className="admin-meet-refresh" onClick={() => void loadMeetings()}>Refresh</button></div>{meetings.length === 0 ? <p className="admin-meet-muted">No active visitor requests.</p> : <div className="admin-meet-list">{meetings.map((meeting) => <article className="admin-meet-request" key={meeting.roomId}><div><strong>{meeting.visitorName}</strong><span>{formatTime(meeting.createdAt)} · {meeting.status}</span>{meeting.visitorMessage && <p>{meeting.visitorMessage}</p>}</div><div className="admin-meet-actions">{meeting.status === "pending" && <><button type="button" className="admin-meet-primary" onClick={() => void accept(meeting)} disabled={loading}>Accept & join</button><button type="button" className="admin-meet-quiet" onClick={() => void reject(meeting)}>Reject</button></>}{meeting.status === "accepted" && <button type="button" className="admin-meet-primary" onClick={() => void startCall(meeting)} disabled={loading}>Join call</button>}</div></article>)}</div>}</section>{activeMeeting && <section className="admin-meet-card admin-meet-room"><div className="admin-meet-section-heading"><div><span className="admin-meet-kicker">Live room</span><h2>{activeMeeting.visitorName}</h2></div><span className="admin-meet-status">{connectionState}</span></div><div className="admin-meet-videos"><video ref={remoteVideoRef} autoPlay playsInline className="admin-meet-video" /><video ref={localVideoRef} autoPlay muted playsInline className="admin-meet-video admin-meet-video-local" /></div><div className="admin-meet-controls"><button type="button" onClick={() => toggleTrack("audio")}>{micEnabled ? "Mute mic" : "Unmute mic"}</button><button type="button" onClick={() => toggleTrack("video")}>{cameraEnabled ? "Turn camera off" : "Turn camera on"}</button><button type="button" className="admin-meet-end" onClick={() => void endCall()}>End call</button></div></section>}</div></main>;
};

export default AdminMeetPage;
