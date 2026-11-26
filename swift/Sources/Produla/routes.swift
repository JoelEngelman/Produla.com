import Vapor

func routes(_ app: Application) throws {
    app.get { req async throws -> Response in
        let html = """
        <!doctype html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta name="theme-color" content="#f7f7f5">
          <meta name="description" content="Produla — a place for artists and producers to find each other.">
          <title>Produla — Make something together</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
          <link rel="stylesheet" href="/styles.css">
          <script type="module" src="/app.js"></script>
        </head>
        <body>
          <header class="topbar">
            <a class="wordmark" href="/" aria-label="Produla home">produla<span>.</span></a>
            <nav class="main-nav" aria-label="Main navigation">
              <a class="nav-link active" href="#discover" data-page="discover">Discover</a>
              <a class="nav-link" href="#artists" data-page="artists">Artists</a>
              <a class="nav-link" href="#requests" data-page="requests">Requests</a>
              <a class="nav-link" href="#releases" data-page="releases">Releases</a>
            </nav>
            <div class="top-actions">
              <button class="glass-icon" id="search-toggle" aria-label="Search">⌕</button>
              <button class="glass-button" id="login-button">Log in</button>
              <button class="primary-button" id="signup-button">Get started <span>↗</span></button>
            </div>
          </header>

          <main>
            <section class="hero" id="discover">
              <div class="hero-copy">
                <div class="eyebrow"><span class="live-dot"></span> THE CREATIVE COMMUNITY</div>
                <h1>Good music<br>starts with <em>connection.</em></h1>
                <p>Find your sound. Find your people. Make something that wouldn't exist without each other.</p>
                <div class="hero-actions">
                  <a class="primary-button large" href="#artists">Find your people <span>↗</span></a>
                  <a class="text-link" href="#requests">Explore song requests <span>→</span></a>
                </div>
                <div class="hero-footnote"><span class="avatar-stack"><i>♪</i><i>♫</i><i>✳</i></span> A home for independent artists and producers.</div>
              </div>
              <div class="hero-art" aria-label="Abstract album artwork">
                <div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div>
                <div class="art-card card-back"><span>PRODULA RADIO</span><b>VOL. 01</b></div>
                <div class="art-card card-front"><div class="art-sun"></div><span>MAKE<br>IT TOGETHER</span><small>AN OPEN CREATIVE SPACE · 2026</small></div>
                <div class="floating-pill"><span class="sound-bars">▂ ▅ ▃ ▇ ▄</span> your next collaboration</div>
              </div>
            </section>

            <section class="content-section" id="artists">
              <div class="section-heading"><div><div class="eyebrow">MEET THE COMMUNITY</div><h2>People making <em>things.</em></h2></div><a class="subtle-link" href="#artists">All artists <span>↗</span></a></div>
              <div class="filter-row"><div class="search-field"><span>⌕</span><input id="artist-search" placeholder="Search artists, genres, sounds…" autocomplete="off"></div><div class="filter-pills"><button class="filter-pill selected" data-filter="all">Everyone</button><button class="filter-pill" data-filter="Singer">Singers</button><button class="filter-pill" data-filter="Producer">Producers</button></div></div>
              <div class="artist-grid" id="artist-grid"><div class="loading-state">Finding your people<span>…</span></div></div>
            </section>

            <section class="request-band" id="requests">
              <div><div class="eyebrow">THE COLLAB BOARD</div><h2>Someone out there<br>is looking for <em>your sound.</em></h2><p>Browse what artists are working on and find a project that feels right.</p></div>
              <a class="glass-button dark-glass" href="#requests-list">Explore requests <span>↗</span></a>
            </section>
            <section class="content-section requests-section" id="requests-list">
              <div class="section-heading"><div><div class="eyebrow">OPEN CALLS</div><h2>Song <em>requests.</em></h2></div><span class="section-note">Fresh ideas, waiting for a collaborator.</span></div>
              <div class="request-grid" id="request-grid"><div class="loading-state">Loading open calls…</div></div>
            </section>

            <section class="content-section releases-section" id="releases">
              <div class="section-heading"><div><div class="eyebrow">OUT IN THE WORLD</div><h2>Recent <em>releases.</em></h2></div><span class="section-note">Made together. Shared everywhere.</span></div>
              <div class="release-grid" id="release-grid"><div class="loading-state">Loading releases…</div></div>
            </section>
          </main>

          <footer><a class="wordmark" href="/">produla<span>.</span></a><p>Make something together.</p><span>© 2026 Produla</span></footer>
          <div class="toast" id="toast" role="status"></div>
        </body>
        </html>
        """
        return Response(status: .ok, headers: ["Content-Type": "text/html; charset=utf-8"], body: .init(string: html))
    }

    app.get("health") { _ in ["status": "ok", "service": "Produla Swift"] }
}
