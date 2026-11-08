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
  const [activePanel, setActivePanel] = useState("");
  const [projectName, setProjectName] = useState("Untitled Project");
  const [projectBusy, setProjectBusy] = useState(false);
  const masterGainRef = useRef(null);
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
      const nextTrack = { ...tracks.find((item) => item.id === id), ...patch };
      const soloActive = tracks.some((item) => item.solo);
      const audible = !nextTrack.muted && (!soloActive || nextTrack.solo);
      if (patch.volume !== undefined || patch.muted !== undefined || patch.solo !== undefined) graph.gain.gain.setTargetAtTime(audible ? nextTrack.volume : 0, contextRef.current.currentTime, 0.025);
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
    if (!masterGainRef.current) { masterGainRef.current = context.createGain(); masterGainRef.current.gain.value = master / 100; masterGainRef.current.connect(context.destination); }
    pan.connect(masterGainRef.current);
    const graph = { source, gain, pan, filter };
    graphRefs.current[id] = graph;
    const track = tracks.find((item) => item.id === id);
    if (track) { const soloActive = tracks.some((item) => item.solo); gain.gain.value = (!track.muted && (!soloActive || track.solo)) ? track.volume : 0; pan.pan.value = track.pan; filter.frequency.value = track.cutoff; }
    return graph;
  }

  function changeMaster(value) {
    setMaster(value);
    if (masterGainRef.current && contextRef.current) masterGainRef.current.gain.setTargetAtTime(value / 100, contextRef.current.currentTime, 0.025);
  }

  async function togglePlayback() {
    if (playing) {
      Object.values(audioRefs.current).forEach((audio) => audio?.pause());
      setPlaying(false);
      return;
    }
  
  async function saveProject() {
    setProjectBusy(true);
    try {
      const serialTracks = await Promise.all(tracks.map(async (track) => {
        const blob = await (await fetch(track.url)).blob();
        const audioData = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        return { ...track, url: undefined, audioData };
      }));
      const project = { format: "produla-project", version: 1, name: projectName, bpm, master, tracks: serialTracks };
      const blob = new Blob([JSON.stringify(project)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = (projectName.trim() || "Untitled Project").replace(/[^a-z0-9-_ ]/gi, "").trim() + ".produla";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Could not save this project. Please try again.");
    } finally { setProjectBusy(false); }
  }

  async function loadProject(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setProjectBusy(true);
    try {
      const project = JSON.parse(await file.text());
      if (project.format !== "produla-project" || !Array.isArray(project.tracks)) throw new Error("Not a Produla project");
      const restored = project.tracks.map((track) => {
        const { audioData, ...metadata } = track;
        const parts = audioData.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
        if (!parts) throw new Error("Missing audio data");
        const bytes = parts[2] ? Uint8Array.from(atob(parts[3]), (char) => char.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(parts[3]));
        const blob = new Blob([bytes], { type: parts[1] || "audio/webm" });
        return { ...metadata, url: URL.createObjectURL(blob) };
      });
      stopPlayback();
      Object.values(audioRefs.current).forEach((audio) => audio?.removeAttribute("src"));
      Object.values(graphRefs.current).forEach((graph) => { try { graph.source.disconnect(); } catch {} });
      audioRefs.current = {};
      graphRefs.current = {};
      masterGainRef.current = null;
      await contextRef.current?.close();
      contextRef.current = null;
      setTracks(restored);
      setProjectName(project.name || "Untitled Project");
      setBpm(project.bpm || 120);
      setMaster(project.master ?? 85);
    } catch (error) {
      console.error(error);
      alert("That file could not be opened as a Produla project.");
    } finally { setProjectBusy(false); }
  }

  function encodeWav(buffer) {
    const channels = buffer.numberOfChannels;
    const frames = buffer.length;
    const bytes = new ArrayBuffer(44 + frames * channels * 2);
    const view = new DataView(bytes);
    const write = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
    write(0, "RIFF"); view.setUint32(4, 36 + frames * channels * 2, true); write(8, "WAVE");
    write(12, "fmt "); view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, channels, true); view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * channels * 2, true); view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true); write(36, "data"); view.setUint32(40, frames * channels * 2, true);
    let offset = 44;
    const channelData = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
    for (let frame = 0; frame < frames; frame++) for (let channel = 0; channel < channels; channel++) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][frame]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
    return new Blob([bytes], { type: "audio/wav" });
  }

  async function exportMix() {
    if (!tracks.length) { alert("Add an audio track before exporting."); return; }
    setProjectBusy(true);
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const decoder = new AudioContextClass();
      const decoded = await Promise.all(tracks.map(async (track) => {
        const response = await fetch(track.url);
        return decoder.decodeAudioData(await response.arrayBuffer());
      }));
      const duration = Math.max(...decoded.map((audio) => audio.duration));
      const sampleRate = 44100;
      const offline = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);
      const masterNode = offline.createGain();
      masterNode.gain.value = master / 100;
      masterNode.connect(offline.destination);
      const hasSolo = tracks.some((track) => track.solo);
      decoded.forEach((audio, index) => {
        const track = tracks[index];
        if (track.muted || (hasSolo && !track.solo)) return;
        const source = offline.createBufferSource();
        const filter = offline.createBiquadFilter();
        const gain = offline.createGain();
        const pan = offline.createStereoPanner();
        source.buffer = audio;
        filter.type = "lowpass"; filter.frequency.value = track.cutoff || 20000;
        gain.gain.value = track.volume;
        pan.pan.value = track.pan;
        source.connect(filter); filter.connect(gain); gain.connect(pan); pan.connect(masterNode);
        source.start(0);
      });
      const rendered = await offline.startRendering();
      const wav = encodeWav(rendered);
      const url = URL.createObjectURL(wav);
      const link = document.createElement("a");
      link.href = url;
      link.download = (projectName.trim() || "Produla Mix").replace(/[^a-z0-9-_ ]/gi, "").trim() + ".wav";
      link.click();
      URL.revokeObjectURL(url);
      await decoder.close();
    } catch (error) {
      console.error(error);
      alert("The mix could not be exported. Try using WAV or MP3 audio files and export again.");
    } finally { setProjectBusy(false); }
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
        <div className="studio-top-actions"><span className="studio-save-state"><i /> Local session</span><button className="studio-file-action" onClick={saveProject} disabled={projectBusy}>Save project</button><label className="studio-file-action">Open<input type="file" accept=".produla,.json,application/json" onChange={loadProject} /></label><button className="studio-export" onClick={exportMix} disabled={projectBusy}>{projectBusy ? "Working…" : "Export WAV"}</button></div>
      </header>
      <div className="studio-projectbar">
        <div><span className="studio-overline">PROJECT NAME</span><input className="studio-project-name" aria-label="Project name" value={projectName} onChange={(event) => setProjectName(event.target.value)} /><h1>Make something <em>real.</em></h1></div>
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
        <div className="studio-master"><label>MASTER</label><input aria-label="Master volume" type="range" min="0" max="100" value={master} onChange={(event) => changeMaster(Number(event.target.value))} /><strong>{master}%</strong></div>
      </div>
      <div className="studio-main">
        <aside className="studio-sidebar">
          <span className="studio-overline">CREATE</span>
          <button className="studio-tool active"><span>▤</span> Arrangement</button>
          <button className={"studio-tool " + (activePanel === "mixer" ? "active" : "")} onClick={() => setActivePanel(activePanel === "mixer" ? "" : "mixer")}><span>☷</span> Mixer</button>
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
      {activePanel === "mixer" && <div className="studio-panel-overlay"><section className="studio-side-panel"><button className="studio-panel-close" onClick={() => setActivePanel("")}>×</button><span className="studio-overline">CHANNEL STRIPS</span><h2>Mixer</h2><p>Adjust each channel while audio is playing. Mute and solo changes apply live.</p>{tracks.length ? tracks.map((track) => <div className="studio-mixer-channel" key={track.id}><div><strong>{track.name}</strong><small>{track.muted ? "MUTED" : track.solo ? "SOLO" : "AUDIO"}</small></div><label>LEVEL <input type="range" min="0" max="1.5" step="0.01" value={track.volume} onChange={(event) => updateTrack(track.id, { volume: Number(event.target.value) })} /></label><label>PAN <input type="range" min="-1" max="1" step="0.01" value={track.pan} onChange={(event) => updateTrack(track.id, { pan: Number(event.target.value) })} /></label><div className="studio-mixer-actions"><button className={track.muted ? "selected" : ""} onClick={() => updateTrack(track.id, { muted: !track.muted })}>M</button><button className={track.solo ? "selected" : ""} onClick={() => updateTrack(track.id, { solo: !track.solo })}>S</button></div></div>) : <p>Import audio to create your first channel.</p>}</section></div>}
      {activePanel === "effects" && <div className="studio-panel-overlay"><section className="studio-side-panel"><button className="studio-panel-close" onClick={() => setActivePanel("mixer")}>×</button><span className="studio-overline">PROCESSING</span><h2>Track effects</h2><p>Shape the tone of each audio track with a live low-pass filter.</p>{tracks.length ? tracks.map((track) => <label className="studio-effect-row" key={track.id}><span>{track.name}</span><input type="range" min="500" max="20000" step="100" value={track.cutoff} onChange={(event) => updateTrack(track.id, { cutoff: Number(event.target.value) })} /><small>{track.cutoff >= 19900 ? "OPEN" : (Math.round(track.cutoff / 100) / 10) + " kHz"}</small></label>) : <p>Import or record a track to add processing.</p>}</section></div>}
      <div className="studio-hidden-master" aria-hidden="true">{master}</div>
    </section>
  );
}
