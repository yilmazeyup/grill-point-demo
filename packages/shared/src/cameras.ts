import type { Station } from './menu';

/**
 * The real cameras above the kitchen line. Each station can have a live feed; the app's Grill-Cam shows it while that
 * station is cooking the guest's order, and falls back to the 3D kitchen where no camera is connected.
 *
 * Where the feeds come from, later ones winning:
 * 1. `cameras.json` next to the app (apps/app/public/cameras.json), filled in once the cameras hang: the address of
 *    each station's stream.
 * 2. The kitchen screen's "Camera's" tab, which keeps feeds on this device (for trying out a link, or this computer's
 *    own camera in the demo).
 *
 * A browser can play: an HLS stream (.m3u8, from a camera cloud or a gateway such as MediaMTX or go2rtc that turns the
 * camera's RTSP into HLS), an MJPEG stream (many IP cameras offer one), a plain video file, a YouTube Live link, or any
 * page made to be embedded. Grill-Point's site runs on https, so the feeds must be https too.
 */

export type CamKind = 'hls' | 'mjpeg' | 'video' | 'youtube' | 'iframe' | 'local';

/** The stations that have a camera, in the order the app offers them. */
export const CAMERAS: { station: Station; name: string }[] = [
  { station: 'grill', name: 'CAM 1 · GRILL' },
  { station: 'spit', name: 'CAM 2 · DÖNER' },
  { station: 'oven', name: 'CAM 3 · OVEN' },
  { station: 'plancha', name: 'CAM 4 · BAKPLAAT' },
  { station: 'pass', name: 'CAM 5 · UITGIFTE' },
];

/** The station whose camera films a given station (the fryer stands next to the plancha, the cold side at the pass). */
export const cameraFor = (s: Station): Station => (s === 'fryer' ? 'plancha' : s === 'cold' ? 'pass' : s);

/** A feed set to this device's own camera on the kitchen screen. */
export const LOCAL_FEED = 'local:';

/** What kind of feed an address is, from how it looks. */
export function feedKind(url: string): CamKind {
  const u = url.trim().toLowerCase();
  if (u.startsWith(LOCAL_FEED)) return 'local';
  if (/(^|\/\/)(www\.)?(youtube\.com|youtu\.be)\//.test(u)) return 'youtube';
  if (/\.m3u8(\?|$)/.test(u)) return 'hls';
  if (/\.(mjpe?g|cgi)(\?|$)|mjpeg|action=stream|\/video\.mjpg|faststream/.test(u)) return 'mjpeg';
  if (/\.(mp4|webm|mov)(\?|$)/.test(u)) return 'video';
  return 'iframe';
}

/** A YouTube link (watch, live or youtu.be) as a muted, autoplaying embed. */
export function youtubeEmbed(url: string): string {
  const m = /(?:v=|youtu\.be\/|\/live\/|\/embed\/)([\w-]{6,})/.exec(url);
  const id = m?.[1] ?? '';
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&playsinline=1&modestbranding=1&rel=0`;
}

export const KIND_NAMES: Record<CamKind, string> = {
  hls: 'HLS-stream',
  mjpeg: 'MJPEG-camera',
  video: 'Video',
  youtube: 'YouTube Live',
  iframe: 'Ingebedde pagina',
  local: 'Camera van dit apparaat',
};

export type CameraConfig = Partial<Record<Station, string>>;

/** The feeds that apply: cameras.json first, then what the kitchen screen set on this device. */
export const mergeCameras = (file: CameraConfig, device: CameraConfig): CameraConfig => ({ ...file, ...device });

/** Reads cameras.json from `base`; an empty set when it is missing or not filled in. */
export async function loadCameras(base: string): Promise<CameraConfig> {
  try {
    const r = await fetch(`${base.replace(/\/?$/, '/')}cameras.json`, { cache: 'no-store' });
    if (!r.ok) return {};
    const json = (await r.json()) as { cameras?: Record<string, string> };
    const out: CameraConfig = {};
    for (const c of CAMERAS) {
      const url = json.cameras?.[c.station];
      if (typeof url === 'string' && url.trim()) out[c.station] = url.trim();
    }
    return out;
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------------------------------------- local

/*
 * The demo's own camera: the kitchen screen films with this computer's or phone's camera and the app, open in the same
 * browser (side by side on the start page), receives it over WebRTC. The two find each other over a BroadcastChannel,
 * so this works on one device only; across devices a real feed (above) takes its place.
 */

type Signal =
  | { type: 'want'; viewer: string; station: Station }
  | { type: 'offer'; viewer: string; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; viewer: string; sdp: RTCSessionDescriptionInit }
  | { type: 'ice'; viewer: string; from: 'cam' | 'viewer'; candidate: RTCIceCandidateInit }
  | { type: 'gone'; viewer: string };

const SIGNALS = 'grill-point-cam';

/** Sends this device's camera to every app that asks for `station`; returns a function that stops it. */
export function shareCamera(station: Station, stream: MediaStream): () => void {
  const ch = new BroadcastChannel(SIGNALS);
  const peers = new Map<string, RTCPeerConnection>();
  ch.onmessage = async (e: MessageEvent<Signal>) => {
    const s = e.data;
    if (s.type === 'want' && s.station === station) {
      peers.get(s.viewer)?.close();
      const pc = new RTCPeerConnection({ iceServers: [] });
      peers.set(s.viewer, pc);
      for (const track of stream.getTracks()) pc.addTrack(track, stream);
      pc.onicecandidate = (ev) => {
        if (ev.candidate) ch.postMessage({ type: 'ice', viewer: s.viewer, from: 'cam', candidate: ev.candidate.toJSON() } satisfies Signal);
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      ch.postMessage({ type: 'offer', viewer: s.viewer, sdp: offer } satisfies Signal);
    } else if (s.type === 'answer') {
      await peers.get(s.viewer)?.setRemoteDescription(s.sdp).catch(() => undefined);
    } else if (s.type === 'ice' && s.from === 'viewer') {
      await peers.get(s.viewer)?.addIceCandidate(s.candidate).catch(() => undefined);
    } else if (s.type === 'gone') {
      peers.get(s.viewer)?.close();
      peers.delete(s.viewer);
    }
  };
  return () => {
    for (const pc of peers.values()) pc.close();
    peers.clear();
    ch.close();
  };
}

/** Asks the kitchen screen for the camera of `station`; calls back with the stream. Returns a function that stops it. */
export function watchCamera(station: Station, onStream: (stream: MediaStream) => void): () => void {
  const ch = new BroadcastChannel(SIGNALS);
  const viewer = `v-${Math.random().toString(36).slice(2)}`;
  let pc: RTCPeerConnection | null = null;
  let got = false;
  const deliver = (stream: MediaStream) => {
    got = true;
    onStream(stream);
  };
  ch.onmessage = async (e: MessageEvent<Signal>) => {
    const s = e.data;
    if (s.viewer !== viewer) return;
    if (s.type === 'offer') {
      pc?.close();
      pc = new RTCPeerConnection({ iceServers: [] });
      pc.ontrack = (ev) => deliver(ev.streams[0] ?? new MediaStream([ev.track]));
      pc.onicecandidate = (ev) => {
        if (ev.candidate) ch.postMessage({ type: 'ice', viewer, from: 'viewer', candidate: ev.candidate.toJSON() } satisfies Signal);
      };
      await pc.setRemoteDescription(s.sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ch.postMessage({ type: 'answer', viewer, sdp: answer } satisfies Signal);
    } else if (s.type === 'ice' && s.from === 'cam') {
      await pc?.addIceCandidate(s.candidate).catch(() => undefined);
    }
  };
  ch.postMessage({ type: 'want', viewer, station } satisfies Signal);
  // The kitchen screen may open its camera after the app asked: ask again now and then until a stream arrives.
  const retry = setInterval(() => {
    if (!got) ch.postMessage({ type: 'want', viewer, station } satisfies Signal);
  }, 3000);
  return () => {
    clearInterval(retry);
    ch.postMessage({ type: 'gone', viewer } satisfies Signal);
    pc?.close();
    ch.close();
  };
}
