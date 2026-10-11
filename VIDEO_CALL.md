# Visitor video calls

## Environment

Create a `.env.local` file in the FE project (do not commit secrets):

```env
VITE_API_URL=https://your-backend.onrender.com/api
VITE_SOCKET_URL=https://your-backend.onrender.com
```

The REST client expects the backend's `{ ok: true, data }` response envelope. The visitor token is kept only in `sessionStorage` and is sent through `X-Visitor-Token` for cancellation and ICE-server requests.

## Visitor flow

- Availability is checked with `GET /api/availability`.
- Requests are sent to `POST /api/meetings`.
- The visitor polls `GET /api/meetings/:roomId/status` every four seconds until acceptance or a terminal state.
- The waiting UI tells the visitor to wait up to seven minutes for Abhinav and then offers a leave action.
- Cancellation uses `POST /api/meetings/:roomId/cancel` and is only treated as successful after the backend response.

## Signaling contract verified from the backend

Visitor Socket.IO authentication uses `{ role: "visitor", roomId, visitorToken }`. The visitor joins with `meeting:join`, reports media readiness with `call:ready`, receives the host offer through `call:offer`, sends `call:answer`, exchanges `call:ice-candidate`, reports connection state with `call:connected`, and ends through the visitor-authorized `call:end` event. The host is the offerer.

The FE uses native `RTCPeerConnection` and `getUserMedia`; Socket.IO is used only for signaling. Real calling still requires a deployed backend whose CORS allowlist includes the portfolio origin and whose ICE configuration is reachable.

## Admin host route

- Open `/admin-meet` to reach the private host page.
- Sign in with the backend host email and password. The access token is kept in `sessionStorage` only.
- Review pending visitor requests, accept or reject them, and join accepted rooms with camera and microphone controls.
- The host page uses the backend host endpoints under `/api/host/*` and Socket.IO host authentication. No admin credentials are stored in the frontend source.
- The host dashboard also integrates `GET/PUT /api/host/availability`, `POST /api/host/meetings/bulk/reject-pending`, `GET /api/host/meetings/:roomId`, `GET /api/host/ice-servers`, and `POST /api/host/telegram/test`. Availability is reflected in the request queue: accepting a request is disabled while the host is unavailable.
