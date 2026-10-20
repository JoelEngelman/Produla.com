
import { useState } from "react";
import { authClient } from "./lib/auth-client";
import "./App.css";

function App() {
  const [notice, setNotice] = useState("");

  const { data: session, isPending: sessionPending } =
    authClient.useSession();

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
      const response = await fetch("/api/profile", {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Couldn't load your profile.");
      }

      if (data.profile) {
        const profile = data.profile;

        setProfileUsername(profile.username || "");
        setProfileName(
          profile.displayName || session?.user?.name || ""
        );
        setProfileType(profile.artistType || "singer");
        setProfileBio(profile.bio || "");
        setProfileGenres(
          Array.isArray(profile.genres)
            ? profile.genres.join(", ")
            : ""
        );
        setProfileSpotify(profile.spotifyUrl || "");
        setProfileAppleMusic(profile.appleMusicUrl || "");
        setProfileSoundCloud(profile.soundcloudUrl || "");
        setProfileYouTube(profile.youtubeUrl || "");
        setProfileInstagram(profile.instagramUrl || "");
        setProfileTikTok(profile.tiktokUrl || "");
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
      if (authMode === "profile") {
        const genres = profileGenres
          .split(",")
          .map((genre) => genre.trim())
          .filter(Boolean)
          .slice(0, 10);

        const response = await fetch("/api/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            username: profileUsername,
            displayName: profileName,
            artistType: profileType,
            bio: profileBio,
            genres,
            spotifyUrl: profileSpotify,
            appleMusicUrl: profileAppleMusic,
            soundcloudUrl: profileSoundCloud,
            youtubeUrl: profileYouTube,
            instagramUrl: profileInstagram,
            tiktokUrl: profileTikTok,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Couldn't save your profile."
          );
        }

        if (data.profile) {
          setProfileName(data.profile.displayName || profileName);
        }

        setAuthMode("");
        setProfileMenuOpen(false);
        showNotice("Profile saved!");
      } else {
        const result =
          authMode === "signup"
            ? await authClient.signUp.email({
                name: authName,
                email: authEmail,
                password: authPassword,
              })
            : await authClient.signIn.email({
                email: authEmail,
                password: authPassword,
              });

        if (result.error) {
          throw new Error(
            result.error.message || "Something went wrong."
          );
        }

        const wasSignup = authMode === "signup";

        setAuthMode("");
        setAuthEmail("");
        setAuthPassword("");
        setAuthName("");

        showNotice(
          wasSignup
            ? "Account created successfully!"
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
                className="account-avatar"
                title="Your profile"
                aria-label="Open profile menu"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              >
                {(
                  (session.user.name || session.user.email || "U")
                    .trim()
                    .split(/\s+/)
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                ).toUpperCase()}
              </button>

              <span className="account-greeting">
                Hi, {session.user.name || session.user.email}
              </span>

              <button
                className="button button-dark nav-cta"
                onClick={async () => {
                  const result = await authClient.signOut();

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
                      const result = await authClient.signOut();

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

          <div
            className="hero-art"
            aria-label="Abstract music-inspired artwork"
          >
            <div className="art-label art-label-top">
              <span className="art-label-dot" />
              SOUND IN MOTION
            </div>

            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />

            <div className="art-disc">
              <div className="disc-ring disc-ring-one" />
              <div className="disc-ring disc-ring-two" />
              <div className="disc-core">p<span>.</span></div>
            </div>

            <div className="art-wave">
              {Array.from({ length: 31 }, (_, i) => (
                <span
                  key={i}
                  style={{
                    height: `${18 + Math.abs(Math.sin(i * 0.62)) * 83}px`,
                  }}
                />
              ))}
            </div>

            <div className="floating-note note-one">♫</div>
            <div className="floating-note note-two">♪</div>

            <div className="art-label art-label-bottom">
              <span>01 / CREATE SOMETHING NEW</span>
              <span>✳</span>
            </div>
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
              <div className="eyebrow">THE NEXT COLLAB STARTS HERE</div>
              <h2>
                Ideas looking for <span>their sound.</span>
              </h2>
              <p>Artists with a vision. Songs waiting to happen.</p>
            </div>
          </div>

          <div className="empty-state">
            <div className="empty-state-icon">♫</div>
            <h3>The first song starts with you.</h3>
            <p>
              No song requests have been posted yet.
              When real artists share their ideas, you'll find them here.
            </p>
            <button
              className="button button-dark"
              onClick={() =>
                showNotice("Posting song requests isn't available yet.")
              }
            >
              Post a song request <span>↗</span>
            </button>
          </div>
        </section>

        <section className="producer-section" id="producers">
          <div className="section-heading">
            <div>
              <div className="eyebrow">GOOD PEOPLE. GREAT SOUND.</div>
              <h2>
                Meet your next <span>producer.</span>
              </h2>
              <p>Discover creative minds and hear what they make.</p>
            </div>
          </div>

          <div className="empty-state">
            <div className="empty-state-icon">✳</div>
            <h3>A community waiting to happen.</h3>
            <p>
              There aren't any producer profiles yet.
              Real producers will appear here when they join Produla.
            </p>
            <button
              className="button button-dark"
              onClick={() =>
                showNotice("Producer sign-up isn't available yet.")
              }
            >
              Join as a producer <span>↗</span>
            </button>
          </div>
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
              {authMode === "profile"
                ? "Your profile."
                : authMode === "login"
                  ? "Welcome back."
                  : "Make something real."}
            </h2>

            <p>
              {authMode === "profile"
                ? "Make your Produla profile yours."
                : authMode === "login"
                  ? "Log in to continue making music together."
                  : "Create your Produla account to get started."}
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

              {authMode === "signup" && (
                <input
                  type="text"
                  placeholder="Your name"
                  value={authName}
                  onChange={(event) => setAuthName(event.target.value)}
                  required
                />
              )}

              {authMode !== "profile" && (
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
                    : authMode === "login"
                      ? "Log in"
                      : "Create account"}
              </button>
            </form>

            {authMode !== "profile" && (
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
