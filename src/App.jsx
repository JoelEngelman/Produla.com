

import { useEffect, useState } from "react";

import { supabase } from "./lib/supabase";

import "./App.css";



const PRODULA_CREATOR_ID = "dafff309-26a8-4d42-8f34-2420c7914a89";

function App() {

  const [notice, setNotice] = useState("");

  const [publicProfiles, setPublicProfiles] = useState([]);
  const [songRequests, setSongRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestSearch, setRequestSearch] = useState("");
  const [requestFilter, setRequestFilter] = useState("All");
  const [artistSearch, setArtistSearch] = useState("");
  const [artistFilter, setArtistFilter] = useState("All");
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestDescription, setRequestDescription] = useState("");
  const [requestGenre, setRequestGenre] = useState("");
  const [requestLookingFor, setRequestLookingFor] = useState("Producer");



  useEffect(() => {

    let active = true;



    async function loadPublicProfiles() {

      const { data, error } = await supabase

        .from("artist_profiles")

        .select("id, username, display_name, artist_type, bio, genres, spotify_url, apple_music_url, soundcloud_url, youtube_url, instagram_url, tiktok_url")

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

  const [session, setSession] = useState(null);

  const [sessionPending, setSessionPending] = useState(true);

  const isCreatorAccount = session?.user?.id === PRODULA_CREATOR_ID;



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

  const [profileAppleMusic, setProfileAppleMusic] = useState("");

  const [profileSoundCloud, setProfileSoundCloud] = useState("");

  const [profileYouTube, setProfileYouTube] = useState("");

  const [profileInstagram, setProfileInstagram] = useState("");

  const [profileTikTok, setProfileTikTok] = useState("");



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

    setProfileAppleMusic("");

    setProfileSoundCloud("");

    setProfileYouTube("");

    setProfileInstagram("");

    setProfileTikTok("");

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

        setProfileAppleMusic(profile.apple_music_url || "");

        setProfileSoundCloud(profile.soundcloud_url || "");

        setProfileYouTube(profile.youtube_url || "");

        setProfileInstagram(profile.instagram_url || "");

        setProfileTikTok(profile.tiktok_url || "");

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

      if (authMode === "request") {
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

            apple_music_url: profileAppleMusic.trim(),

            soundcloud_url: profileSoundCloud.trim(),

            youtube_url: profileYouTube.trim(),

            instagram_url: profileInstagram.trim(),

            tiktok_url: profileTikTok.trim(),

            updated_at: new Date().toISOString(),

          }, { onConflict: "id" })

          .select()

          .single();



        if (error) throw error;

        if (savedProfile) {

          setProfileName(savedProfile.display_name || profileName);

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

      <header className="navbar">

        <a className="wordmark" href="#home" aria-label="Produla home">

          produla<span>.</span>

        </a>



        <nav className="nav-links" aria-label="Main navigation">

          <a className="nav-active" href="#discover">Discover</a>

          <a href="#producers">Producers</a>

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
                  src={`${import.meta.env.BASE_URL}produla-avatar.svg`}
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



        <section className="ticker" aria-label="What Produla offers">

          <span>FIND YOUR SOUND</span><i>✳</i>

          <span>MEET YOUR PEOPLE</span><i>✳</i>

          <span>MAKE SOMETHING REAL</span><i>✳</i>

          <span>FIND YOUR SOUND</span>

        </section>



        <section className="discover-section" id="discover">

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



        <section className="producer-section" id="producers">

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
                      window.history.replaceState(null, "", "#artist-" + encodeURIComponent(artist.username));
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
          )}

        </section>



        <section className="sample-banner" id="samples">

          <div>

            <div className="eyebrow">

              A LITTLE SOMETHING TO START WITH

            </div>

            <h2>

              Sometimes one sound

              <br />

              changes <span>everything.</span>

            </h2>

            <p>Find your next loop, vocal chop, or happy accident.</p>

            <button

              className="button button-dark"

              onClick={() =>

                showNotice("Sample uploads and purchases aren't available yet.")

              }

            >

              Explore samples <span>↗</span>

            </button>

          </div>



          <div className="sample-graphic" aria-hidden="true">

            {Array.from({ length: 45 }, (_, i) => (

              <span

                key={i}

                style={{

                  height: `${14 + Math.abs(Math.sin(i * 0.43)) * 105}px`,

                }}

              />

            ))}

            <div className="sample-play">▶</div>

          </div>

        </section>

      </main>



      {selectedArtist && (
        <div className="artist-profile-overlay">
          <section className="artist-profile-page" aria-label={`${selectedArtist.display_name || selectedArtist.username}'s profile`}>
            <button className="artist-profile-back" type="button" onClick={() => {
              setSelectedArtist(null);
              window.history.replaceState(null, "", window.location.pathname + window.location.search);
            }}>← Back to discover</button>
            <div className={`artist-profile-hero${selectedArtist.id === PRODULA_CREATOR_ID ? " artist-profile-hero-creator" : ""}`}>
              <div className="artist-profile-avatar">
                <img src={`${import.meta.env.BASE_URL}produla-avatar.svg`} alt="Produla" />
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
              {authMode === "request" ? "Post a song request." :
                authMode === "profile" ? "Your profile." :
                authMode === "login" ? "Welcome back." : "Make something real."}
            </h2>



            <p>
              {authMode === "request" ? "Give producers an idea of the song you want to make." :
                authMode === "profile" ? "Make your Produla profile yours." :
                authMode === "login" ? "Log in to continue making music together." :
                "Create your Produla account to get started."}
            </p>



            <form onSubmit={handleAuthSubmit}>

              {authMode === "profile" && (

                <>

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



              {authMode !== "profile" && authMode !== "request" && (

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

                    : authMode === "request"
                    ? "Post song request"
                    : authMode === "login"
                      ? "Log in"
                      : "Create account"}

              </button>

            </form>



            {authMode !== "profile" && authMode !== "request" && (

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
