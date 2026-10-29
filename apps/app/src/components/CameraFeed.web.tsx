import { feedKind, watchCamera, youtubeEmbed, type Station } from '@grill/shared';
import { useEffect, useRef, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Txt } from './ui';

/**
 * A live camera above the kitchen line: an HLS stream (with hls.js where the browser has no HLS of its own), an MJPEG
 * stream, a video, a YouTube Live link, an embeddable page, or, in the demo, the kitchen screen's own camera over
 * WebRTC. `onState` tells the Grill-Cam whether the picture is up, so it can fall back to the 3D kitchen.
 */
export function CameraFeed({ url, station, style, onState }: { url: string; station: Station; style?: StyleProp<ViewStyle>; onState?: (ok: boolean) => void }) {
  const kind = feedKind(url);
  const video = useRef<HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);
  const report = useRef(onState);
  report.current = onState;

  useEffect(() => {
    setFailed(false);
    const el = video.current;
    if (kind === 'local') {
      return watchCamera(station, (stream) => {
        if (!video.current) return;
        video.current.srcObject = stream;
        video.current.play().catch(() => undefined);
        report.current?.(true);
      });
    }
    if (kind !== 'hls' || !el) return;
    // Safari plays HLS itself; elsewhere hls.js does it.
    if (el.canPlayType('application/vnd.apple.mpegurl')) {
      el.src = url;
      return;
    }
    let destroyed = false;
    let hls: { destroy: () => void } | null = null;
    import('hls.js').then(({ default: Hls }) => {
      if (destroyed || !Hls.isSupported()) return;
      const h = new Hls({ lowLatencyMode: true, liveSyncDurationCount: 2 });
      h.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          setFailed(true);
          report.current?.(false);
        }
      });
      h.loadSource(url);
      h.attachMedia(el);
      hls = h;
    });
    return () => {
      destroyed = true;
      hls?.destroy();
    };
  }, [url, kind, station]);

  const fill = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', border: 0, background: '#0D0907' } as const;
  const ok = () => {
    setFailed(false);
    report.current?.(true);
  };
  const bad = () => {
    setFailed(true);
    report.current?.(false);
  };

  return (
    <View style={[{ position: 'relative', overflow: 'hidden', backgroundColor: '#0D0907' }, style]}>
      {kind === 'mjpeg' ? <img src={url} alt="" style={fill} onLoad={ok} onError={bad} /> : null}
      {kind === 'youtube' || kind === 'iframe' ? (
        <iframe src={kind === 'youtube' ? youtubeEmbed(url) : url} title="Grill-Cam" style={{ ...fill, pointerEvents: 'none' }} allow="autoplay; encrypted-media; picture-in-picture" onLoad={ok} />
      ) : null}
      {kind === 'hls' || kind === 'video' || kind === 'local' ? (
        <video ref={video} src={kind === 'video' ? url : undefined} style={fill} autoPlay muted playsInline loop={kind === 'video'} onPlaying={ok} onError={kind === 'local' ? undefined : bad} />
      ) : null}
      {failed ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 60, alignItems: 'center' }}>
          <Txt v="label" color="#F6EBDD">
            Camerabeeld niet bereikbaar
          </Txt>
        </View>
      ) : null}
    </View>
  );
}
