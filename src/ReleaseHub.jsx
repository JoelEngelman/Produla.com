import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import "./ReleaseHub.css";

const AUDIO_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac", "audio/ogg", "audio/flac", "audio/webm"];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const makeId = () => crypto.randomUUID();
const emptyTrack = () => ({ id: makeId(), title: "", featuredArtists: "", file: null, preview: "" });

function formatDate(value) {
  if (!value) return "Release date not set";
  return new Date(value + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(value) {
  if (!Number.isFinite(value)) return "0:00";
  return Math.floor(value / 60) + ":" + Math.floor(value % 60).toString().padStart(2, "0");
}

function TrackPlayer({ track }) {
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  return (
    <div className="release-track-player">
      <audio src={track.audio_url} preload="none" onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)} onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime || 0)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => { setPlaying(false); setCurrent(0); }} ref={(node) => { if (node) node.volume = volume; }} />
      <button type="button" className="release-track-play" aria-label={playing ? "Pause " + track.title : "Play " + track.title} onClick={(event) => {
        const audio = event.currentTarget.parentElement.querySelector("audio");
        if (!audio) return;
        if (audio.paused) audio.play().catch(() => {}); else audio.pause();
      }}>{playing ? "Ⅱ" : "▶"}</button>
      <div className="release-track-progress">
        <input aria-label={"Seek " + track.title} type="range" min="0" max={duration || 0} step="0.1" value={Math.min(current, duration || 0)} disabled={!duration} onChange={(event) => {
          const audio = event.currentTarget.parentElement.parentElement.querySelector("audio");
          if (audio) { audio.currentTime = Number(event.target.value); setCurrent(audio.currentTime); }
        }} style={{ "--release-progress": duration ? (current / duration * 100) + "%" : "0%" }} />
        <div><span>{formatTime(current)}</span><span>{formatTime(duration)}</span></div>
      </div>
      <label className="release-volume" title="Volume"><span>♪</span><input aria-label={"Volume for " + track.title} type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => {
        const next = Number(event.target.value); setVolume(next);
        const audio = event.currentTarget.parentElement.parentElement.querySelector("audio");
        if (audio) audio.volume = next;
      }} /></label>
    </div>
  );
}

export default function ReleaseHub({ userId, artistId, compact = false, onBack, onLogin, onNotice }) {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("single");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [tracks, setTracks] = useState([]);
  const [filter, setFilter] = useState("all");
  const objectUrls = useRef(new Set());

  async function loadReleases() {
    setLoading(true);
    let query = supabase.from("releases")
      .select("id, artist_id, title, release_type, description, genre, artwork_url, artwork_path, release_date, status, published_at, created_at, release_tracks(id, title, track_number, featured_artists, audio_url, audio_path, duration_seconds)")
      .order("created_at", { ascending: false });
    if (artistId) query = query.eq("artist_id", artistId);
    const { data, error } = await query.limit(100);
    if (error) {
      console.error("Could not load releases:", error.message);
      onNotice?.("Couldn't load releases. Please refresh and try again.");
      setReleases([]);
      setLoading(false);
      return;
    }
    const rows = data || [];
    const artistIds = [...new Set(rows.map((release) => release.artist_id))];
    let artists = {};
    if (artistIds.length) {
      const { data: profiles, error: profileError } = await supabase.from("artist_profiles")
        .select("id, username, display_name, avatar_url").in("id", artistIds);
      if (profileError) console.error("Could not load release artists:", profileError.message);
      (profiles || []).forEach((profile) => { artists[profile.id] = profile; });
    }
    const mapped = rows.map((release) => ({
      ...release,
      artist: artists[release.artist_id] || null,
      release_tracks: [...(release.release_tracks || [])].sort((a, b) => a.track_number - b.track_number)
    }));
    setReleases(mapped);
    setSelectedRelease((current) => current ? mapped.find((release) => release.id === current.id) || null : null);
    setLoading(false);
  }

  useEffect(() => { loadReleases(); }, [artistId, userId]);

  useEffect(() => () => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current.clear();
  }, []);

  const visibleReleases = useMemo(() => releases.filter((release) => filter === "all" || release.release_type === filter), [releases, filter]);
  const ownRelease = (release) => Boolean(userId && release.artist_id === userId);
  const today = new Date().toISOString().slice(0, 10);

  function closeComposer() {
    if (saving) return;
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url)); objectUrls.current.clear();
    setCoverFile(null); setCoverPreview(""); setTracks([]); setComposerOpen(false);
  }

  function startComposer() {
    if (!userId) { onLogin?.(); return; }
    setTitle(""); setType("single"); setGenre(""); setDescription(""); setReleaseDate("");
    setCoverFile(null); setCoverPreview(""); setTracks([emptyTrack()]);
    setComposerOpen(true);
  }

  function updateTrack(id, patch) {
    setTracks((current) => current.map((track) => track.id === id ? { ...track, ...patch } : track));
  }

  function chooseTrack(id, file) {
    if (!file) return;
    if (!AUDIO_TYPES.includes(file.type)) { onNotice?.("Choose an MP3, WAV, M4A, AAC, OGG, FLAC or WebM file."); return; }
    if (file.size > 100 * 1024 * 1024) { onNotice?.("Each audio file must be 100 MB or smaller."); return; }
    const preview = URL.createObjectURL(file);
    objectUrls.current.add(preview);
    setTracks((current) => current.map((track) => {
      if (track.id !== id) return track;
      if (track.preview) { URL.revokeObjectURL(track.preview); objectUrls.current.delete(track.preview); }
      return { ...track, file, preview, title: track.title || file.name.replace(/\.[^.]+$/, "") };
    }));
  }

  function moveTrack(index, direction) {
    setTracks((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function createRelease(event, publish) {
    event?.preventDefault();
    if (!userId) { onLogin?.(); return; }
    if (!title.trim()) { onNotice?.("Add a title for your release."); return; }
    if (!coverFile) { onNotice?.("Add cover artwork for your release."); return; }
    if (!tracks.length || tracks.some((track) => !track.file || !track.title.trim())) {
      onNotice?.("Add a title and audio file for every track."); return;
    }
    if (!IMAGE_TYPES.includes(coverFile.type)) { onNotice?.("Cover art must be a JPG, PNG or WebP image."); return; }
    if (coverFile.size > 8 * 1024 * 1024) { onNotice?.("Cover artwork must be 8 MB or smaller."); return; }
    setSaving(true);
    const uploadedAudio = [];
    let artworkPath = "";
    let releaseId = "";
    try {
      const artworkExtension = (coverFile.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      releaseId = makeId();
      artworkPath = userId + "/" + releaseId + "/" + makeId() + "." + artworkExtension;
      const { error: artworkError } = await supabase.storage.from("release-artwork").upload(artworkPath, coverFile, { contentType: coverFile.type, upsert: false });
      if (artworkError) throw artworkError;
      const { data: artworkUrl } = supabase.storage.from("release-artwork").getPublicUrl(artworkPath);
      const isFuture = Boolean(releaseDate && releaseDate > today);
      const { data: release, error: releaseError } = await supabase.from("releases").insert({
        id: releaseId,
        artist_id: userId,
        title: title.trim(),
        release_type: type,
        description: description.trim(),
        genre: genre.trim(),
        artwork_path: artworkPath,
        artwork_url: artworkUrl.publicUrl,
        release_date: releaseDate || null,
        status: publish ? "published" : "draft",
        published_at: publish ? (isFuture ? new Date(releaseDate + "T00:00:00").toISOString() : new Date().toISOString()) : null
      }).select("id").single();
      if (releaseError) throw releaseError;
      const trackRows = [];
      for (let index = 0; index < tracks.length; index++) {
        const track = tracks[index];
        const extension = (track.file.name.split(".").pop() || "mp3").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = userId + "/releases/" + release.id + "/" + makeId() + "." + extension;
        const { error: audioError } = await supabase.storage.from("song-audio").upload(path, track.file, { contentType: track.file.type, upsert: false });
        if (audioError) throw audioError;
        uploadedAudio.push(path);
        trackRows.push({
          release_id: release.id, artist_id: userId, title: track.title.trim(),
          track_number: index + 1, featured_artists: track.featuredArtists.trim(),
          audio_path: path, audio_url: supabase.storage.from("song-audio").getPublicUrl(path).data.publicUrl
        });
      }
      const { error: tracksError } = await supabase.from("release_tracks").insert(trackRows);
      if (tracksError) throw tracksError;
      setComposerOpen(false);
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url)); objectUrls.current.clear();
      setCoverFile(null); setCoverPreview(""); setTracks([]);
      await loadReleases();
      onNotice?.(publish ? (releaseDate && releaseDate > today ? "Release scheduled!" : "Your release is live!") : "Release saved as a draft.");
    } catch (error) {
      console.error("Release upload failed:", error);
      if (uploadedAudio.length) await supabase.storage.from("song-audio").remove(uploadedAudio);
      if (releaseId) await supabase.from("releases").delete().eq("id", releaseId).eq("artist_id", userId);
      if (artworkPath) await supabase.storage.from("release-artwork").remove([artworkPath]);
      onNotice?.(error.message || "Your release couldn't be uploaded. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function publishRelease(release) {
    const isFuture = Boolean(release.release_date && release.release_date > today);
    const { error } = await supabase.from("releases").update({
      status: "published",
      published_at: isFuture ? new Date(release.release_date + "T00:00:00").toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq("id", release.id).eq("artist_id", userId);
    if (error) { onNotice?.(error.message || "Couldn't publish this release."); return; }
    await loadReleases();
    onNotice?.(isFuture ? "Release scheduled!" : "Your release is live!");
  }

  async function deleteRelease(release) {
    if (!window.confirm("Delete " + release.title + " and all its tracks? This cannot be undone.")) return;
    const paths = (release.release_tracks || []).map((track) => track.audio_path).filter(Boolean);
    const { error } = await supabase.from("releases").delete().eq("id", release.id).eq("artist_id", userId);
    if (error) { onNotice?.(error.message || "Couldn't delete this release."); return; }
    if (paths.length) await supabase.storage.from("song-audio").remove(paths);
    if (release.artwork_path) await supabase.storage.from("release-artwork").remove([release.artwork_path]);
    setSelectedRelease(null);
    await loadReleases();
    onNotice?.("Release deleted.");
  }

  const heading = compact ? "Discography" : "Every release has a story.";
  return (
    <section className={compact ? "release-hub release-hub-compact" : "release-hub"}>
      {!compact && (
        <div className="release-page-top">
          <button type="button" className="release-back" onClick={onBack}>← Back to Produla</button>
          <span className="release-page-kicker">THE PRODULA RELEASES</span>
        </div>
      )}
      <div className="release-heading">
        <div>
          <span className="eyebrow">{compact ? "MUSIC BY THIS ARTIST" : "YOUR MUSIC, OUT IN THE WORLD"}</span>
          <h1>{heading}</h1>
          {!compact && <p>Bring your singles, EPs and albums together in one place.</p>}
        </div>
        {!compact && <button type="button" className="release-create-button" onClick={startComposer}>{userId ? "＋ Create a release" : "Log in to release music"}</button>}
        {compact && userId === artistId && <button type="button" className="release-create-button release-create-small" onClick={startComposer}>＋ New release</button>}
      </div>

      {!compact && <div className="release-filters">
        {[["all","All releases"],["single","Singles"],["ep","EPs"],["album","Albums"],["compilation","Compilations"],["other","Other"]].map(([value, label]) => (
          <button type="button" key={value} className={filter === value ? "is-active" : ""} onClick={() => setFilter(value)}>{label}</button>
        ))}
      </div>}

      {loading ? <div className="release-empty"><span className="release-empty-mark">♫</span><p>Loading releases…</p></div> : visibleReleases.length === 0 ? (
        <div className="release-empty">
          <span className="release-empty-mark">♫</span>
          <h3>{compact ? "No releases yet." : "Your discography starts here."}</h3>
          <p>{compact ? "When this artist releases music, it will appear here." : "Upload cover art, add your tracks and publish your first release."}</p>
          {!compact && <button type="button" className="release-create-button" onClick={startComposer}>Create your first release</button>}
        </div>
      ) : (
        <div className="release-grid">
          {visibleReleases.map((release) => {
            const isScheduled = release.status === "published" && release.release_date && release.release_date > today;
            return (
              <article className="release-card" key={release.id}>
                <button type="button" className="release-art-button" onClick={() => setSelectedRelease(release)} aria-label={"Open " + release.title}>
                  <img src={release.artwork_url} alt={release.title + " cover art"} loading="lazy" />
                  <span className="release-art-overlay">View release ↗</span>
                </button>
                <div className="release-card-copy">
                  <span className="release-type-label">{release.release_type.toUpperCase()}{ownRelease(release) && release.status === "draft" ? " · DRAFT" : isScheduled && ownRelease(release) ? " · SCHEDULED" : ""}</span>
                  <button type="button" className="release-card-title" onClick={() => setSelectedRelease(release)}>{release.title}</button>
                  {!artistId && <span className="release-card-artist">{release.artist?.display_name || release.artist?.username || "Produla artist"}</span>}
                  <span className="release-card-meta">{release.release_tracks.length} {release.release_tracks.length === 1 ? "track" : "tracks"} · {formatDate(release.release_date)}</span>
                  {ownRelease(release) && (
                    <div className="release-card-actions">
                      {release.status === "draft" && <button type="button" onClick={() => publishRelease(release)}>Publish</button>}
                      <button type="button" className="release-delete-button" onClick={() => deleteRelease(release)}>Delete</button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {selectedRelease && (
        <div className="release-detail-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedRelease(null); }}>
          <section className="release-detail" role="dialog" aria-modal="true" aria-label={selectedRelease.title}>
            <button type="button" className="release-detail-close" onClick={() => setSelectedRelease(null)} aria-label="Close release">×</button>
            <div className="release-detail-hero">
              <img src={selectedRelease.artwork_url} alt={selectedRelease.title + " cover art"} />
              <div>
                <span className="eyebrow">{selectedRelease.release_type.toUpperCase()} · PRODULA RELEASE</span>
                <h2>{selectedRelease.title}</h2>
                <p>{selectedRelease.artist?.display_name || selectedRelease.artist?.username || "Produla artist"}{selectedRelease.genre ? " · " + selectedRelease.genre : ""}</p>
                <span className="release-detail-date">{formatDate(selectedRelease.release_date)}</span>
                {selectedRelease.description && <p className="release-detail-description">{selectedRelease.description}</p>}
              </div>
            </div>
            <div className="release-detail-tracklist">
              <div className="release-detail-track-heading"><span>TRACKLIST</span><span>{selectedRelease.release_tracks.length} TRACKS</span></div>
              {selectedRelease.release_tracks.map((track) => (
                <div className="release-detail-track" key={track.id}>
                  <span className="release-track-number">{String(track.track_number).padStart(2, "0")}</span>
                  <div className="release-track-copy"><strong>{track.title}</strong>{track.featured_artists && <small>feat. {track.featured_artists}</small>}</div>
                  <TrackPlayer track={track} />
                </div>
              ))}
            </div>
            {ownRelease(selectedRelease) && selectedRelease.status === "draft" && <button type="button" className="release-create-button" onClick={() => publishRelease(selectedRelease)}>Publish release</button>}
          </section>
        </div>
      )}

      {composerOpen && (
        <div className="release-composer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) closeComposer(); }}>
          <form className="release-composer" onSubmit={(event) => createRelease(event, true)}>
            <div className="release-composer-header">
              <div><span className="eyebrow">RELEASE SETUP</span><h2>Make it official.</h2><p>Build your release, then save it or put it out into the world.</p></div>
              <button type="button" onClick={closeComposer} disabled={saving} aria-label="Close">×</button>
            </div>
            <div className="release-composer-layout">
              <div className="release-cover-column">
                <label className="release-cover-upload">
                  {coverPreview ? <img src={coverPreview} alt="Cover art preview" /> : <span><strong>＋</strong><b>Add cover art</b><small>JPG, PNG or WebP · max 8 MB</small></span>}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    if (!file) return;
                    if (coverPreview) { URL.revokeObjectURL(coverPreview); objectUrls.current.delete(coverPreview); }
                    const preview = URL.createObjectURL(file); objectUrls.current.add(preview);
                    setCoverFile(file); setCoverPreview(preview);
                  }} />
                </label>
                <span className="release-cover-caption">SQUARE ARTWORK LOOKS BEST</span>
              </div>
              <div className="release-fields">
                <label>Release title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. SILENCE SPEAKS" maxLength={120} required /></label>
                <div className="release-field-row">
                  <label>Release type<select value={type} onChange={(event) => setType(event.target.value)}><option value="single">Single</option><option value="ep">EP</option><option value="album">Album</option><option value="compilation">Compilation</option><option value="other">Other</option></select></label>
                  <label>Genre<input value={genre} onChange={(event) => setGenre(event.target.value)} placeholder="Alternative R&B" maxLength={60} /></label>
                </div>
                <label>Release date<input type="date" value={releaseDate} min={today} onChange={(event) => setReleaseDate(event.target.value)} /><small>Choose a future date to schedule the release.</small></label>
                <label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A little about this release…" maxLength={1200} rows={3} /></label>
              </div>
            </div>
            <div className="release-track-editor">
              <div className="release-track-editor-heading"><div><span className="eyebrow">THE MUSIC</span><h3>Tracklist</h3></div><button type="button" onClick={() => setTracks((current) => [...current, emptyTrack()])}>＋ Add track</button></div>
              {tracks.map((track, index) => (
                <div className="release-track-edit-row" key={track.id}>
                  <span className="release-track-edit-number">{String(index + 1).padStart(2, "0")}</span>
                  <div className="release-track-edit-fields">
                    <input aria-label={"Track " + (index + 1) + " title"} placeholder="Track title" value={track.title} onChange={(event) => updateTrack(track.id, { title: event.target.value })} maxLength={120} />
                    <input aria-label={"Track " + (index + 1) + " featured artists"} placeholder="Featured artists (optional)" value={track.featuredArtists} onChange={(event) => updateTrack(track.id, { featuredArtists: event.target.value })} maxLength={200} />
                    <label className="release-audio-file">{track.file ? "✓ " + track.file.name : "Choose audio file"}<input type="file" accept="audio/*" onChange={(event) => { chooseTrack(track.id, event.target.files?.[0]); event.target.value = ""; }} /></label>
                    {track.preview && <audio className="release-track-preview" controls src={track.preview} />}
                  </div>
                  <div className="release-track-edit-actions">
                    <button type="button" aria-label="Move track up" disabled={index === 0} onClick={() => moveTrack(index, -1)}>↑</button>
                    <button type="button" aria-label="Move track down" disabled={index === tracks.length - 1} onClick={() => moveTrack(index, 1)}>↓</button>
                    <button type="button" aria-label="Remove track" onClick={() => { if (track.preview) { URL.revokeObjectURL(track.preview); objectUrls.current.delete(track.preview); } setTracks((current) => current.filter((item) => item.id !== track.id)); }}>×</button>
                  </div>
                </div>
              ))}
              {!tracks.length && <p className="release-no-tracks">Add at least one track to continue.</p>}
            </div>
            <div className="release-composer-footer">
              <span>Only upload music and artwork you own or have permission to share.</span>
              <div><button type="button" className="release-save-draft" disabled={saving} onClick={(event) => createRelease(event, false)}>{saving ? "Uploading…" : "Save draft"}</button><button type="submit" className="release-publish-button" disabled={saving}>{saving ? "Uploading…" : releaseDate && releaseDate > today ? "Schedule release ↗" : "Publish release ↗"}</button></div>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
