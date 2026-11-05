

import { useEffect, useRef, useState } from "react";

import { supabase } from "./lib/supabase";

import "./App.css";



const PRODULA_CREATOR_ID = "dafff309-26a8-4d42-8f34-2420c7914a89";


function AudioPlayer({ src, onPlay, className = "", label = "Play audio" }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioGraphRef = useRef(null);

  function formatTime(value) {
    if (!Number.isFinite(value)) return "0:00";
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass && !audioGraphRef.current) {
          const context = new AudioContextClass();
          const source = context.createMediaElementSource(audio);
          const compressor = context.createDynamicsCompressor();
          const gain = context.createGain();
          gain.gain.value = 3.5;
          compressor.threshold.value = -8;
          compressor.knee.value = 18;
          compressor.ratio.value = 12;
          compressor.attack.value = 0.003;
          compressor.release.value = 0.22;
          source.connect(gain);
          gain.connect(compressor);
          compressor.connect(context.destination);
          audioGraphRef.current = { context, source, gain, compressor };
        }
        if (audioGraphRef.current?.context.state === "suspended") {
          await audioGraphRef.current.context.resume();
        }
        audio.volume = 1;
        await audio.play();
      } catch (error) {
        console.error("Audio playback could not start:", error);
      }
    } else {
      audio.pause();
    }
  }

  function seek(event) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = Number(event.target.value);
    setCurrentTime(audio.currentTime);
  }

  return (
    <div className={`audio-player ${className}`}>
      <audio
        ref={audioRef}
        preload="none"
        crossOrigin="anonymous"
        src={src}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
        onPlay={() => { setPlaying(true); onPlay?.(); }}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); }}
      />
      <button
        className={playing ? "audio-play-button audio-is-playing" : "audio-play-button"}
        type="button"
        onClick={togglePlayback}
        aria-label={playing ? `Pause ${label.toLowerCase()}` : label}
      >
        <span aria-hidden="true">{playing ? "Ⅱ" : "▶"}</span>
      </button>
      <div className="audio-player-track">
        <input
          className="audio-seek"
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={Math.min(currentTime, duration || 0)}
          onChange={seek}
          disabled={!duration}
          aria-label="Seek audio"
          style={{ "--audio-progress": duration ? `${(currentTime / duration) * 100}%` : "0%" }}
        />
        <div className="audio-player-times">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      <span className="audio-player-soundmark" aria-hidden="true"><i /><i /><i /><i /><i /></span>
    </div>
  );
}

function App() {

  const [notice, setNotice] = useState("");

  const [publicProfiles, setPublicProfiles] = useState([]);
  const [songRequests, setSongRequests] = useState([]);
  const [samples, setSamples] = useState([]);
  const [samplesLoading, setSamplesLoading] = useState(true);
  const [songs, setSongs] = useState([]);
  const [songsLoading, setSongsLoading] = useState(true);
  const [songPlayLogged, setSongPlayLogged] = useState({});
  const [songSearch, setSongSearch] = useState("");
  const [songGenreFilter, setSongGenreFilter] = useState("All");
  const [songTitle, setSongTitle] = useState("");
  const [songDescription, setSongDescription] = useState("");
  const [songGenre, setSongGenre] = useState("");
  const [songAudioFile, setSongAudioFile] = useState(null);
  const [songAudioPreview, setSongAudioPreview] = useState("");
  const [sampleSearch, setSampleSearch] = useState("");
  const [sampleGenreFilter, setSampleGenreFilter] = useState("All");
  const [sampleTitle, setSampleTitle] = useState("");
  const [sampleDescription, setSampleDescription] = useState("");
  const [sampleGenre, setSampleGenre] = useState("");
  const [sampleTags, setSampleTags] = useState("");
  const [samplePrice, setSamplePrice] = useState("0");
  const [sampleAudioFile, setSampleAudioFile] = useState(null);
  const [sampleAudioPreview, setSampleAudioPreview] = useState("");

  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestSearch, setRequestSearch] = useState("");
  const [requestFilter, setRequestFilter] = useState("All");
  const [artistSearch, setArtistSearch] = useState("");
  const [artistFilter, setArtistFilter] = useState("All");
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [artistPosts, setArtistPosts] = useState([]);
  const [artistPostContent, setArtistPostContent] = useState("");
  const [artistPostSubmitting, setArtistPostSubmitting] = useState(false);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestDescription, setRequestDescription] = useState("");
  const [requestGenre, setRequestGenre] = useState("");
  const [requestLookingFor, setRequestLookingFor] = useState("Producer");



  useEffect(() => {
    function syncArtistFromHash() {
      const match = window.location.hash.match(/^#artist-(.+)$/);
      if (!match) {
        setSelectedArtist(null);
        return;
      }
      let username = "";
      try { username = decodeURIComponent(match[1]).toLowerCase(); } catch { return; }
      const profile = publicProfiles.find((artist) => artist.username?.toLowerCase() === username);
      if (profile) setSelectedArtist(profile);
    }
    syncArtistFromHash();
    window.addEventListener("hashchange", syncArtistFromHash);
    return () => window.removeEventListener("hashchange", syncArtistFromHash);
  }, [publicProfiles]);

  useEffect(() => {

    let active = true;



    async function loadPublicProfiles() {

      const { data, error } = await supabase

        .from("artist_profiles")

        .select("id, username, display_name, artist_type, bio, genres, avatar_url, spotify_url, apple_music_url, soundcloud_url, youtube_url, instagram_url, tiktok_url, spotify_monthly_listeners, spotify_followers, youtube_subscribers, soundcloud_followers, stats_updated_at")

        .order("created_at", { ascending: false })

        .limit(24);



      if (error) {

        console.error("Could not load artist profiles:", error.message);

        return;

      }

      if (active) setPublicProfiles(data || []);

    }



    loadPublicProfiles();

    return () => { active = false; };

  }, []);



  async function loadSongRequests() {
    setRequestsLoading(true);
    const { data, error } = await supabase.from("song_requests")
      .select("id, author_id, title, description, genre, looking_for, created_at")
      .order("created_at", { ascending: false }).limit(30);
    if (error) {
      console.error("Could not load song requests:", error.message);
      setRequestsLoading(false);
      return;
    }
    const requests = data || [];
    const authorIds = [...new Set(requests.map((request) => request.author_id))];
    let authorsById = {};
    if (authorIds.length) {
      const { data: authors, error: authorsError } = await supabase.from("artist_profiles")
        .select("id, username, display_name, artist_type").in("id", authorIds);
      if (authorsError) console.error("Could not load request authors:", authorsError.message);
      (authors || []).forEach((author) => { authorsById[author.id] = author; });
    }
    setSongRequests(requests.map((request) => ({ ...request, author: authorsById[request.author_id] || null })));
    setRequestsLoading(false);
  }

  useEffect(() => { loadSongRequests(); }, []);

  async function loadArtistPosts() {
    const { data, error } = await supabase.from("artist_posts")
      .select("id, artist_id, content, created_at")
      .order("created_at", { ascending: false }).limit(200);
    if (error) {
      console.error("Could not load artist posts:", error.message);
      return;
    }
    setArtistPosts(data || []);
  }

  useEffect(() => { loadArtistPosts(); }, []);

  async function createArtistPost() {
    const content = artistPostContent.trim();
    if (!session?.user?.id) {
      showNotice("Log in to share a post.");
      return;
    }
    if (!content || artistPostSubmitting) return;
    setArtistPostSubmitting(true);
    const { data, error } = await supabase.from("artist_posts")
      .insert({ artist_id: session.user.id, content })
      .select("id, artist_id, content, created_at")
      .single();
    setArtistPostSubmitting(false);
    if (error) {
      showNotice(error.message || "Couldn't publish your post.");
      return;
    }
    setArtistPosts((current) => [data, ...current]);
    setArtistPostContent("");
    showNotice("Your post is live!");
  }

  async function deleteArtistPost(postId) {
    if (!session?.user?.id) return;
    const { error } = await supabase.from("artist_posts")
      .delete().eq("id", postId).eq("artist_id", session.user.id);
    if (error) {
      showNotice(error.message || "Couldn't delete post.");
      return;
    }
    setArtistPosts((current) => current.filter((post) => post.id !== postId));
    showNotice("Post deleted.");
  }

  async function loadSamples() {
    setSamplesLoading(true);
    const { data, error } = await supabase.from("samples")
      .select("id, creator_id, title, description, genre, tags, price_cents, audio_url, created_at")
      .order("created_at", { ascending: false }).limit(100);
    if (error) {
      console.error("Could not load samples:", error.message);
      setSamplesLoading(false);
      return;
    }
    const rows = data || [];
    const creatorIds = [...new Set(rows.map((sample) => sample.creator_id))];
    let creatorsById = {};
    if (creatorIds.length) {
      const { data: creators, error: creatorsError } = await supabase.from("artist_profiles")
        .select("id, username, display_name, avatar_url").in("id", creatorIds);
      if (creatorsError) console.error("Could not load sample creators:", creatorsError.message);
      (creators || []).forEach((creator) => { creatorsById[creator.id] = creator; });
    }
    setSamples(rows.map((sample) => ({ ...sample, creator: creatorsById[sample.creator_id] || null })));
    setSamplesLoading(false);
  }

  useEffect(() => { loadSamples(); }, []);

  async function loadSongs() {
    setSongsLoading(true);
    const { data, error } = await supabase.from("songs")
      .select("id, creator_id, title, description, genre, audio_path, audio_url, play_count, is_featured, created_at")
      .order("created_at", { ascending: false }).limit(100);
    if (error) {
      console.error("Could not load songs:", error.message);
      setSongsLoading(false);
      return;
    }
    const rows = data || [];
    const creatorIds = [...new Set(rows.map((song) => song.creator_id))];
    let creatorsById = {};
    if (creatorIds.length) {
      const { data: creators, error: creatorsError } = await supabase.from("artist_profiles")
        .select("id, username, display_name, avatar_url").in("id", creatorIds);
      if (creatorsError) console.error("Could not load song artists:", creatorsError.message);
      (creators || []).forEach((creator) => { creatorsById[creator.id] = creator; });
    }
    setSongs(rows.map((song) => ({ ...song, creator: creatorsById[song.creator_id] || null })));
    setSongsLoading(false);
  }

  useEffect(() => { loadSongs(); }, []);

  const [session, setSession] = useState(null);

  const [sessionPending, setSessionPending] = useState(true);
  const [accountAvatarUrl, setAccountAvatarUrl] = useState("");

  const isCreatorAccount = session?.user?.id === PRODULA_CREATOR_ID;

  useEffect(() => {
    let active = true;
    async function loadAccountAvatar() {
      if (!session?.user?.id) { setAccountAvatarUrl(""); return; }
      const { data, error } = await supabase.from("artist_profiles").select("avatar_url").eq("id", session.user.id).maybeSingle();
      if (!active) return;
      if (error) { console.error("Could not load account avatar:", error.message); return; }
      setAccountAvatarUrl(data?.avatar_url || "");
    }
    loadAccountAvatar();
    return () => { active = false; };
  }, [session?.user?.id]);



  useEffect(() => {

    let active = true;



    function toAppSession(authSession) {

      if (!authSession?.user) return null;

      const user = authSession.user;

      return {

        user: {

          id: user.id,

          email: user.email || "",

          name:

            user.user_metadata?.name ||

            user.user_metadata?.full_name ||

            user.email ||

            "Artist",

        },

      };

    }



    supabase.auth.getSession().then(({ data, error }) => {

      if (!active) return;

      if (error) console.error("Could not restore session:", error.message);

      setSession(toAppSession(data?.session));

      setSessionPending(false);

    });



    const { data: { subscription } } = supabase.auth.onAuthStateChange(

      (_event, authSession) => {

        setSession(toAppSession(authSession));

        setSessionPending(false);

      }

    );



    return () => {

      active = false;

      subscription.unsubscribe();

    };

  }, []);



  const [profileName, setProfileName] = useState("");

  const [profileType, setProfileType] = useState("singer");

  const [profileUsername, setProfileUsername] = useState("");

  const [profileBio, setProfileBio] = useState("");

  const [profileGenres, setProfileGenres] = useState("");

  const [profileSpotify, setProfileSpotify] = useState("");
  const [profileSpotifyMonthlyListeners, setProfileSpotifyMonthlyListeners] = useState("");
  const [profileSpotifyFollowers, setProfileSpotifyFollowers] = useState("");
  const [profileYoutubeSubscribers, setProfileYoutubeSubscribers] = useState("");
  const [profileSoundcloudFollowers, setProfileSoundcloudFollowers] = useState("");

  const [profileAppleMusic, setProfileAppleMusic] = useState("");

  const [profileSoundCloud, setProfileSoundCloud] = useState("");

  const [profileYouTube, setProfileYouTube] = useState("");

  const [profileInstagram, setProfileInstagram] = useState("");

  const [profileTikTok, setProfileTikTok] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState("");
  const [profileAvatarFile, setProfileAvatarFile] = useState(null);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState("");



  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const [authMode, setAuthMode] = useState("");

  const [authEmail, setAuthEmail] = useState("");

  const [authPassword, setAuthPassword] = useState("");

  const [authName, setAuthName] = useState("");

  const [authError, setAuthError] = useState("");

  const [authLoading, setAuthLoading] = useState(false);



  function showNotice(message) {

    setNotice(message);

    window.setTimeout(() => setNotice(""), 2800);

  }



  function clearProfileFields() {

    setProfileUsername("");

    setProfileName(session?.user?.name || "");

    setProfileType("singer");

    setProfileBio("");

    setProfileGenres("");

    setProfileSpotify("");
    setProfileSpotifyMonthlyListeners("");
    setProfileSpotifyFollowers("");
    setProfileYoutubeSubscribers("");
    setProfileSoundcloudFollowers("");

    setProfileAppleMusic("");

    setProfileSoundCloud("");

    setProfileYouTube("");

    setProfileInstagram("");

    setProfileTikTok("");
    setProfileAvatarUrl("");
    setProfileAvatarFile(null);
    setProfileAvatarPreview("");

  }



  async function openProfileEditor() {

    setProfileMenuOpen(false);

    setAuthMode("profile");

    setAuthError("");

    setAuthLoading(true);

    clearProfileFields();



    try {

      const { data: profile, error } = await supabase

        .from("artist_profiles")

        .select("*")

        .eq("id", session.user.id)

        .maybeSingle();



      if (error) throw error;



      if (profile) {

        setProfileUsername(profile.username || "");

        setProfileName(profile.display_name || session?.user?.name || "");

        setProfileType(profile.artist_type || "singer");

        setProfileBio(profile.bio || "");

        setProfileGenres(Array.isArray(profile.genres) ? profile.genres.join(", ") : "");

        setProfileSpotify(profile.spotify_url || "");
        setProfileSpotifyMonthlyListeners(profile.spotify_monthly_listeners == null ? "" : String(profile.spotify_monthly_listeners));
        setProfileSpotifyFollowers(profile.spotify_followers == null ? "" : String(profile.spotify_followers));
        setProfileYoutubeSubscribers(profile.youtube_subscribers == null ? "" : String(profile.youtube_subscribers));
        setProfileSoundcloudFollowers(profile.soundcloud_followers == null ? "" : String(profile.soundcloud_followers));

        setProfileAppleMusic(profile.apple_music_url || "");

        setProfileSoundCloud(profile.soundcloud_url || "");

        setProfileYouTube(profile.youtube_url || "");

        setProfileInstagram(profile.instagram_url || "");

        setProfileTikTok(profile.tiktok_url || "");
        setProfileAvatarUrl(profile.avatar_url || "");

      }

    } catch (error) {

      setAuthError(

        error.message || "Couldn't load your profile. Please try again."

      );

    } finally {

      setAuthLoading(false);

    }

  }



  async function handleAuthSubmit(event) {

    event.preventDefault();

    setAuthError("");

    setAuthLoading(true);



    try {

      if (authMode === "song") {
        if (!session?.user?.id) throw new Error("Log in to upload a song.");
        if (!songAudioFile) throw new Error("Choose an audio file to upload.");
        const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac", "audio/ogg", "audio/flac", "audio/webm"];
        if (!allowedTypes.includes(songAudioFile.type)) throw new Error("Choose an MP3, WAV, M4A, AAC, OGG, FLAC or WebM audio file.");
        if (songAudioFile.size > 100 * 1024 * 1024) throw new Error("Your song file must be 100 MB or smaller.");
        const extension = (songAudioFile.name.split(".").pop() || "mp3").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${session.user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("song-audio").upload(path, songAudioFile, { contentType: songAudioFile.type, upsert: false });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from("song-audio").getPublicUrl(path);
        const { error: insertError } = await supabase.from("songs").insert({
          creator_id: session.user.id,
          title: songTitle.trim(),
          description: songDescription.trim(),
          genre: songGenre.trim(),
          audio_path: path,
          audio_url: publicUrlData.publicUrl,
        });
        if (insertError) {
          await supabase.storage.from("song-audio").remove([path]);
          throw insertError;
        }
        setSongTitle(""); setSongDescription(""); setSongGenre("");
        setSongAudioFile(null); setSongAudioPreview("");
        setAuthMode("");
        await loadSongs();
        showNotice("Your song has been uploaded!");
      } else if (authMode === "sample") {
        if (!session?.user?.id) throw new Error("Log in to upload a sample.");
        if (!sampleAudioFile) throw new Error("Choose an audio file to upload.");
        const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac", "audio/ogg", "audio/flac", "audio/webm"];
        if (!allowedTypes.includes(sampleAudioFile.type)) throw new Error("Choose an MP3, WAV, M4A, AAC, OGG, FLAC or WebM audio file.");
        if (sampleAudioFile.size > 50 * 1024 * 1024) throw new Error("Your audio file must be 50 MB or smaller.");
        const extension = (sampleAudioFile.name.split(".").pop() || "mp3").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${session.user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("sample-audio").upload(path, sampleAudioFile, { contentType: sampleAudioFile.type, upsert: false });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from("sample-audio").getPublicUrl(path);
        const price = Math.round(Number(samplePrice || 0) * 100);
        const { error: insertError } = await supabase.from("samples").insert({
          creator_id: session.user.id,
          title: sampleTitle.trim(),
          description: sampleDescription.trim(),
          genre: sampleGenre.trim(),
          tags: sampleTags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 10),
          price_cents: price,
          audio_path: path,
          audio_url: publicUrlData.publicUrl,
        });
        if (insertError) {
          await supabase.storage.from("sample-audio").remove([path]);
          throw insertError;
        }
        setSampleTitle(""); setSampleDescription(""); setSampleGenre(""); setSampleTags("");
        setSamplePrice("0"); setSampleAudioFile(null); setSampleAudioPreview("");
        setAuthMode("");
        await loadSamples();
        showNotice("Your sample has been uploaded!");
      } else if (authMode === "request") {

        if (!session?.user?.id) throw new Error("Log in to post a song request.");
        const { error } = await supabase.from("song_requests").insert({
          author_id: session.user.id,
          title: requestTitle.trim(),
          description: requestDescription.trim(),
          genre: requestGenre.trim(),
          looking_for: requestLookingFor,
        });
        if (error) throw error;
        setRequestTitle("");
        setRequestDescription("");
        setRequestGenre("");
        setRequestLookingFor("Producer");
        setAuthMode("");
        await loadSongRequests();
        showNotice("Song request posted!");
      } else if (authMode === "profile") {

        const genres = profileGenres

          .split(",")

          .map((genre) => genre.trim())

          .filter(Boolean)

          .slice(0, 10);



        let avatarUrl = profileAvatarUrl;
        if (profileAvatarFile) {
          if (!["image/jpeg", "image/png", "image/webp"].includes(profileAvatarFile.type)) throw new Error("Choose a JPG, PNG, or WebP image.");
          if (profileAvatarFile.size > 5 * 1024 * 1024) throw new Error("Your profile picture must be 5 MB or smaller.");
          const extension = profileAvatarFile.type === "image/png" ? "png" : profileAvatarFile.type === "image/webp" ? "webp" : "jpg";
          const path = `${session.user.id}/avatar-${Date.now()}.${extension}`;
          const { error: uploadError } = await supabase.storage.from("artist-avatars").upload(path, profileAvatarFile, { contentType: profileAvatarFile.type, upsert: true });
          if (uploadError) throw uploadError;
          const { data: publicUrlData } = supabase.storage.from("artist-avatars").getPublicUrl(path);
          avatarUrl = publicUrlData.publicUrl;
        }

        const parseOptionalStat = (value, label) => {
          if (value === "") return null;
          const parsed = Number(value);
          if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`${label} must be a whole number of 0 or more.`);
          return parsed;
        };
        const spotifyMonthlyListeners = parseOptionalStat(profileSpotifyMonthlyListeners, "Spotify monthly listeners");
        const spotifyFollowers = parseOptionalStat(profileSpotifyFollowers, "Spotify followers");
        const youtubeSubscribers = parseOptionalStat(profileYoutubeSubscribers, "YouTube subscribers");
        const soundcloudFollowers = parseOptionalStat(profileSoundcloudFollowers, "SoundCloud followers");
        const hasAudienceStats = [spotifyMonthlyListeners, spotifyFollowers, youtubeSubscribers, soundcloudFollowers].some((value) => value !== null);

        const { data: savedProfile, error } = await supabase

          .from("artist_profiles")

          .upsert({

            id: session.user.id,

            username: profileUsername.trim().toLowerCase(),

            display_name: profileName.trim(),

            artist_type: profileType,

            bio: profileBio.trim(),

            genres,

            spotify_url: profileSpotify.trim(),
            spotify_monthly_listeners: spotifyMonthlyListeners,
            spotify_followers: spotifyFollowers,
            youtube_subscribers: youtubeSubscribers,
            soundcloud_followers: soundcloudFollowers,
            stats_updated_at: hasAudienceStats ? new Date().toISOString() : null,

            apple_music_url: profileAppleMusic.trim(),

            soundcloud_url: profileSoundCloud.trim(),

            youtube_url: profileYouTube.trim(),

            instagram_url: profileInstagram.trim(),

            tiktok_url: profileTikTok.trim(),
            avatar_url: avatarUrl || null,

            updated_at: new Date().toISOString(),

          }, { onConflict: "id" })

          .select()

          .single();



        if (error) throw error;

        if (savedProfile) {

          setProfileName(savedProfile.display_name || profileName);
          setAccountAvatarUrl(savedProfile.avatar_url || "");

          setPublicProfiles((current) =>

            [savedProfile, ...current.filter((profile) => profile.id !== savedProfile.id)].slice(0, 24)

          );

        }



        setAuthMode("");

        setProfileMenuOpen(false);

        showNotice("Profile saved!");

      } else {

        const wasSignup = authMode === "signup";

        const result = wasSignup

          ? await supabase.auth.signUp({

              email: authEmail.trim(),

              password: authPassword,

              options: { data: { name: authName.trim() }, emailRedirectTo: window.location.origin },

            })

          : await supabase.auth.signInWithPassword({

              email: authEmail.trim(),

              password: authPassword,

            });



        if (result.error) {

          throw new Error(result.error.message || "Something went wrong.");

        }



        setAuthMode("");

        setAuthEmail("");

        setAuthPassword("");

        setAuthName("");



        showNotice(

          wasSignup

            ? result.data.session

              ? "Account created successfully!"

              : "Check your email to confirm your account."

            : "You're logged in!"

        );

      }

    } catch (error) {

      setAuthError(

        error.message || "Couldn't connect. Please try again."

      );

    } finally {

      setAuthLoading(false);

    }

  }



  return (

    <div className="app-shell">

      <style>{`
        /* Loaded here so the effect is active even though the standalone CSS file was not imported. */
        :where(button, [role="button"], input[type="button"], input[type="submit"], a.button, a.login-button, a.artist-profile-back) {
          border: 1px solid rgba(255,255,255,.76);
          background-color: rgba(255,255,255,.38);
          -webkit-backdrop-filter: blur(16px) saturate(160%);
          backdrop-filter: blur(16px) saturate(160%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.82), inset 0 -1px 0 rgba(120,105,85,.10), 0 7px 22px rgba(40,32,20,.09);
          transition: transform .2s cubic-bezier(.2,.8,.2,1), box-shadow .2s ease, background-color .2s ease;
        }
        /* SVG backdrop refraction, matching the reference demo's filter approach. */
        :where(button, [role="button"], input[type="button"], input[type="submit"], a.button, a.login-button, a.artist-profile-back) {
          -webkit-backdrop-filter: url("#produla-liquid-glass");
          backdrop-filter: url("#produla-liquid-glass");
        }
        :where(button, [role="button"], input[type="button"], input[type="submit"], a.button, a.login-button, a.artist-profile-back):not(.button-dark):not(.sample-play):not(.audio-play-button):not(.selected):not(.market-filter-active) {
          background-image: linear-gradient(145deg, rgba(255,255,255,.72), rgba(255,255,255,.32));
          color: #292720;
        }
        :where(.button-dark, .sample-play, .audio-play-button, .filter-tab.selected, .marketplace-filters button.market-filter-active) {
          background-image: linear-gradient(145deg, rgba(54,52,46,.91), rgba(25,24,21,.82));
          background-color: rgba(35,33,29,.72);
          border-color: rgba(255,255,255,.42);
          color: #fff;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.30), inset 0 -1px 0 rgba(0,0,0,.12), 0 9px 25px rgba(23,23,20,.18);
        }
        :where(button, [role="button"], input[type="button"], input[type="submit"], a.button, a.login-button, a.artist-profile-back):hover:not(:disabled):not([aria-disabled="true"]) {
          transform: translateY(-1px);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.94), 0 12px 28px rgba(40,32,20,.13);
        }
        :where(button, [role="button"], input[type="button"], input[type="submit"], a.button, a.login-button, a.artist-profile-back):active:not(:disabled):not([aria-disabled="true"]) {
          transform: translateY(0) scale(.985);
        }
        :where(button, [role="button"], input[type="button"], input[type="submit"], a.button, a.login-button, a.artist-profile-back):focus-visible {
          outline: 3px solid rgba(190,73,48,.72);
          outline-offset: 3px;
        }
        @media (prefers-reduced-transparency: reduce) {
          :where(button, [role="button"], input[type="button"], input[type="submit"], a.button, a.login-button, a.artist-profile-back) {
            -webkit-backdrop-filter: none;
            backdrop-filter: none;
            background-image: none;
            background-color: rgba(255,255,255,.96);
          }
          :where(.button-dark, .sample-play, .audio-play-button, .filter-tab.selected, .marketplace-filters button.market-filter-active) {
            background-color: #292720;
            color: #fff;
          }
        }

        /* Navbar uses the exact displacement-map filter from liquid-glass/dist/index.html. */
        .navbar {
          position: relative;
          z-index: 10;
          background: rgba(255,255,255,.08);
          border: 2px solid transparent;
          box-shadow: 0 0 0 2px rgba(255,255,255,.6), 0 16px 32px rgba(0,0,0,.12);
          -webkit-backdrop-filter: blur(16px);
          backdrop-filter: blur(16px);
        }
        /* Temporary size boost so the liquid-glass finish is easy to inspect. */
        :where(button.button, a.button, .login-button, .auth-submit, button[type="submit"], .artist-profile-back, .nav-cta) {
          min-height: 58px;
          padding: 16px 28px;
          font-size: 15px;
          border-radius: 16px;
        }
        :where(.sample-card-footer .button, .artist-post-composer-footer .button) {
          min-height: 54px;
          padding: 14px 22px;
          font-size: 14px;
        }
      `}</style>
      <svg
        className="produla-svg-defs"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
        width="0"
        height="0"
        style={{ position: "absolute", overflow: "visible", pointerEvents: "none" }}
      >
          <filter id="produla-liquid-glass" x="-20%" y="-20%" width="140%" height="140%" filterUnits="objectBoundingBox" primitiveUnits="objectBoundingBox" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.045 0.065" numOctaves="2" seed="8" result="glass-map" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.018" result="glass-blur" />
            <feDisplacementMap in="glass-blur" in2="glass-map" scale="1.4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        <filter id="produla-navbar-glass" x="-10%" y="-10%" width="120%" height="120%" filterUnits="objectBoundingBox" primitiveUnits="objectBoundingBox" colorInterpolationFilters="sRGB">
    <feImage href="data:image/png;base64,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" x="0" y="0" width="1" height="1" result="map"/>
    <feGaussianBlur in="SourceGraphic" stdDeviation="0.02" result="blur"/>
    <feDisplacementMap id="disp" in="blur" in2="map" scale="8" xChannelSelector="R" yChannelSelector="G">
      <animate attributeName="scale" to="14" dur="0.3s" begin="produla-navbar.mouseover" fill="freeze"/>
      <animate attributeName="scale" to="8" dur="0.3s" begin="produla-navbar.mouseout" fill="freeze"/>
    </feDisplacementMap>
  </filter>
        
      </svg>

      <header id="produla-navbar" className="navbar">

        <a className="wordmark" href="#home" aria-label="Produla home">

          produla<span>.</span>

        </a>



        <nav className="nav-links" aria-label="Main navigation">

          <a className="nav-active" href="#discover">Discover</a>

          <a href="#producers">Producers</a>

          <a href="#songs">Songs</a>
          <a href="#samples">Samples</a>

        </nav>



        <div className="nav-actions">

          {sessionPending ? null : session?.user ? (

            <div className="account-actions">

              <button

                className={`account-avatar${isCreatorAccount ? " account-avatar-creator" : ""}`}

                title="Your profile"

                aria-label="Open profile menu"

                onClick={() => setProfileMenuOpen(!profileMenuOpen)}

              >

<img
                  src={accountAvatarUrl || `${import.meta.env.BASE_URL}produla-avatar.svg`}
                  alt="Produla"
                  className="brand-avatar-image"
                />

              </button>



              <span className="account-greeting">

                Hi, {session.user.name || session.user.email}

              </span>



              <button

                className="button button-dark nav-cta"

                onClick={async () => {

                  const result = await supabase.auth.signOut();



                  if (result.error) {

                    showNotice(

                      result.error.message || "Couldn't log out."

                    );

                  } else {

                    setProfileMenuOpen(false);

                    showNotice("You've logged out.");

                  }

                }}

              >

                Log out

              </button>



              {profileMenuOpen && (

                <div className="profile-menu">

                  <div className="profile-menu-user">

                    <strong>

                      {session.user.name || "Your account"}

                    </strong>

                    <span>{session.user.email}</span>

                  </div>



                  <button onClick={openProfileEditor}>

                    Edit profile

                  </button>



                  <button

                    onClick={async () => {

                      setProfileMenuOpen(false);

                      const result = await supabase.auth.signOut();



                      if (result.error) {

                        showNotice(

                          result.error.message || "Couldn't log out."

                        );

                      } else {

                        showNotice("You've logged out.");

                      }

                    }}

                  >

                    Log out

                  </button>

                </div>

              )}

            </div>

          ) : (

            <>

              <button

                className="login-button"

                onClick={() => {

                  setAuthMode("login");

                  setAuthError("");

                }}

              >

                Log in

              </button>



              <button

                className="button button-dark nav-cta"

                onClick={() => {

                  setAuthMode("signup");

                  setAuthError("");

                }}

              >

                Get started <span>↗</span>

              </button>

            </>

          )}

        </div>

      </header>



      <main id="home">

        <section className="hero">

          <div className="hero-copy">

            <div className="eyebrow">

              <span className="live-dot" />

              A NEW WAY TO MAKE MUSIC

            </div>



            <h1>

              Your sound.

              <br />

              <span>Your people.</span>

            </h1>



            <p className="hero-description">

              Find the producer who gets your vision.

              Discover new sounds. Make something that

              wouldn't exist without you both.

            </p>



            <div className="hero-actions">

              <a className="button button-dark" href="#producers">

                Find your producer <span>↗</span>

              </a>

              <a className="button button-light" href="#discover">

                Explore the community

              </a>

            </div>



            <div className="hero-proof">

              <div className="hero-proof-symbol">✳</div>

              <p>

                <strong>Made together.</strong>

                <br />

                Built around your next big idea.

              </p>

            </div>

          </div>



          <div className="hero-art">

            <img

              className="hero-art-image"

              src={`${import.meta.env.BASE_URL}header-art.jpg`}

              alt="Produla music artwork"

            />

          </div>

        </section>



        <section className="ticker" aria-label="About Produla">

          <a className="ticker-brand" href="#home">produla.</a>

          <span className="ticker-tagline">Good music is better together.</span>

        </section>



        <div className="collaboration-wash" style={{ "--produla-bg-image": `url("${import.meta.env.BASE_URL}Dreamy%20Peach%20Glass%20Waves.png")` }}>
          <section className="discover-section photo-wash-section" id="discover">

          <div className="section-heading">

            <div>

              <div className="eyebrow">Find your next collaborator</div>

              <h2>

                Ideas looking for <span>their song.</span>

              </h2>

              <p>Artists with ideas, songs worth sharing.</p>

            </div>

          </div>



          <div className="marketplace-toolbar">
            <label className="marketplace-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={requestSearch}
                onChange={(event) => setRequestSearch(event.target.value)}
                placeholder="Search song ideas or genres..."
                aria-label="Search song requests"
              />
            </label>
            <div className="marketplace-filters" aria-label="Filter song requests">
              {["All", "Producer", "Singer", "Either"].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={requestFilter === filter ? "market-filter-active" : ""}
                  onClick={() => setRequestFilter(filter)}
                >{filter === "All" ? "All requests" : filter}</button>
              ))}
            </div>
          </div>
          {requestsLoading ? (
            <div className="empty-state"><p>Loading song requests...</p></div>
          ) : songRequests.filter((request) => {
              const query = requestSearch.trim().toLowerCase();
              const searchable = [request.title, request.description, request.genre, request.author?.display_name, request.author?.username].join(" ").toLowerCase();
              return (!query || searchable.includes(query)) && (requestFilter === "All" || request.looking_for === requestFilter);
            }).length > 0 ? (
            <div className="request-grid">
              {songRequests.filter((request) => {
                const query = requestSearch.trim().toLowerCase();
                const searchable = [request.title, request.description, request.genre, request.author?.display_name, request.author?.username].join(" ").toLowerCase();
                return (!query || searchable.includes(query)) && (requestFilter === "All" || request.looking_for === requestFilter);
              }).map((request) => (
                <article className="request-card" key={request.id}>
                  <div className="request-card-meta">
                    <span className="request-tag">{request.looking_for}</span>
                    {request.genre && <span className="request-genre">{request.genre}</span>}
                  </div>
                  <h3>{request.title}</h3>
                  <p className="request-description">{request.description}</p>
                  <div className="request-card-footer">
                    <div>
                      <strong>{request.author?.display_name || request.author?.username || "Produla artist"}{request.author_id === PRODULA_CREATOR_ID && <span className="creator-inline-badge" title="Produla Creator" aria-label="Produla Creator">✦</span>}</strong>
                      <span>{request.author?.username ? "@" + request.author.username : "Artist"}</span>
                    </div>
                    <span className="request-date">{new Date(request.created_at).toLocaleDateString()}</span>
                  </div>
                  {session?.user?.id === request.author_id && (
                    <button className="request-delete" onClick={async () => {
                      const { error } = await supabase.from("song_requests")
                        .delete().eq("id", request.id).eq("author_id", session.user.id);
                      if (error) showNotice(error.message || "Couldn't delete request.");
                      else {
                        setSongRequests((current) => current.filter((item) => item.id !== request.id));
                        showNotice("Song request deleted.");
                      }
                    }}>Delete request</button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">{requestSearch || requestFilter !== "All" ? "⌕" : "♫"}</div>
              <h3>{requestSearch || requestFilter !== "All" ? "No matching song ideas." : "The first song starts with you."}</h3>
              <p>{requestSearch || requestFilter !== "All" ? "Try another search or switch the filter to see more requests." : "When artists post a song idea, it will show up here for producers to discover."}</p>
              {requestSearch || requestFilter !== "All" ? (
                <button className="button button-light" onClick={() => { setRequestSearch(""); setRequestFilter("All"); }}>Clear filters</button>
              ) : (
                <button className="button button-dark" onClick={() => {
                  if (session?.user) {
                    setAuthError("");
                    setAuthMode("request");
                  } else {
                    setAuthError("Log in to post a song request.");
                    setAuthMode("login");
                  }
                }}>Post a song request <span>↗</span></button>
              )}
            </div>
          )}
        </section>



        <section className="producer-section photo-wash-section" id="producers">

          <div className="section-heading">

            <div>

              <div className="eyebrow">PRODUCERS</div>

              <h2>

                Meet your next <span>producer.</span>

              </h2>

              <p>Discover creative minds and hear what they make.</p>

            </div>

          </div>



          <div className="marketplace-toolbar artist-toolbar">
            <label className="marketplace-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={artistSearch}
                onChange={(event) => setArtistSearch(event.target.value)}
                placeholder="Search artists, usernames, genres..."
                aria-label="Search artist profiles"
              />
            </label>
            <div className="marketplace-filters" aria-label="Filter artist profiles">
              {["All", "producer", "singer", "both"].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={artistFilter === filter ? "market-filter-active" : ""}
                  onClick={() => setArtistFilter(filter)}
                >{{"All":"Everyone","producer":"Producers","singer":"Singers","both":"Both"}[filter]}</button>
              ))}
            </div>
          </div>
          {publicProfiles.length === 0 ? (

            <div className="empty-state">

              <div className="empty-state-icon">✳</div>

              <h3>A community waiting to happen.</h3>

              <p>

                There aren't any producer profiles yet.

                Real producers will appear here when they join Produla.

              </p>

              <button

                className="button button-dark"

                onClick={() => {

                  if (session?.user) openProfileEditor();

                  else setAuthMode("signup");

                }}

              >

                Join as a producer <span>↗</span>

              </button>

            </div>

          ) : (
            <>
            <div className="artist-grid">

              {publicProfiles.filter((artist) => {
                const query = artistSearch.trim().toLowerCase();
                const searchable = [artist.display_name, artist.username, artist.bio, ...(artist.genres || [])].join(" ").toLowerCase();
                const roleMatches = artistFilter === "All" || artist.artist_type === artistFilter;
                return (!query || searchable.includes(query)) && roleMatches;
              }).map((artist) => {

                const isCreatorProfile = artist.id === PRODULA_CREATOR_ID;

                const spotifyArtistId = (artist.spotify_url || "").match(
                  /open\.spotify\.com\/artist\/([A-Za-z0-9]+)/i
                )?.[1];

                const links = [

                  ["Spotify", artist.spotify_url],

                  ["Apple Music", artist.apple_music_url],

                  ["SoundCloud", artist.soundcloud_url],

                  ["YouTube", artist.youtube_url],

                  ["Instagram", artist.instagram_url],

                  ["TikTok", artist.tiktok_url],

                ].filter(([, url]) => /^https?:\/\//i.test(url || ""));



                return (

                  <article className={`artist-card${isCreatorProfile ? " artist-card-creator" : ""}`} key={artist.id}>

                    <div className="artist-card-top">

                      <span className="artist-avatar">

                        <img
                          src={`${import.meta.env.BASE_URL}produla-avatar.svg`}
                          alt="Produla"
                          className="brand-avatar-image"
                        />

                      </span>

                      <span className="artist-type">

                        {artist.artist_type === "both"

                          ? "Singer · Producer"

                          : artist.artist_type === "producer"

                            ? "Producer"

                            : "Singer"}

                      </span>

                    </div>

                    <div className="artist-name-row">
                      <h3>{artist.display_name}</h3>
                      {isCreatorProfile && <span className="creator-badge"><span aria-hidden="true">✦</span> Produla Creator</span>}
                    </div>
                    {isCreatorProfile && (
                      <div className="creator-profile-note">
                        <span className="creator-note-icon" aria-hidden="true">✳</span>
                        <div>
                          <strong>Built from the first note</strong>
                          <span>Official creator profile · Featured on Produla</span>
                        </div>
                      </div>
                    )}

                    <p className="artist-username">@{artist.username}</p>

                    {artist.bio && <p className="artist-bio">{artist.bio}</p>}

                    {artist.genres?.length > 0 && (

                      <div className="artist-genres">

                        {artist.genres.slice(0, 5).map((genre) => (

                          <span key={genre}>{genre}</span>

                        ))}

                      </div>

                    )}

                    {spotifyArtistId && (
                      <div className="spotify-artist-embed">
                        <iframe
                          title={`Spotify artist: ${artist.display_name || artist.username}`}
                          src={`https://open.spotify.com/embed/artist/${spotifyArtistId}?utm_source=generator`}
                          width="100%"
                          height="152"
                          style={{ border: 0 }}
                          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {links.length > 0 && (

                      <div className="artist-links">

                        {links.map(([label, url]) => (

                          <a key={label} href={url} target="_blank" rel="noreferrer">

                            {label} ↗

                          </a>

                        ))}

                      </div>

                    )}

                    <button className="button button-light artist-view-profile" type="button" onClick={() => {
                      setSelectedArtist(artist);
                      window.location.hash = "artist-" + encodeURIComponent(artist.username);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}>View profile <span>↗</span></button>

                  </article>

                );

              })}

            </div>
            {publicProfiles.filter((artist) => {
              const query = artistSearch.trim().toLowerCase();
              const searchable = [artist.display_name, artist.username, artist.bio, ...(artist.genres || [])].join(" ").toLowerCase();
              return (!query || searchable.includes(query)) && (artistFilter === "All" || artist.artist_type === artistFilter);
            }).length === 0 && (
              <div className="empty-state artist-no-results">
                <div className="empty-state-icon">⌕</div>
                <h3>No artists found.</h3>
                <p>Try a different name, genre, or artist type.</p>
                <button className="button button-light" onClick={() => { setArtistSearch(""); setArtistFilter("All"); }}>Clear filters</button>
              </div>
            )}
            </>
          )}

        </section>



        </div>

        <section className="song-library-section" id="songs">
          <div className="section-heading song-library-heading">
            <div>
              <div className="eyebrow">RECENTLY UPLOADED · THE PRODULA SONG LIBRARY</div>
              <h2>New music. <span>Made by the community.</span></h2>
              <p>Listen to original songs shared by artists on Produla.</p>
            </div>
            <button className="button button-dark" type="button" onClick={() => {
              if (!session?.user) { setAuthMode("login"); setAuthError("Log in to upload your own music."); return; }
              setAuthError(""); setAuthMode("song");
            }}>Upload a song <span>↗</span></button>
          </div>
          <div className="song-library-controls">
            <input aria-label="Search songs" type="search" placeholder="Search songs, artists or genres..." value={songSearch} onChange={(event) => setSongSearch(event.target.value)} />
            <select aria-label="Filter songs by genre" value={songGenreFilter} onChange={(event) => setSongGenreFilter(event.target.value)}>
              <option value="All">All genres</option>
              {[...new Set(songs.map((song) => song.genre).filter(Boolean))].sort().map((genre) => <option key={genre} value={genre}>{genre}</option>)}
            </select>
          </div>
          {songsLoading ? <div className="empty-state"><h3>Loading the song library...</h3></div> :
            songs.filter((song) => {
              const query = songSearch.trim().toLowerCase();
              const searchable = [song.title, song.description, song.genre, song.creator?.display_name, song.creator?.username].join(" ").toLowerCase();
              return (!query || searchable.includes(query)) && (songGenreFilter === "All" || song.genre === songGenreFilter);
            }).length ? (
              <div className="song-grid">
                {songs.filter((song) => {
                  const query = songSearch.trim().toLowerCase();
                  const searchable = [song.title, song.description, song.genre, song.creator?.display_name, song.creator?.username].join(" ").toLowerCase();
                  return (!query || searchable.includes(query)) && (songGenreFilter === "All" || song.genre === songGenreFilter);
                }).map((song) => (
                  <article className="song-card" key={song.id}>
                    <div className="song-card-top">
                      <span className="song-card-mark">♫</span>
                      <span className="song-card-genre">{song.genre || "Independent release"}</span>
                      {song.is_featured && <span className="song-featured-label">Featured</span>}
                    </div>
                    <h3>{song.title}</h3>
                    <p className="song-card-artist">by {song.creator?.display_name || song.creator?.username || "Produla artist"}</p>
                    {song.description && <p className="song-card-description">{song.description}</p>}
                    <AudioPlayer src={song.audio_url} label={`Play ${song.title}`} className="song-audio-player" onPlay={async () => {
                      if (songPlayLogged[song.id]) return;
                      setSongPlayLogged((current) => ({ ...current, [song.id]: true }));
                      const { error } = await supabase.from("song_plays").insert({ song_id: song.id });
                      if (error) {
                        console.error("Couldn't record song play:", error.message);
                        setSongPlayLogged((current) => { const next = { ...current }; delete next[song.id]; return next; });
                      } else {
                        setSongs((current) => current.map((item) => item.id === song.id ? { ...item, play_count: (item.play_count || 0) + 1 } : item));
                      }
                    }} />
                    <div className="song-card-footer">
                      <span>{Number(song.play_count || 0).toLocaleString()} plays · {new Date(song.created_at).toLocaleDateString()}</span>
                      {session?.user?.id === song.creator_id && (
                        <>
                        <button className="song-feature-toggle" type="button" onClick={async () => {
                          const nextFeatured = !song.is_featured;
                          const { error } = await supabase.from("songs").update({ is_featured: nextFeatured }).eq("id", song.id).eq("creator_id", session.user.id);
                          if (error) { showNotice(error.message || "Couldn't update featured song."); return; }
                          setSongs((current) => current.map((item) => item.id === song.id ? { ...item, is_featured: nextFeatured } : item));
                          showNotice(nextFeatured ? "Song featured on your profile." : "Song removed from featured.");
                        }}>{song.is_featured ? "Unfeature" : "Feature on profile"}</button>
                        <button className="song-delete" type="button" onClick={async () => {
                          const { error } = await supabase.from("songs").delete().eq("id", song.id).eq("creator_id", session.user.id);
                          if (error) { showNotice(error.message || "Couldn't delete song."); return; }
                          await supabase.storage.from("song-audio").remove([song.audio_path]);
                          setSongs((current) => current.filter((item) => item.id !== song.id));
                          showNotice("Song deleted.");
                        }}>Delete your song</button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">♫</div>
                <h3>{songSearch || songGenreFilter !== "All" ? "No songs match that search." : "The first track is yours to share."}</h3>
                <p>{songSearch || songGenreFilter !== "All" ? "Try another search or genre." : "When artists upload their music, everyone will be able to listen here."}</p>
                <button className="button button-light" type="button" onClick={() => {
                  if (!session?.user) { setAuthMode("login"); setAuthError("Log in to upload your own music."); }
                  else { setAuthError(""); setAuthMode("song"); }
                }}>Upload a song</button>
              </div>
            )}
        </section>

        <section className="samples-section photo-wash-section" id="samples" style={{ "--produla-bg-image": `url("${import.meta.env.BASE_URL}Dreamy%20Peach%20Glass%20Waves.png")` }}>
          <div className="section-heading samples-heading">
            <div>
              <div className="eyebrow">THE PRODULA SAMPLE LIBRARY</div>
              <h2>Find a sound. <span>Make it yours.</span></h2>
              <p>Loops, vocals, textures and ideas shared by the Produla community.</p>
            </div>
            <button className="button button-dark" type="button" onClick={() => {
              if (!session?.user) { setAuthMode("login"); setAuthError("Log in to upload your own samples."); return; }
              setAuthError(""); setAuthMode("sample");
            }}>Upload a sample <span>↗</span></button>
          </div>
          <div className="sample-library-controls">
            <input aria-label="Search samples" type="search" placeholder="Search samples, genres or tags..." value={sampleSearch} onChange={(event) => setSampleSearch(event.target.value)} />
            <select aria-label="Filter samples by genre" value={sampleGenreFilter} onChange={(event) => setSampleGenreFilter(event.target.value)}>
              <option value="All">All genres</option>
              {[...new Set(samples.map((sample) => sample.genre).filter(Boolean))].sort().map((genre) => <option key={genre} value={genre}>{genre}</option>)}
            </select>
          </div>
          {samplesLoading ? <div className="empty-state"><h3>Loading the sample library...</h3></div> :
            samples.filter((sample) => {
              const query = sampleSearch.trim().toLowerCase();
              const searchable = [sample.title, sample.description, sample.genre, ...(sample.tags || []), sample.creator?.display_name, sample.creator?.username].join(" ").toLowerCase();
              return (!query || searchable.includes(query)) && (sampleGenreFilter === "All" || sample.genre === sampleGenreFilter);
            }).length ? (
              <div className="sample-grid">
                {samples.filter((sample) => {
                  const query = sampleSearch.trim().toLowerCase();
                  const searchable = [sample.title, sample.description, sample.genre, ...(sample.tags || []), sample.creator?.display_name, sample.creator?.username].join(" ").toLowerCase();
                  return (!query || searchable.includes(query)) && (sampleGenreFilter === "All" || sample.genre === sampleGenreFilter);
                }).map((sample) => (
                  <article className="sample-card" key={sample.id}>
                    <div className="sample-card-top"><span className="sample-card-genre">{sample.genre || "Uncategorised"}</span><span className="sample-card-price">{sample.price_cents === 0 ? "Free" : `$${(sample.price_cents / 100).toFixed(2)}`}</span></div>
                    <h3>{sample.title}</h3>
                    {sample.description && <p>{sample.description}</p>}
                    {sample.tags?.length > 0 && <div className="sample-card-tags">{sample.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>}
                    <AudioPlayer src={sample.audio_url} label={`Preview ${sample.title}`} className="sample-audio-player" />
                    <div className="sample-card-footer">
                      <span>by {sample.creator?.display_name || sample.creator?.username || "Produla creator"}</span>
                      <button className="button button-light" type="button" onClick={() => showNotice("Purchases are coming soon. No payment has been taken.")} disabled={sample.price_cents === 0}> {sample.price_cents === 0 ? "Free preview" : "Buy · Coming soon"} </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : <div className="empty-state"><div className="empty-state-icon">♫</div><h3>No samples found just yet.</h3><p>Try another search, or be the first to upload a sound.</p></div>}
          <div className="sample-payments-note"><span>PAYMENTS COMING SOON</span><p>Sample prices are displayed for now. Checkout and creator payouts will be enabled in a future update.</p></div>
        </section>

      </main>



      {selectedArtist && (
        <div className="artist-profile-overlay">
          <section className="artist-profile-page" aria-label={`${selectedArtist.display_name || selectedArtist.username}'s profile`}>
            <button className="artist-profile-back" type="button" onClick={() => {
              setSelectedArtist(null);
              window.location.hash = "producers";
            }}>← Back to discover</button>
            <div className={`artist-profile-hero${selectedArtist.id === PRODULA_CREATOR_ID ? " artist-profile-hero-creator" : ""}`}>
              <div className="artist-profile-avatar">
                <img src={selectedArtist.avatar_url || `${import.meta.env.BASE_URL}produla-avatar.svg`} alt={`${selectedArtist.display_name || selectedArtist.username} profile picture`}/>
              </div>
              <div className="eyebrow">{selectedArtist.id === PRODULA_CREATOR_ID ? "✦ PRODULA CREATOR" : "PRODULA ARTIST"}</div>
              <h1>{selectedArtist.display_name || selectedArtist.username}</h1>
              <p className="artist-profile-username">@{selectedArtist.username}</p>
              <span className="artist-profile-type">{selectedArtist.artist_type === "both" ? "Singer · Producer" : selectedArtist.artist_type === "producer" ? "Producer" : "Singer"}</span>
              {selectedArtist.bio && <p className="artist-profile-bio">{selectedArtist.bio}</p>}
              {selectedArtist.genres?.length > 0 && <div className="artist-genres artist-profile-genres">{selectedArtist.genres.map((genre) => <span key={genre}>{genre}</span>)}</div>}
              <div className="artist-profile-links">
                {[
                  ["Spotify", selectedArtist.spotify_url],
                  ["Apple Music", selectedArtist.apple_music_url],
                  ["SoundCloud", selectedArtist.soundcloud_url],
                  ["YouTube", selectedArtist.youtube_url],
                  ["Instagram", selectedArtist.instagram_url],
                  ["TikTok", selectedArtist.tiktok_url],
                ].filter(([, url]) => /^https?:\/\//i.test(url || "")).map(([label, url]) => (
                  <a key={label} href={url} target="_blank" rel="noreferrer">{label} ↗</a>
                ))}
              </div>
            </div>
            {[
              ["Spotify monthly listeners", selectedArtist.spotify_monthly_listeners],
              ["Spotify followers", selectedArtist.spotify_followers],
              ["YouTube subscribers", selectedArtist.youtube_subscribers],
              ["SoundCloud followers", selectedArtist.soundcloud_followers],
            ].some(([, value]) => value !== null && value !== undefined) && (
              <div className="artist-public-stats">
                <div className="artist-public-stats-heading">
                  <span className="eyebrow">AUDIENCE</span>
                  <span>Artist-reported</span>
                </div>
                <div className="artist-public-stats-grid">
                  {[
                    ["Monthly listeners", selectedArtist.spotify_monthly_listeners, "Spotify"],
                    ["Followers", selectedArtist.spotify_followers, "Spotify"],
                    ["Subscribers", selectedArtist.youtube_subscribers, "YouTube"],
                    ["Followers", selectedArtist.soundcloud_followers, "SoundCloud"],
                  ].filter(([, value]) => value !== null && value !== undefined).map(([label, value, platform]) => (
                    <div className="artist-public-stat" key={platform}>
                      <strong>{Number(value).toLocaleString()}</strong>
                      <span>{label}</span>
                      <small>{platform}</small>
                    </div>
                  ))}
                </div>
                {selectedArtist.stats_updated_at && <p className="artist-public-stats-updated">Last updated {new Date(selectedArtist.stats_updated_at).toLocaleDateString()}</p>}
              </div>
            )}
            <div className="artist-posts-section">
              <div className="artist-posts-heading">
                <div>
                  <div className="eyebrow">FROM THE ARTIST</div>
                  <h2>Posts <span>& updates.</span></h2>
                </div>
                <span className="artist-posts-count">{artistPosts.filter((post) => post.artist_id === selectedArtist.id).length} updates</span>
              </div>
              {session?.user?.id === selectedArtist.id && (
                <div className="artist-post-composer">
                  <textarea
                    value={artistPostContent}
                    onChange={(event) => setArtistPostContent(event.target.value.slice(0, 1000))}
                    placeholder="Share what you're working on..."
                    maxLength={1000}
                    rows={3}
                    aria-label="Write an artist post"
                  />
                  <div className="artist-post-composer-footer">
                    <span>{artistPostContent.length}/1000</span>
                    <button className="button button-dark" type="button" onClick={createArtistPost} disabled={!artistPostContent.trim() || artistPostSubmitting}>
                      {artistPostSubmitting ? "Posting..." : "Share post"}
                    </button>
                  </div>
                </div>
              )}
              {artistPosts.filter((post) => post.artist_id === selectedArtist.id).length ? (
                <div className="artist-post-list">
                  {artistPosts.filter((post) => post.artist_id === selectedArtist.id).map((post) => (
                    <article className="artist-post-card" key={post.id}>
                      <div className="artist-post-card-top">
                        <div className="artist-post-author">
                          <img src={selectedArtist.avatar_url || `${import.meta.env.BASE_URL}produla-avatar.svg`} alt="" />
                          <div>
                            <strong>{selectedArtist.display_name || selectedArtist.username}</strong>
                            <span>@{selectedArtist.username}</span>
                          </div>
                        </div>
                        <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</time>
                      </div>
                      <p>{post.content}</p>
                      {session?.user?.id === selectedArtist.id && (
                        <button className="artist-post-delete" type="button" onClick={() => deleteArtistPost(post.id)}>Delete post</button>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="artist-posts-empty">
                  <span>✳</span>
                  <strong>No posts yet.</strong>
                  <p>Artist updates and announcements will show up here.</p>
                </div>
              )}
            </div>
            <div className="artist-profile-requests">
              <div className="eyebrow">COLLABORATE</div>
              <h2>Song requests <span>from {selectedArtist.display_name || selectedArtist.username}.</span></h2>
              {songRequests.filter((request) => request.author_id === selectedArtist.id).length ? (
                <div className="request-grid">
                  {songRequests.filter((request) => request.author_id === selectedArtist.id).map((request) => (
                    <article className="request-card" key={request.id}>
                      <div className="request-card-meta">
                        <span className="request-tag">{request.looking_for}</span>
                        {request.genre && <span className="request-genre">{request.genre}</span>}
                      </div>
                      <h3>{request.title}</h3>
                      <p className="request-description">{request.description}</p>
                      <span className="request-date">{new Date(request.created_at).toLocaleDateString()}</span>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state artist-profile-empty">
                  <div className="empty-state-icon">♫</div>
                  <h3>No song requests yet.</h3>
                  <p>When this artist posts a collaboration idea, it will appear here.</p>
                </div>
              )}
              {session?.user && session.user.id !== selectedArtist.id && (
                <button className="button button-dark artist-profile-request-cta" type="button" onClick={() => {
                  setRequestLookingFor(selectedArtist.artist_type === "producer" ? "Singer" : "Producer");
                  setRequestTitle("");
                  setRequestDescription("");
                  setRequestGenre(selectedArtist.genres?.[0] || "");
                  setSelectedArtist(null);
                  setAuthError("");
                  setAuthMode("request");
                  window.history.replaceState(null, "", window.location.pathname + window.location.search);
                }}>Start a collaboration request <span>↗</span></button>
              )}

              {(() => {
                const artistSongs = songs.filter((song) => song.creator_id === selectedArtist.id);
                const featuredSongs = artistSongs.filter((song) => song.is_featured);
                const orderedSongs = [...featuredSongs, ...artistSongs.filter((song) => !song.is_featured)];
                const totalPlays = artistSongs.reduce((total, song) => total + Number(song.play_count || 0), 0);
                return (
                  <div className="artist-discography">
                    <div className="artist-discography-heading">
                      <div><div className="eyebrow">THE MUSIC</div><h2>Releases <span>& plays.</span></h2></div>
                      <div className="artist-music-stats">
                        <span><strong>{artistSongs.length}</strong> {artistSongs.length === 1 ? "song" : "songs"}</span>
                        <span><strong>{totalPlays.toLocaleString()}</strong> total plays</span>
                      </div>
                    </div>
                    {orderedSongs.length ? (
                      <div className="artist-discography-list">
                        {orderedSongs.map((song) => (
                          <article className={song.is_featured ? "artist-release artist-release-featured" : "artist-release"} key={song.id}>
                            <div className="artist-release-info">
                              <span className="artist-release-icon">♫</span>
                              <div>
                                <h3>{song.title} {song.is_featured && <span className="song-featured-label">Featured</span>}</h3>
                                <p>{song.genre || "Independent release"} · {Number(song.play_count || 0).toLocaleString()} plays</p>
                                {song.description && <p className="artist-release-description">{song.description}</p>}
                              </div>
                            </div>
                            <AudioPlayer src={song.audio_url} label={`Play ${song.title}`} className="song-audio-player" onPlay={async () => {
                      if (songPlayLogged[song.id]) return;
                      setSongPlayLogged((current) => ({ ...current, [song.id]: true }));
                      const { error } = await supabase.from("song_plays").insert({ song_id: song.id });
                      if (error) {
                        console.error("Couldn't record song play:", error.message);
                        setSongPlayLogged((current) => { const next = { ...current }; delete next[song.id]; return next; });
                      } else {
                        setSongs((current) => current.map((item) => item.id === song.id ? { ...item, play_count: (item.play_count || 0) + 1 } : item));
                      }
                    }} />
                          </article>
                        ))}
                      </div>
                    ) : <div className="artist-discography-empty">No songs uploaded yet. Their releases will appear here.</div>}
                  </div>
                );
              })()}
            </div>
          </section>
        </div>
      )}

      <footer className="footer">

        <a className="wordmark" href="#home">

          produla<span>.</span>

        </a>

        <p>Good music is better together.</p>

        <span>MADE FOR WHAT'S NEXT. © 2026 PRODULA</span>

      </footer>



      {authMode && (

        <div

          className="auth-overlay"

          onClick={() => {

            if (!authLoading) setAuthMode("");

          }}

        >

          <div

            className="auth-modal"

            onClick={(event) => event.stopPropagation()}

          >

            <button

              className="auth-close"

              onClick={() => {

                if (!authLoading) setAuthMode("");

              }}

              aria-label="Close"

              disabled={authLoading}

            >

              ×

            </button>



            <h2>
              {authMode === "song" ? "Share your music." : authMode === "sample" ? "Share a sound." : authMode === "request" ? "Post a song request." :
                authMode === "profile" ? "Your profile." :
                authMode === "login" ? "Welcome back." : "Make something real."}
            </h2>



            <p>
              {authMode === "song" ? "Upload an original track for people to discover and listen to." : authMode === "sample" ? "Add a sound to the Produla sample library." : authMode === "request" ? "Give producers an idea of the song you want to make." :
                authMode === "profile" ? "Make your Produla profile yours." :
                authMode === "login" ? "Log in to continue making music together." :
                "Create your Produla account to get started."}
            </p>



            <form onSubmit={handleAuthSubmit}>

              {authMode === "profile" && (

                <>

                  <div className="profile-picture-editor">
                    <img src={profileAvatarPreview || profileAvatarUrl || `${import.meta.env.BASE_URL}produla-avatar.svg`} alt="Profile picture preview" className="profile-picture-preview" />
                    <label className="profile-picture-label">Profile picture (JPG, PNG or WebP, max 5 MB)
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                        const file = event.target.files?.[0] || null;
                        setProfileAvatarFile(file);
                        setProfileAvatarPreview(file ? URL.createObjectURL(file) : "");
                      }} />
                    </label>
                  </div>

                  <input

                    type="text"

                    placeholder="Username (e.g. joelmusic)"

                    value={profileUsername}

                    onChange={(event) =>

                      setProfileUsername(event.target.value)

                    }

                    minLength={3}

                    maxLength={24}

                    pattern="[A-Za-z0-9_]+"

                    title="Use 3–24 letters, numbers or underscores."

                    required

                  />



                  <input

                    type="text"

                    placeholder="Display name"

                    value={profileName}

                    onChange={(event) =>

                      setProfileName(event.target.value)

                    }

                    maxLength={80}

                    required

                  />



                  <select

                    value={profileType}

                    onChange={(event) =>

                      setProfileType(event.target.value)

                    }

                  >

                    <option value="singer">I'm a singer</option>

                    <option value="producer">I'm a producer</option>

                    <option value="both">I'm both</option>

                  </select>



                  <textarea

                    placeholder="Tell people about your music..."

                    value={profileBio}

                    onChange={(event) =>

                      setProfileBio(event.target.value)

                    }

                    maxLength={500}

                    rows={3}

                  />



                  <input

                    type="text"

                    placeholder="Genres (e.g. Pop, R&B, Hip-hop)"

                    value={profileGenres}

                    onChange={(event) =>

                      setProfileGenres(event.target.value)

                    }

                  />



                  <input

                    type="url"

                    placeholder="Spotify URL"

                    value={profileSpotify}

                    onChange={(event) =>

                      setProfileSpotify(event.target.value)

                    }

                  />



                  <input

                    type="url"

                    placeholder="Apple Music URL"

                    value={profileAppleMusic}

                    onChange={(event) =>

                      setProfileAppleMusic(event.target.value)

                    }

                  />



                  <input

                    type="url"

                    placeholder="SoundCloud URL"

                    value={profileSoundCloud}

                    onChange={(event) =>

                      setProfileSoundCloud(event.target.value)

                    }

                  />



                  <input

                    type="url"

                    placeholder="YouTube URL"

                    value={profileYouTube}

                    onChange={(event) =>

                      setProfileYouTube(event.target.value)

                    }

                  />



                  <input

                    type="url"

                    placeholder="Instagram URL"

                    value={profileInstagram}

                    onChange={(event) =>

                      setProfileInstagram(event.target.value)

                    }

                  />



                  <input

                    type="url"

                    placeholder="TikTok URL"

                    value={profileTikTok}

                    onChange={(event) =>

                      setProfileTikTok(event.target.value)

                    }

                  />

                  <div className="profile-stats-editor">
                    <div>
                      <span className="eyebrow">AUDIENCE STATS</span>
                      <p>Enter the latest numbers from your artist dashboards. These figures are self-reported and won’t sync automatically.</p>
                    </div>
                    <label>Spotify monthly listeners<input type="number" min="0" step="1" inputMode="numeric" placeholder="e.g. 12500" value={profileSpotifyMonthlyListeners} onChange={(event) => setProfileSpotifyMonthlyListeners(event.target.value)} /></label>
                    <label>Spotify followers<input type="number" min="0" step="1" inputMode="numeric" placeholder="e.g. 2400" value={profileSpotifyFollowers} onChange={(event) => setProfileSpotifyFollowers(event.target.value)} /></label>
                    <label>YouTube subscribers<input type="number" min="0" step="1" inputMode="numeric" placeholder="e.g. 850" value={profileYoutubeSubscribers} onChange={(event) => setProfileYoutubeSubscribers(event.target.value)} /></label>
                    <label>SoundCloud followers<input type="number" min="0" step="1" inputMode="numeric" placeholder="e.g. 600" value={profileSoundcloudFollowers} onChange={(event) => setProfileSoundcloudFollowers(event.target.value)} /></label>
                  </div>

                </>

              )}




              {authMode === "song" && (
                <>
                  <input type="text" placeholder="Song title" value={songTitle} onChange={(event) => setSongTitle(event.target.value)} minLength={2} maxLength={120} required />
                  <textarea placeholder="A little about this track..." value={songDescription} onChange={(event) => setSongDescription(event.target.value)} maxLength={1200} rows={3} />
                  <input type="text" placeholder="Genre (e.g. House, Pop, R&B)" value={songGenre} onChange={(event) => setSongGenre(event.target.value)} maxLength={60} />
                  <label className="song-file-label">Your song file (MP3, WAV, M4A, AAC, OGG, FLAC or WebM · max 100 MB)
                    <input type="file" accept="audio/*" onChange={(event) => { const file = event.target.files?.[0] || null; setSongAudioFile(file); setSongAudioPreview(file ? URL.createObjectURL(file) : ""); }} required />
                  </label>
                  {songAudioPreview && <AudioPlayer src={songAudioPreview} label="Preview your song" className="upload-audio-player song-upload-preview" />}
                  <p className="song-upload-hint">Only upload music you created or have permission to share.</p>
                </>
              )}

              {authMode === "sample" && (
                <>
                  <input type="text" placeholder="Sample name" value={sampleTitle} onChange={(event) => setSampleTitle(event.target.value)} minLength={3} maxLength={100} required />
                  <textarea placeholder="Describe your sound..." value={sampleDescription} onChange={(event) => setSampleDescription(event.target.value)} maxLength={1000} rows={3} />
                  <input type="text" placeholder="Genre (e.g. House, R&B, Pop)" value={sampleGenre} onChange={(event) => setSampleGenre(event.target.value)} maxLength={60} />
                  <input type="text" placeholder="Tags, separated by commas" value={sampleTags} onChange={(event) => setSampleTags(event.target.value)} maxLength={300} />
                  <label className="sample-file-label">Audio file (MP3, WAV, M4A, AAC, OGG, FLAC or WebM · max 50 MB)
                    <input type="file" accept="audio/*" onChange={(event) => { const file = event.target.files?.[0] || null; setSampleAudioFile(file); setSampleAudioPreview(file ? URL.createObjectURL(file) : ""); }} required />
                  </label>
                  {sampleAudioPreview && <AudioPlayer src={sampleAudioPreview} label="Preview your sample" className="upload-audio-player sample-upload-preview" />}
                  <input type="number" placeholder="Price in AUD (0 for free)" value={samplePrice} onChange={(event) => setSamplePrice(event.target.value)} min="0" max="1000" step="0.01" required />
                  <p className="sample-payment-hint">You can set a display price, but payments are not active yet. No one can purchase samples yet.</p>
                </>
              )}

              {authMode === "request" && (
                <>
                  <input type="text" placeholder="Song idea or working title" value={requestTitle}
                    onChange={(event) => setRequestTitle(event.target.value)}
                    minLength={3} maxLength={100} required />
                  <textarea placeholder="Describe the sound, mood, or idea you have in mind..."
                    value={requestDescription} onChange={(event) => setRequestDescription(event.target.value)}
                    minLength={10} maxLength={1200} rows={5} required />
                  <input type="text" placeholder="Genre (e.g. house, R&B, pop)" value={requestGenre}
                    onChange={(event) => setRequestGenre(event.target.value)} maxLength={60} />
                  <select value={requestLookingFor} onChange={(event) => setRequestLookingFor(event.target.value)}>
                    <option value="Producer">Looking for a producer</option>
                    <option value="Singer">Looking for a singer</option>
                    <option value="Either">Open to either</option>
                  </select>
                </>
              )}

              {authMode === "signup" && (

                <input

                  type="text"

                  placeholder="Your name"

                  value={authName}

                  onChange={(event) => setAuthName(event.target.value)}

                  required

                />

              )}



              {authMode !== "profile" && authMode !== "request" && authMode !== "sample" && authMode !== "song" && (

                <>

                  <input

                    type="email"

                    placeholder="Email address"

                    value={authEmail}

                    onChange={(event) => setAuthEmail(event.target.value)}

                    required

                  />



                  <input

                    type="password"

                    placeholder="Password (at least 8 characters)"

                    value={authPassword}

                    onChange={(event) =>

                      setAuthPassword(event.target.value)

                    }

                    minLength={8}

                    required

                  />

                </>

              )}



              {authError && (

                <p className="auth-error" role="alert">

                  {authError}

                </p>

              )}



              <button

                className="button button-dark auth-submit"

                type="submit"

                disabled={authLoading}

              >

                {authLoading

                  ? "Please wait..."

                  : authMode === "profile"

                    ? "Save profile"

                    : authMode === "song"
                    ? "Upload song"
                    : authMode === "sample"
                    ? "Upload sample"
                    : authMode === "request"
                    ? "Post song request"
                    : authMode === "login"
                      ? "Log in"
                      : "Create account"}

              </button>

            </form>



            {authMode !== "profile" && authMode !== "request" && authMode !== "sample" && authMode !== "song" && (

              <button

                className="auth-switch"

                onClick={() => {

                  setAuthMode(

                    authMode === "login" ? "signup" : "login"

                  );

                  setAuthError("");

                }}

              >

                {authMode === "login"

                  ? "New to Produla? Create an account"

                  : "Already have an account? Log in"}

              </button>

            )}

          </div>

        </div>

      )}



      {notice && (

        <div className="toast" role="status">

          <span>✳</span> {notice}

          <button

            aria-label="Dismiss notification"

            onClick={() => setNotice("")}

          >

            ×

          </button>

        </div>

      )}

    </div>

  );

}



export default App;
