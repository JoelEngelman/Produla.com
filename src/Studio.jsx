import { useEffect, useRef, useState } from "react";
import "./Studio.css";
const makeId = () => Date.now() + "-" + Math.random().toString(36).slice(2, 8);

export default function Studio({ onBack }) {
  const [tracks, setTracks] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [master, setMaster] = useState(85);
  const [zoom, setZoom] = useState(1);
  const [activePanel, setActivePanel] = useState("mixer");
  const audioRefs = useRef({});
  const graphRefs = useRef({});
  const contextRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => () => {
    Object.values(audioRefs.current).forEach((audio) => audio?.pause());
    Object.values(graphRefs.current).forEach((graph) => { try { graph.source.disconnect(); } catch {} });
    streamRef.current?.getTracks().forEach((track) => track.stop());
    contextRef.current?.close();
  }, []);

  function addFiles(fileList) {
    const additions = Array.from(fileList || []).filter((file) => file.type.startsWith("audio/")).map((file) => ({
      id: makeId(), name: file.name.replace(/\.[^.]+$/, ""), fileName: file.name,
      url: URL.createObjectURL(file), duration: 0, volume: 0.85, pan: 0,
      cutoff: 20000, muted: false, solo: false
    }));
    setTracks((current) => [...current, ...additions]);
  }

  function updateTrack(id, patch) {
    setTracks((current) => current.map((track) => track.id === id ? { ...track, ...patch } : track));
    const graph = graphRefs.current[id];
    if (graph && contextRef.current) {
      if (patch.volume !== undefined) graph.gain.gain.setTargetAtTime(patch.volume, contextRef.current.currentTime, 0.025);
      if (patch.pan !== undefined) graph.pan.pan.setTargetAtTime(patch.pan, contextRef.current.currentTime, 0.025);
      if (patch.cutoff !== undefined) graph.filter.frequency.setTargetAtTime(patch.cutoff, contextRef.current.currentTime, 0.025);
    }
  }

  function ensureGraph(id, audio) {
    if (graphRefs.current[id]) return graphRefs.current[id];
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    const context = contextRef.current || (contextRef.current = new AudioContextClass());
    const source = context.createMediaElementSource(audio);
    const gain = context.createGain();
    const pan = context.createStereoPanner();
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 20000;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(pan);
    pan.connect(context.destination);
    const graph = { source, gain, pan, filter };
    graphRefs.current[id] = graph;
    const track = tracks.find((item) => item.id === id);
    if (track) { gain.gain.value = track.volume; pan.pan.value = track.pan; filter.frequency.value = track.cutoff; }
    return graph;
  }

  async function togglePlayback() {
    if (playing) {
      Object.values(audioRefs.current).forEach((audio) => audio?.pause());
      setPlaying(false);
      return;
    }
    const soloExists = tracks.some((track) => track.solo);
    const playable = tracks.filter((track) => !track.muted && (!soloExists || track.solo));
    await Promise.all(playable.map(async (track) => {
      const audio = audioRefs.current[track.id];
      if (!audio) return;
      ensureGraph(track.id, audio);
      if (contextRef.current?.state === "suspended") await contextRef.current.resume();
      audio.currentTime = 0;
      try { await audio.play(); } catch (error) { console.error("Track playback failed", error); }
    }));
    setPlaying(true);
  }

  function stopPlayback() {
    Object.values(audioRefs.current).forEach((audio) => { if (audio) { audio.pause(); audio.currentTime = 0; } });
    setPlaying(false);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        const id = makeId();
        setTracks((current) => [...current, {
          id, name: "Vocal " + (current.length + 1), fileName: "Microphone recording",
          url, duration: 0, volume: 0.9, pan: 0, cutoff: 20000, muted: false, solo: false
        }]);
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };
      recorder.start();
      setRecording(true);
    } catch {
      alert("Microphone access was unavailable. Check your browser or system microphone permissions.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
  }

  function removeTrack(id) {
    const audio = audioRefs.current[id];
    audio?.pause();
    delete audioRefs.current[id];
    delete graphRefs.current[id];
    setTracks((current) => {
      const removed = current.find((track) => track.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return current.filter((track) => track.id !== id);
    });
  }

  const soloExists = tracks.some((track) => track.solo);
  return (
    <section className="studio-shell">
      <header className="studio-topbar">
        <button className="studio-back" onClick={onBack}>← <span>Produla</span></button>
        <div className="studio-brand"><span className="studio-brand-mark">p.</span><div><strong>Produla Studio</strong><small>SESSION WORKSPACE</small></div></div>
        <div className="studio-top-actions"><span className="studio-save-state"><i /> Local session</span><button className="studio-export" onClick={() => alert("Session export is coming next. Imported audio stays in this open session for now.")}>Export</button></div>
      </header>
      <div className="studio-projectbar">
        <div><span className="studio-overline">UNTITLED PROJECT</span><h1>Make something <em>real.</em></h1></div>
        <div className="studio-tempo"><label htmlFor="studio-bpm">TEMPO</label><input id="studio-bpm" type="number" min="40" max="240" value={bpm} onChange={(event) => setBpm(Math.max(40, Math.min(240, Number(event.target.value) || 120)))} /><span>BPM</span></div>
        <div className="studio-meter"><span>4/4</span><span>44.1 kHz</span></div>
      </div>
      <div className="studio-transport">
        <div className="studio-transport-buttons">
          <button className="studio-stop" onClick={stopPlayback} aria-label="Stop">■</button>
          <button className={"studio-play " + (playing ? "is-playing" : "")} onClick={togglePlayback} aria-label={playing ? "Pause" : "Play"}>{playing ? "Ⅱ" : "▶"}</button>
          <button className={"studio-record " + (recording ? "is-recording" : "")} onClick={recording ? stopRecording : startRecording} aria-label={recording ? "Stop recording" : "Record"}><i /></button>
        </div>
        <div className="studio-time"><strong>1.1.1</strong><span>BAR · BEAT · TICK</span></div>
        <div className="studio-master"><label>MASTER</label><input aria-label="Master volume" type="range" min="0" max="100" value={master} onChange={(event) => setMaster(Number(event.target.value))} /><strong>{master}%</strong></div>
      </div>
      <div className="studio-main">
        <aside className="studio-sidebar">
          <span className="studio-overline">CREATE</span>
          <button className="studio-tool active"><span>▤</span> Arrangement</button>
          <button className="studio-tool" onClick={() => setActivePanel("mixer")}><span>☷</span> Mixer</button>
          <button className="studio-tool" onClick={() => setActivePanel("effects")}><span>◉</span> Track effects</button>
          <div className="studio-sidebar-divider" />
          <span className="studio-overline">ADD TO SESSION</span>
          <label className="studio-add-button"><span>＋</span> Import audio<input type="file" accept="audio/*" multiple onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} /></label>
          <button className="studio-add-button" onClick={startRecording}><span>●</span> Record vocal</button>
          <div className="studio-sidebar-note"><span>QUICK TIP</span>Import a beat, record a vocal, then balance each track in the mixer.</div>
        </aside>
        <section className="studio-arrangement">
          <div className="studio-arrangement-head">
            <div><span className="studio-overline">ARRANGEMENT VIEW</span><strong>{tracks.length} TRACK{tracks.length === 1 ? "" : "S"}</strong></div>
            <label className="studio-zoom">ZOOM <input type="range" min="0.65" max="1.5" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
          </div>
          <div className="studio-ruler-wrap"><div className="studio-track-gutter">TRACKS</div><div className="studio-ruler" style={{ "--studio-zoom": zoom }}>{Array.from({ length: 16 }, (_, index) => <span key={index}>{index + 1}</span>)}</div></div>
          <div className="studio-track-list">
            {tracks.length === 0 ? (
              <div className="studio-empty"><div className="studio-empty-icon">＋</div><h2>Your session starts here.</h2><p>Import an audio file or record a vocal to create your first track.</p><label className="studio-empty-button">Choose audio<input type="file" accept="audio/*" multiple onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} /></label></div>
            ) : tracks.map((track, index) => (
              <div className="studio-track-row" key={track.id}>
                <div className="studio-track-controls">
                  <div className="studio-track-title"><span className={"studio-track-color color-" + (index % 5)} /><div><strong>{track.name}</strong><small>{track.fileName}</small></div></div>
                  <div className="studio-track-buttons"><button className={track.muted ? "selected" : ""} onClick={() => updateTrack(track.id, { muted: !track.muted })}>M</button><button className={track.solo ? "selected" : ""} onClick={() => updateTrack(track.id, { solo: !track.solo })}>S</button><button onClick={() => removeTrack(track.id)} aria-label={"Remove " + track.name}>×</button></div>
                  <audio ref={(node) => { audioRefs.current[track.id] = node; }} src={track.url} preload="metadata" onLoadedMetadata={(event) => updateTrack(track.id, { duration: event.currentTarget.duration || 0 })} onEnded={() => { if (Object.values(audioRefs.current).every((audio) => !audio || audio.ended || audio.paused)) setPlaying(false); }} />
                </div>
                <div className="studio-track-lane" style={{ "--studio-zoom": zoom }}>
                  <div className="studio-grid-lines">{Array.from({ length: 16 }, (_, cell) => <i key={cell} />)}</div>
                  <div className={"studio-audio-clip color-clip-" + (index % 5) + (track.muted || (soloExists && !track.solo) ? " clip-muted" : "")} style={{ width: Math.max(18, Math.min(100, (track.duration || 5) * 2.5)) + "%" }}>
                    <span className="studio-clip-wave">{Array.from({ length: 72 }, (_, n) => <i key={n} style={{ height: (18 + ((n * 37 + index * 19) % 76)) + "%" }} />)}</span><strong>{track.name}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="studio-bottom-bar"><span>SNAP: BAR</span><span>GRID: 1/16</span><span>{tracks.length ? "AUDIO READY" : "NO CLIPS YET"}</span></div>
        </section>
      </div>
      <footer className="studio-footer"><span>PRODULA STUDIO · EARLY ACCESS BUILD</span><span>YOUR IDEAS. YOUR SOUND.</span></footer>
      {activePanel === "effects" && <div className="studio-panel-overlay"><section className="studio-side-panel"><button className="studio-panel-close" onClick={() => setActivePanel("mixer")}>×</button><span className="studio-overline">PROCESSING</span><h2>Track effects</h2><p>Shape the tone of each audio track with a live low-pass filter.</p>{tracks.length ? tracks.map((track) => <label className="studio-effect-row" key={track.id}><span>{track.name}</span><input type="range" min="500" max="20000" step="100" value={track.cutoff} onChange={(event) => updateTrack(track.id, { cutoff: Number(event.target.value) })} /><small>{track.cutoff >= 19900 ? "OPEN" : (Math.round(track.cutoff / 100) / 10) + " kHz"}</small></label>) : <p>Import or record a track to add processing.</p>}</section></div>}
      <div className="studio-hidden-master" aria-hidden="true">{master}</div>
    </section>
  );
}
