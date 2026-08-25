function getDevHostname() {
  if (typeof window !== "undefined") return window.location.hostname;
  if (process.env.NEXT_PUBLIC_DEV_HOSTNAME) return process.env.NEXT_PUBLIC_DEV_HOSTNAME;
  return "localhost";
}

export function getAppOrigin() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (typeof window !== "undefined") return window.location.origin;
  const port = process.env.NEXT_PUBLIC_WEB_PORT || "10000";
  return `https://${getDevHostname()}:${port}`;
}

export function getRealtimeOrigin() {
  if (process.env.NEXT_PUBLIC_REALTIME_URL) return process.env.NEXT_PUBLIC_REALTIME_URL;
  const port = process.env.NEXT_PUBLIC_REALTIME_PORT || "10001";
  if (typeof window !== "undefined") {
    const origin = new URL(window.location.origin);
    origin.port = port;
    return origin.origin;
  }
  return `https://${getDevHostname()}:${port}`;
}

export function getIceServers(): RTCIceServer[] {
  const fallback: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
  const encoded = process.env.NEXT_PUBLIC_WEBRTC_ICE_SERVERS;
  if (!encoded) return fallback;
  try {
    const parsed: unknown = JSON.parse(encoded);
    return Array.isArray(parsed) ? (parsed as RTCIceServer[]) : fallback;
  } catch {
    return fallback;
  }
}
