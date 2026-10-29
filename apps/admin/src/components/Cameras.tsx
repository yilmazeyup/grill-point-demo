import { CAMERAS, feedKind, KIND_NAMES, LOCAL_FEED, loadCameras, setCamera, shareCamera, youtubeEmbed, type CameraConfig, type Station } from '@grill/shared';
import { useEffect, useRef, useState } from 'react';

/** Cameras this screen is sharing right now; kept outside React so they keep running while another tab is open. */
const sharing = new Map<Station, { stream: MediaStream; stop: () => void }>();

function Preview({ url, station }: { url: string; station: Station }) {
  const kind = feedKind(url);
  const video = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    if (kind === 'local') {
      const s = sharing.get(station);
      el.srcObject = s?.stream ?? null;
      return;
    }
    if (kind !== 'hls') return;
    if (el.canPlayType('application/vnd.apple.mpegurl')) {
      el.src = url;
      return;
    }
    let hls: { destroy: () => void } | null = null;
    let gone = false;
    import('hls.js').then(({ default: Hls }) => {
      if (gone || !Hls.isSupported()) return;
      const h = new Hls();
      h.loadSource(url);
      h.attachMedia(el);
      hls = h;
    });
    return () => {
      gone = true;
      hls?.destroy();
    };
  }, [url, kind, station]);
  if (kind === 'mjpeg') return <img className="cam-view" src={url} alt="" />;
  if (kind === 'youtube' || kind === 'iframe') return <iframe className="cam-view" src={kind === 'youtube' ? youtubeEmbed(url) : url} title={station} allow="autoplay; encrypted-media" />;
  return <video className="cam-view" ref={video} src={kind === 'video' ? url : undefined} autoPlay muted playsInline loop />;
}

/**
 * Camera's: the live feed above each station of the line. A link typed here holds on this device; the links in the
 * app's cameras.json hold for every guest. For the demo, this computer's own camera can stand in for one station: the
 * app open in the same browser (side by side on the start page) then shows it in the Grill-Cam.
 */
export function Cameras({ device, appUrl, onChange }: { device: CameraConfig; appUrl: string; onChange: () => void }) {
  const [file, setFile] = useState<CameraConfig>({});
  const [drafts, setDrafts] = useState<CameraConfig>({});
  const [error, setError] = useState<string | null>(null);
  const [, redraw] = useState(0);
  useEffect(() => {
    loadCameras(appUrl).then(setFile);
  }, [appUrl]);

  const save = (station: Station, url: string) => {
    if (!url.trim() && sharing.has(station)) stopLocal(station);
    setCamera(station, url);
    setDrafts((d) => ({ ...d, [station]: undefined }));
    onChange();
  };

  const startLocal = async (station: Station) => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      for (const [other] of sharing) if (other !== station) stopLocal(other);
      sharing.get(station)?.stop();
      const stop = shareCamera(station, stream);
      sharing.set(station, {
        stream,
        stop: () => {
          stop();
          stream.getTracks().forEach((t) => t.stop());
        },
      });
      setCamera(station, `${LOCAL_FEED}${station}`);
      onChange();
      redraw((n) => n + 1);
    } catch {
      setError('Geen toegang tot de camera van dit apparaat.');
    }
  };

  const stopLocal = (station: Station) => {
    sharing.get(station)?.stop();
    sharing.delete(station);
    setCamera(station, '');
    onChange();
    redraw((n) => n + 1);
  };

  return (
    <section className="cam-setup card">
      <div className="section-head">
        <div>
          <div className="kicker">Grill-Cam · live beeld in de app</div>
          <h2>Camera's</h2>
        </div>
      </div>
      <p className="cams-intro">
        Hang een camera boven elke plek. De app laat het beeld zien aan de gast wiens bestelling daar ligt. Hij speelt een HLS-stream (.m3u8), een MJPEG-stream, een YouTube Live-link of een
        pagina om in te sluiten, via https. Wat je hier invult geldt op dit apparaat; zet de adressen in cameras.json om ze voor iedere gast te laten gelden.
      </p>
      {error ? <p className="cams-error">{error}</p> : null}
      <div className="cam-grid">
        {CAMERAS.map((c) => {
          const current = device[c.station] ?? file[c.station] ?? '';
          const draft = drafts[c.station] ?? (current.startsWith(LOCAL_FEED) ? '' : current);
          const local = current.startsWith(LOCAL_FEED) && sharing.has(c.station);
          const from = device[c.station] ? 'dit apparaat' : file[c.station] ? 'cameras.json' : null;
          return (
            <div key={c.station} className="cam">
              <div className="cam-screen">
                {current && (!current.startsWith(LOCAL_FEED) || local) ? <Preview url={current} station={c.station} /> : <div className="cam-empty">Geen camera · de app toont de 3D-keuken</div>}
                <span className="cam-name">
                  <i className={current ? 'on' : ''} />
                  {c.name}
                </span>
              </div>
              <div className="cam-body">
                <div className="cam-kind">{current ? `${KIND_NAMES[feedKind(current)]} · ${from}` : 'Niet gekoppeld'}</div>
                <input
                  value={draft}
                  placeholder="https://… (.m3u8, MJPEG, YouTube Live)"
                  onChange={(e) => setDrafts((d) => ({ ...d, [c.station]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') save(c.station, draft);
                  }}
                />
                <div className="cam-actions">
                  <button className="primary" onClick={() => save(c.station, draft)}>
                    Opslaan
                  </button>
                  {local ? (
                    <button onClick={() => stopLocal(c.station)}>Stop deze camera</button>
                  ) : (
                    <button onClick={() => startLocal(c.station)}>Gebruik de camera van dit apparaat</button>
                  )}
                  {device[c.station] ? <button onClick={() => save(c.station, '')}>Wissen</button> : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="cams-note">
        De camera van dit apparaat is voor de demo: de app moet in dezelfde browser openstaan, bijvoorbeeld naast dit scherm op de startpagina. Voor echte camera's in de zaak
        is een stream via internet nodig (een cameracloud, of een klein kastje zoals go2rtc of MediaMTX dat het RTSP-beeld van de camera als HLS doorgeeft).
      </p>
    </section>
  );
}
